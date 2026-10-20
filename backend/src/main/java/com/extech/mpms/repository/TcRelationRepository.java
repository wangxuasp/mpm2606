package com.extech.mpms.repository;

import com.extech.mpms.model.metadata.TcRelationModels.RelationItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Repository
public class TcRelationRepository {

    private final JdbcTemplate jdbcTemplate;

    public TcRelationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<RelationItem> listRelations(String puid, String direction) {
        List<RelationItem> result = new ArrayList<>();
        if ("out".equals(direction) || "both".equals(direction)) {
            result.addAll(listImanOut(puid));
            result.addAll(listOccurrenceOut(puid));
            result.addAll(listFolderOut(puid));
            result.addAll(listWorkflowOut(puid));
        }
        if ("in".equals(direction) || "both".equals(direction)) {
            result.addAll(listImanIn(puid));
            result.addAll(listOccurrenceIn(puid));
            result.addAll(listFolderIn(puid));
        }
        return result;
    }

    public List<ObjectSummaryRow> summarize(List<String> puids) {
        if (puids == null || puids.isEmpty()) {
            return List.of();
        }
        String placeholders = puids.stream().map(ignored -> "?").collect(Collectors.joining(","));
        String sql = """
                SELECT w.puid,
                       COALESCE(w.pobject_type, '') AS object_type,
                       COALESCE(owner.puser_name, owner.puser_id, '') AS owner_name,
                       COALESCE(latest_rev.pitem_revision_id, '') AS revision,
                       EXISTS (
                           SELECT 1
                           FROM prelease_status_list l
                           JOIN preleasestatus s ON s.puid = l.pvalu_0
                           WHERE l.puid = COALESCE(latest_rev.puid, w.puid)
                             AND s.pname = 'TCM Released'
                       ) AS released
                FROM pworkspaceobject w
                LEFT JOIN ppom_application_object app ON app.puid = w.puid
                LEFT JOIN ppom_user owner ON owner.puid = app.rowning_useru
                LEFT JOIN pitemrevision latest_rev ON latest_rev.puid = (
                    SELECT pr.puid
                    FROM pitemrevision pr
                    WHERE pr.puid = w.puid
                       OR pr.ritems_tagu = w.puid
                    ORDER BY CASE WHEN pr.puid = w.puid THEN 0 ELSE 1 END,
                             pr.puid DESC
                    LIMIT 1
                )
                WHERE w.puid IN (%s)
                """.formatted(placeholders);
        return jdbcTemplate.query(sql, (rs, rowNum) -> new ObjectSummaryRow(
                rs.getString("puid"),
                rs.getString("object_type"),
                rs.getString("owner_name"),
                rs.getString("revision"),
                rs.getBoolean("released")
        ), puids.toArray());
    }

    private List<RelationItem> listImanOut(String puid) {
        return jdbcTemplate.query("""
                SELECT r.puid,
                       r.rrelation_typeu,
                       COALESCE(t.ptype_name, '') AS relation_type_name,
                       w.puid AS target_puid,
                       COALESCE(w.pobject_name, w.puid) AS target_name,
                       COALESCE(w.pobject_type, '') AS target_type
                FROM pimanrelation r
                LEFT JOIN pimantype t ON t.puid = r.rrelation_typeu
                LEFT JOIN pworkspaceobject w ON w.puid = r.rsecondary_objectu
                WHERE r.rprimary_objectu = ?
                ORDER BY r.puid
                """, (rs, rowNum) -> new RelationItem(
                rs.getString("puid"),
                rs.getString("rrelation_typeu"),
                rs.getString("relation_type_name"),
                "out",
                puid,
                null,
                null,
                rs.getString("target_puid"),
                rs.getString("target_name"),
                rs.getString("target_type"),
                "PIMANRELATION",
                null,
                null
        ), puid);
    }

    private List<RelationItem> listImanIn(String puid) {
        return jdbcTemplate.query("""
                SELECT r.puid,
                       r.rrelation_typeu,
                       COALESCE(t.ptype_name, '') AS relation_type_name,
                       w.puid AS source_puid,
                       COALESCE(w.pobject_name, w.puid) AS source_name,
                       COALESCE(w.pobject_type, '') AS source_type
                FROM pimanrelation r
                LEFT JOIN pimantype t ON t.puid = r.rrelation_typeu
                LEFT JOIN pworkspaceobject w ON w.puid = r.rprimary_objectu
                WHERE r.rsecondary_objectu = ?
                ORDER BY r.puid
                """, (rs, rowNum) -> new RelationItem(
                rs.getString("puid"),
                rs.getString("rrelation_typeu"),
                rs.getString("relation_type_name"),
                "in",
                rs.getString("source_puid"),
                rs.getString("source_name"),
                rs.getString("source_type"),
                puid,
                null,
                null,
                "PIMANRELATION",
                null,
                null
        ), puid);
    }

    private List<RelationItem> listOccurrenceOut(String puid) {
        return jdbcTemplate.query("""
                SELECT o.puid,
                       o.pseq_no,
                       o.pqty_value,
                       parent.puid AS parent_puid,
                       COALESCE(parent_w.pobject_name, parent.pitem_id, parent.puid) AS parent_name,
                       COALESCE(parent_w.pobject_type, '') AS parent_type
                FROM ppsoccurrence o
                JOIN ppsbomviewrevision bvr ON bvr.puid = o.rparent_bvru
                JOIN ppsbomview bv ON bv.puid = bvr.rbom_viewu
                JOIN pitem parent ON parent.puid = bv.rparent_itemu
                LEFT JOIN pworkspaceobject parent_w ON parent_w.puid = parent.puid
                WHERE o.rchild_itemu = ?
                ORDER BY o.puid
                """, (rs, rowNum) -> new RelationItem(
                rs.getString("puid"),
                "PPSOCCURRENCE",
                "BOM/BOP包含",
                "out",
                puid,
                null,
                null,
                rs.getString("parent_puid"),
                rs.getString("parent_name"),
                rs.getString("parent_type"),
                "PPSOCCURRENCE",
                rs.getString("pseq_no"),
                decimal(rs.getObject("pqty_value"))
        ), puid);
    }

    private List<RelationItem> listOccurrenceIn(String puid) {
        return jdbcTemplate.query("""
                SELECT o.puid,
                       o.pseq_no,
                       o.pqty_value,
                       child.puid AS child_puid,
                       COALESCE(child_w.pobject_name, child.pitem_id, child.puid) AS child_name,
                       COALESCE(child_w.pobject_type, '') AS child_type
                FROM ppsoccurrence o
                JOIN ppsbomviewrevision bvr ON bvr.puid = o.rparent_bvru
                JOIN ppsbomview bv ON bv.puid = bvr.rbom_viewu
                JOIN pitem parent ON parent.puid = bv.rparent_itemu
                JOIN pitem child ON child.puid = o.rchild_itemu
                LEFT JOIN pworkspaceobject child_w ON child_w.puid = child.puid
                WHERE parent.puid = ?
                ORDER BY o.pseq_no, o.puid
                """, (rs, rowNum) -> new RelationItem(
                rs.getString("puid"),
                "PPSOCCURRENCE",
                "BOM/BOP包含",
                "in",
                rs.getString("child_puid"),
                rs.getString("child_name"),
                rs.getString("child_type"),
                puid,
                null,
                null,
                "PPSOCCURRENCE",
                rs.getString("pseq_no"),
                decimal(rs.getObject("pqty_value"))
        ), puid);
    }

    private List<RelationItem> listFolderOut(String puid) {
        return jdbcTemplate.query("""
                SELECT c.puid,
                       c.pseq,
                       w.puid AS container_puid,
                       COALESCE(w.pobject_name, w.puid) AS container_name,
                       COALESCE(w.pobject_type, '') AS container_type
                FROM pcontents c
                JOIN pworkspaceobject w ON w.puid = c.puid
                WHERE c.pvalu_0 = ?
                ORDER BY c.puid, c.pseq
                """, (rs, rowNum) -> new RelationItem(
                rs.getString("puid"),
                "PCONTENTS",
                "所在文件夹",
                "out",
                puid,
                null,
                null,
                rs.getString("container_puid"),
                rs.getString("container_name"),
                rs.getString("container_type"),
                "PCONTENTS",
                rs.getString("pseq"),
                null
        ), puid);
    }

    private List<RelationItem> listFolderIn(String puid) {
        return jdbcTemplate.query("""
                SELECT c.puid,
                       c.pseq,
                       w.puid AS child_puid,
                       COALESCE(w.pobject_name, w.puid) AS child_name,
                       COALESCE(w.pobject_type, '') AS child_type
                FROM pcontents c
                JOIN pworkspaceobject w ON w.puid = c.pvalu_0
                WHERE c.puid = ?
                ORDER BY c.pseq
                """, (rs, rowNum) -> new RelationItem(
                rs.getString("puid"),
                "PCONTENTS",
                "文件夹内容",
                "in",
                rs.getString("child_puid"),
                rs.getString("child_name"),
                rs.getString("child_type"),
                puid,
                null,
                null,
                "PCONTENTS",
                rs.getString("pseq"),
                null
        ), puid);
    }

    private List<RelationItem> listWorkflowOut(String puid) {
        return jdbcTemplate.query("""
                SELECT j.job_puid,
                       j.process_state,
                       w.pobject_name AS job_name
                FROM local_workflow_job j
                LEFT JOIN pworkspaceobject w ON w.puid = j.job_puid
                WHERE j.target_object_puid = ?
                   OR j.target_revision_puid = ?
                ORDER BY j.created_at DESC
                """, (rs, rowNum) -> new RelationItem(
                rs.getString("job_puid"),
                "LOCAL_WORKFLOW_JOB",
                "流程实例",
                "out",
                puid,
                null,
                null,
                rs.getString("job_puid"),
                rs.getString("job_name") == null ? rs.getString("job_puid") : rs.getString("job_name"),
                rs.getString("process_state"),
                "LOCAL_WORKFLOW_JOB",
                null,
                null
        ), puid, puid);
    }

    private static String decimal(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal.stripTrailingZeros().toPlainString();
        }
        return String.valueOf(value);
    }

    public record ObjectSummaryRow(
            String puid,
            String objectType,
            String ownerName,
            String revision,
            boolean released
    ) {
    }
}
