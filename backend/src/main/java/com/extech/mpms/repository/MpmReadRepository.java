package com.extech.mpms.repository;

import com.extech.mpms.model.mpm.MpmModels.Attachment;
import com.extech.mpms.model.mpm.MpmModels.CatalogEntry;
import com.extech.mpms.model.mpm.MpmModels.ObjectSummary;
import com.extech.mpms.model.mpm.MpmModels.Relation;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class MpmReadRepository {

    private static final String LATEST_REVISION_JOIN = """
            LEFT JOIN pitemrevision r ON r.puid = (
                SELECT pr.puid
                FROM pitemrevision pr
                JOIN pworkspaceobject prw ON prw.puid = pr.puid
                WHERE pr.ritems_tagu = i.puid
                ORDER BY prw.prevision_number DESC NULLS LAST, pr.puid DESC
                LIMIT 1
            )
            LEFT JOIN pworkspaceobject rw ON rw.puid = r.puid
            """;

    private static final String OBJECT_SUMMARY_COLUMNS = """
            i.puid,
            COALESCE(i.pitem_id, w.pobject_name, '') AS code,
            COALESCE(w.pobject_name, i.pitem_id, '') AS name,
            COALESCE(w.pobject_desc, '') AS description,
            COALESCE(w.pobject_type, '') AS object_type,
            COALESCE(r.pitem_revision_id, rw.pfnd0revisionid, '') AS revision,
            COALESCE(r.puid, '') AS revision_puid,
            COALESCE(app.rowning_useru, '') AS owner,
            COALESCE(u.pos_username, '') AS owner_name,
            app.pcreation_date AS created_at,
            app.plast_mod_date AS modified_at
            """;

    private final JdbcTemplate jdbcTemplate;

    public MpmReadRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<String> findItemPuidForObject(String puid) {
        String sql = """
                SELECT item_puid
                FROM (
                    SELECT puid AS item_puid FROM pitem WHERE puid = ?
                    UNION ALL
                    SELECT ritems_tagu AS item_puid FROM pitemrevision WHERE puid = ?
                ) resolved
                WHERE item_puid IS NOT NULL
                LIMIT 1
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> rs.getString("item_puid"), puid, puid)
                .stream()
                .findFirst();
    }

    public Optional<ObjectSummary> findItemSummary(String itemPuid) {
        String sql = "SELECT " + OBJECT_SUMMARY_COLUMNS + """
                FROM pitem i
                JOIN pworkspaceobject w ON w.puid = i.puid
                """ + LATEST_REVISION_JOIN + """
                LEFT JOIN ppom_application_object app ON app.puid = i.puid
                LEFT JOIN puser u ON u.puid = app.rowning_useru
                WHERE i.puid = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> mapSummary(rs), itemPuid)
                .stream()
                .findFirst();
    }

    public List<ObjectSummary> listItems(
            String keyword,
            String objectType,
            int page,
            int size
    ) {
        List<Object> arguments = new ArrayList<>();
        String where = buildItemFilter(keyword, objectType, arguments);
        String sql = "SELECT " + OBJECT_SUMMARY_COLUMNS + """
                FROM pitem i
                JOIN pworkspaceobject w ON w.puid = i.puid
                """ + LATEST_REVISION_JOIN + """
                LEFT JOIN ppom_application_object app ON app.puid = i.puid
                LEFT JOIN puser u ON u.puid = app.rowning_useru
                """ + where + """
                ORDER BY code ASC, i.puid ASC
                LIMIT ? OFFSET ?
                """;
        arguments.add(size);
        arguments.add((long) page * size);
        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> mapSummary(rs),
                arguments.toArray()
        );
    }

    public long countItems(String keyword, String objectType) {
        List<Object> arguments = new ArrayList<>();
        String where = buildItemFilter(keyword, objectType, arguments);
        String sql = """
                SELECT COUNT(*)
                FROM pitem i
                JOIN pworkspaceobject w ON w.puid = i.puid
                """ + where;
        Long count = jdbcTemplate.queryForObject(sql, Long.class, arguments.toArray());
        return count == null ? 0L : count;
    }

    public List<String> listObjectTypes() {
        return jdbcTemplate.queryForList("""
                SELECT DISTINCT w.pobject_type
                FROM pitem i
                JOIN pworkspaceobject w ON w.puid = i.puid
                WHERE w.pobject_type IS NOT NULL AND w.pobject_type <> ''
                ORDER BY w.pobject_type
                """, String.class);
    }

    public List<CatalogEntry> findCatalogEntries() {
        String sql = "SELECT " + OBJECT_SUMMARY_COLUMNS + """
                , COUNT(DISTINCT o.puid) AS child_count
                FROM pitem i
                JOIN pworkspaceobject w ON w.puid = i.puid
                JOIN ppsbomview b ON b.rparent_itemu = i.puid
                LEFT JOIN ppsbomviewrevision br ON br.rbom_viewu = b.puid
                LEFT JOIN ppsoccurrence o ON o.rparent_bvru = br.puid
                """ + LATEST_REVISION_JOIN + """
                LEFT JOIN ppom_application_object app ON app.puid = i.puid
                LEFT JOIN puser u ON u.puid = app.rowning_useru
                GROUP BY i.puid, i.pitem_id, w.pobject_name, w.pobject_desc, w.pobject_type,
                         r.pitem_revision_id, rw.pfnd0revisionid, r.puid,
                         app.rowning_useru, u.pos_username, app.pcreation_date, app.plast_mod_date
                ORDER BY child_count DESC, code ASC
                """;
        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new CatalogEntry(
                        mapSummary(rs),
                        classify(rs.getString("object_type")),
                        rs.getLong("child_count")
                )
        );
    }

    public List<OccurrenceRow> findOccurrences() {
        String sql = """
                SELECT b.rparent_itemu AS parent_item_puid,
                       o.puid AS occurrence_puid,
                       o.pseq_no,
                       o.pqty_value,
                       o.rchild_itemu AS child_puid,
                       COALESCE(ci.puid, ir.ritems_tagu, o.rchild_itemu) AS child_item_puid,
                       CASE WHEN ir.puid IS NOT NULL THEN o.rchild_itemu ELSE cr.puid END AS child_revision_puid,
                       COALESCE(cw.pobject_type, '') AS child_object_type,
                       COALESCE(ci.pitem_id, ir_item.pitem_id, cw.pobject_name, o.rchild_itemu) AS child_code,
                       COALESCE(cw.pobject_name, ci.pitem_id, ir_item.pitem_id, o.rchild_itemu) AS child_name,
                       COALESCE(cw.pfnd0revisionid, cr.pitem_revision_id, '') AS child_revision
                FROM ppsoccurrence o
                JOIN ppsbomviewrevision br ON br.puid = o.rparent_bvru
                JOIN ppsbomview b ON b.puid = br.rbom_viewu
                LEFT JOIN pworkspaceobject cw ON cw.puid = o.rchild_itemu
                LEFT JOIN pitem ci ON ci.puid = o.rchild_itemu
                LEFT JOIN pitemrevision ir ON ir.puid = o.rchild_itemu
                LEFT JOIN pitem ir_item ON ir_item.puid = ir.ritems_tagu
                LEFT JOIN pitemrevision cr ON cr.puid = (
                    SELECT pr.puid
                    FROM pitemrevision pr
                    JOIN pworkspaceobject prw ON prw.puid = pr.puid
                    WHERE pr.ritems_tagu = COALESCE(ci.puid, ir.ritems_tagu, o.rchild_itemu)
                    ORDER BY prw.prevision_number DESC NULLS LAST, pr.puid DESC
                    LIMIT 1
                )
                ORDER BY parent_item_puid, o.pseq_no NULLS LAST, o.puid
                """;
        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new OccurrenceRow(
                        rs.getString("parent_item_puid"),
                        rs.getString("occurrence_puid"),
                        rs.getString("child_puid"),
                        rs.getString("child_item_puid"),
                        rs.getString("child_code"),
                        rs.getString("child_name"),
                        rs.getString("child_object_type"),
                        rs.getString("child_revision"),
                        rs.getString("child_revision_puid"),
                        rs.getBigDecimal("pqty_value"),
                        rs.getString("pseq_no")
                )
        );
    }

    public List<Relation> findRelations(String itemPuid, String revisionPuid) {
        String revision = revisionPuid == null || revisionPuid.isBlank() ? itemPuid : revisionPuid;
        String sql = """
                SELECT rel.puid,
                       COALESCE(rt.ptype_name, '') AS relation_type,
                       rel.rprimary_objectu AS primary_puid,
                       COALESCE(pi.pitem_id, pw.pobject_name, rel.rprimary_objectu, '') AS primary_code,
                       COALESCE(pw.pobject_name, pi.pitem_id, '') AS primary_name,
                       COALESCE(pw.pobject_type, '') AS primary_type,
                       rel.rsecondary_objectu AS secondary_puid,
                       COALESCE(si.pitem_id, sw.pobject_name, rel.rsecondary_objectu, '') AS secondary_code,
                       COALESCE(sw.pobject_name, si.pitem_id, '') AS secondary_name,
                       COALESCE(sw.pobject_type, '') AS secondary_type
                FROM pimanrelation rel
                LEFT JOIN pimantype rt ON rt.puid = rel.rrelation_typeu
                LEFT JOIN pworkspaceobject pw ON pw.puid = rel.rprimary_objectu
                LEFT JOIN pitem pi ON pi.puid = rel.rprimary_objectu
                LEFT JOIN pworkspaceobject sw ON sw.puid = rel.rsecondary_objectu
                LEFT JOIN pitem si ON si.puid = rel.rsecondary_objectu
                WHERE rel.rprimary_objectu IN (?, ?)
                   OR rel.rsecondary_objectu IN (?, ?)
                ORDER BY relation_type, rel.puid
                LIMIT 200
                """;
        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    String primaryPuid = rs.getString("primary_puid");
                    String secondaryPuid = rs.getString("secondary_puid");
                    boolean primaryMatches = itemPuid.equals(primaryPuid) || revision.equals(primaryPuid);
                    return new Relation(
                            rs.getString("puid"),
                            rs.getString("relation_type"),
                            primaryMatches ? "OUT" : "IN",
                            primaryMatches ? secondaryPuid : primaryPuid,
                            primaryMatches ? rs.getString("secondary_code") : rs.getString("primary_code"),
                            primaryMatches ? rs.getString("secondary_name") : rs.getString("primary_name"),
                            primaryMatches ? rs.getString("secondary_type") : rs.getString("primary_type")
                    );
                },
                itemPuid,
                revision,
                itemPuid,
                revision
        );
    }

    public List<Attachment> findForms(Collection<String> puids) {
        if (puids.isEmpty()) {
            return List.of();
        }
        String placeholders = placeholders(puids.size());
        String sql = """
                SELECT p.puid,
                       COALESCE(w.pobject_name, p.pform_file, p.puid) AS name,
                       COALESCE(w.pobject_type, 'Form') AS object_type,
                       p.pform_file
                FROM pform p
                LEFT JOIN pworkspaceobject w ON w.puid = p.puid
                WHERE p.puid IN (%s)
                ORDER BY name
                """.formatted(placeholders);
        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new Attachment(
                        rs.getString("puid"),
                        rs.getString("name"),
                        rs.getString("object_type"),
                        rs.getString("pform_file"),
                        "Form",
                        ""
                ),
                puids.toArray()
        );
    }

    public List<Attachment> findDatasets(Collection<String> puids) {
        if (puids.isEmpty()) {
            return List.of();
        }
        String placeholders = placeholders(puids.size());
        String sql = """
                SELECT d.puid,
                       COALESCE(w.pobject_name, d.puid) AS name,
                       COALESCE(w.pobject_type, 'Dataset') AS object_type,
                       d.plocal_path,
                       d.pformat_used,
                       COALESCE(dt.pobject_name, '') AS dataset_type_name
                FROM pdataset d
                LEFT JOIN pworkspaceobject w ON w.puid = d.puid
                LEFT JOIN pworkspaceobject dt ON dt.puid = d.rdataset_typeu
                WHERE d.puid IN (%s)
                ORDER BY name
                """.formatted(placeholders);
        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new Attachment(
                        rs.getString("puid"),
                        rs.getString("name"),
                        rs.getString("object_type"),
                        rs.getString("plocal_path"),
                        rs.getString("pformat_used"),
                        rs.getString("dataset_type_name")
                ),
                puids.toArray()
        );
    }

    private String buildItemFilter(
            String keyword,
            String objectType,
            List<Object> arguments
    ) {
        List<String> conditions = new ArrayList<>();
        if (keyword != null && !keyword.isBlank()) {
            conditions.add("""
                    (LOWER(CAST(i.pitem_id AS VARCHAR)) LIKE LOWER(?)
                     OR LOWER(CAST(w.pobject_name AS VARCHAR)) LIKE LOWER(?)
                     OR LOWER(CAST(w.pobject_type AS VARCHAR)) LIKE LOWER(?))
                    """);
            String pattern = "%" + keyword.trim() + "%";
            arguments.add(pattern);
            arguments.add(pattern);
            arguments.add(pattern);
        }
        if (objectType != null && !objectType.isBlank()) {
            conditions.add("w.pobject_type = ?");
            arguments.add(objectType.trim());
        }
        if (conditions.isEmpty()) {
            return "";
        }
        return " WHERE " + String.join(" AND ", conditions);
    }

    private ObjectSummary mapSummary(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ObjectSummary(
                rs.getString("puid"),
                rs.getString("code"),
                rs.getString("name"),
                rs.getString("description"),
                rs.getString("object_type"),
                rs.getString("revision"),
                rs.getString("revision_puid"),
                rs.getString("owner"),
                rs.getString("owner_name"),
                normalizeTimestamp(rs.getTimestamp("created_at")),
                normalizeTimestamp(rs.getTimestamp("modified_at"))
        );
    }

    private String classify(String objectType) {
        if (objectType == null) {
            return "object";
        }
        if ("MEProcess".equals(objectType) || objectType.startsWith("MEProcess")) {
            return "process";
        }
        if ("MEOP".equals(objectType) || objectType.startsWith("MEOP")) {
            return "operation";
        }
        return "product";
    }

    private String placeholders(int count) {
        return String.join(", ", java.util.Collections.nCopies(count, "?"));
    }

    private String normalizeTimestamp(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime().toString();
    }

    public record OccurrenceRow(
            String parentItemPuid,
            String occurrencePuid,
            String childPuid,
            String childItemPuid,
            String childCode,
            String childName,
            String childObjectType,
            String childRevision,
            String childRevisionPuid,
            BigDecimal quantity,
            String sequenceNo
    ) {
    }
}
