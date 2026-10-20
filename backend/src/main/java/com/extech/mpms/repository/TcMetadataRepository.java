package com.extech.mpms.repository;

import com.extech.mpms.model.metadata.TcMetadataModels.ObjectType;
import com.extech.mpms.model.metadata.TcMetadataModels.PropertyDefinition;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

@Repository
public class TcMetadataRepository {

    private static final Pattern SAFE_IDENTIFIER = Pattern.compile("[a-z][a-z0-9_]*");

    private final JdbcTemplate jdbcTemplate;

    public TcMetadataRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ObjectType> listObjectTypes() {
        return jdbcTemplate.query("""
                SELECT class_name, display_name, parent_class_name, source_table
                FROM local_tc_class
                ORDER BY class_name
                """, (rs, rowNum) -> new ObjectType(
                rs.getString("class_name"),
                rs.getString("display_name"),
                rs.getString("parent_class_name"),
                rs.getString("source_table")
        ));
    }

    public Optional<ObjectType> findObjectType(String className) {
        return jdbcTemplate.query("""
                SELECT class_name, display_name, parent_class_name, source_table
                FROM local_tc_class
                WHERE class_name = ?
                """, (rs, rowNum) -> new ObjectType(
                rs.getString("class_name"),
                rs.getString("display_name"),
                rs.getString("parent_class_name"),
                rs.getString("source_table")
        ), className).stream().findFirst();
    }

    public List<PropertyDefinition> listProperties(String className) {
        return jdbcTemplate.query("""
                SELECT p.property_name, p.display_name, p.property_type,
                       p.multi_valued, p.runtime, p.compound, p.editable,
                       s.source_table, s.source_column, s.storage, p.sort_order
                FROM local_tc_property p
                LEFT JOIN local_tc_property_source s ON s.property_id = p.id
                WHERE p.class_name = ?
                ORDER BY p.sort_order, p.property_name
                """, (rs, rowNum) -> new PropertyDefinition(
                rs.getString("property_name"),
                rs.getString("display_name"),
                rs.getString("property_type"),
                rs.getBoolean("multi_valued"),
                rs.getBoolean("runtime"),
                rs.getBoolean("compound"),
                rs.getBoolean("editable"),
                rs.getString("source_table"),
                rs.getString("source_column"),
                rs.getString("storage"),
                rs.getInt("sort_order")
        ), className);
    }

    public Optional<PropertyDefinition> findProperty(String className, String propertyName) {
        return listProperties(className).stream()
                .filter(property -> property.propertyName().equals(propertyName))
                .findFirst();
    }

    public void updateColumn(
            String sourceTable,
            String sourceColumn,
            String puid,
            String value
    ) {
        if (sourceTable == null || !SAFE_IDENTIFIER.matcher(sourceTable).matches()
                || sourceColumn == null || !SAFE_IDENTIFIER.matcher(sourceColumn).matches()) {
            throw new IllegalArgumentException("非法元数据表或列名");
        }
        jdbcTemplate.update(
                "UPDATE public.\"" + sourceTable + "\" SET \"" + sourceColumn
                        + "\" = ? WHERE puid = ?",
                value,
                puid
        );
    }

    public void updateWorkspaceNameDesc(String puid, String name, String description) {
        if (name != null) {
            jdbcTemplate.update(
                    "UPDATE pworkspaceobject SET pobject_name = ? WHERE puid = ?",
                    name,
                    puid
            );
        }
        if (description != null) {
            jdbcTemplate.update(
                    "UPDATE pworkspaceobject SET pobject_desc = ? WHERE puid = ?",
                    description,
                    puid
            );
        }
    }

    public void touchApplicationObject(String puid, String userPuid) {
        jdbcTemplate.update("""
                UPDATE ppom_application_object
                SET plast_mod_date = CURRENT_TIMESTAMP,
                    rlast_mod_useru = COALESCE(?, rlast_mod_useru)
                WHERE puid = ?
                """, userPuid, puid);
    }

    public void recordModifiedRow(String tableName, String recordPuid) {
        jdbcTemplate.update("""
                INSERT INTO local_modified_rows (table_name, record_puid, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (table_name, record_puid)
                DO UPDATE SET updated_at = CURRENT_TIMESTAMP
                """, tableName, recordPuid);
    }

    public Optional<ObjectIdentityRow> findObjectIdentity(String puid) {
        return jdbcTemplate.query("""
                SELECT w.puid,
                       w.pobject_type,
                       w.pobject_name,
                       w.pobject_desc,
                       app.rowning_useru,
                       COALESCE(owner.puser_name, owner.puser_id, '') AS owner_name,
                       COALESCE(grp.pname, '') AS owning_group_name,
                       COALESCE(moduser.puser_name, moduser.puser_id, '') AS last_mod_user_name,
                       COALESCE(i.pitem_id, ir_item.pitem_id, '') AS item_id,
                       COALESCE(ir.pitem_revision_id, '') AS revision_id,
                       app.pcreation_date,
                       app.plast_mod_date
                FROM pworkspaceobject w
                LEFT JOIN ppom_application_object app ON app.puid = w.puid
                LEFT JOIN ppom_user owner ON owner.puid = app.rowning_useru
                LEFT JOIN ppom_group grp ON grp.puid = app.rowning_groupu
                LEFT JOIN ppom_user moduser ON moduser.puid = app.rlast_mod_useru
                LEFT JOIN pitem i ON i.puid = w.puid
                LEFT JOIN pitemrevision ir ON ir.puid = w.puid
                LEFT JOIN pitem ir_item ON ir_item.puid = ir.ritems_tagu
                WHERE w.puid = ?
                """, (rs, rowNum) -> new ObjectIdentityRow(
                rs.getString("puid"),
                rs.getString("pobject_type"),
                rs.getString("pobject_name"),
                rs.getString("pobject_desc"),
                rs.getString("rowning_useru"),
                rs.getString("owner_name"),
                rs.getString("owning_group_name"),
                rs.getString("last_mod_user_name"),
                rs.getString("item_id"),
                rs.getString("revision_id"),
                normalize(rs.getTimestamp("pcreation_date")),
                normalize(rs.getTimestamp("plast_mod_date"))
        ), puid).stream().findFirst();
    }

    public Optional<Map<String, Object>> findSourceRow(String sourceTable, String puid) {
        if (sourceTable == null || !SAFE_IDENTIFIER.matcher(sourceTable).matches()) {
            return Optional.empty();
        }
        try {
            return Optional.of(jdbcTemplate.queryForMap(
                    "SELECT * FROM public.\"" + sourceTable + "\" WHERE puid = ?",
                    puid
            ));
        } catch (EmptyResultDataAccessException ignored) {
            return Optional.empty();
        }
    }

    public boolean tableExists(String tableName) {
        if (tableName == null || !SAFE_IDENTIFIER.matcher(tableName).matches()) {
            return false;
        }
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = ?
                )
                """, Boolean.class, tableName);
        return Boolean.TRUE.equals(exists);
    }

    private static String normalize(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime().toString();
    }

    public record ObjectIdentityRow(
            String puid,
            String objectType,
            String objectName,
            String objectDesc,
            String ownerPuid,
            String ownerName,
            String owningGroupName,
            String lastModUserName,
            String itemId,
            String revisionId,
            String createdAt,
            String modifiedAt
    ) {
    }
}
