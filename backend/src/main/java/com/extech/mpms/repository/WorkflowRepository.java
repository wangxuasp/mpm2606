package com.extech.mpms.repository;

import com.extech.mpms.model.workflow.WorkflowModels.TemplateNode;
import com.extech.mpms.model.workflow.WorkflowModels.TemplateSummary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class WorkflowRepository {

    /**
     * 模板类型标签。Teamcenter 的类型对象不在 PWORKSPACEOBJECT 中，
     * 这组映射来自本库 PEPMTASKTEMPLATE 实测样本的标准任务类型名。
     */
    public static final Map<String, String> TYPE_LABELS = Map.ofEntries(
            Map.entry("Rhf5rjoo5gyWHC", "Process"),
            Map.entry("xHa5rjoo5gyWHC", "Do Task"),
            Map.entry("xTQ5rjoo5gyWHC", "Approval Review Task"),
            Map.entry("xPS5rjoo5gyWHC", "Perform Signoff Task"),
            Map.entry("xXQ5rjoo5gyWHC", "Select Signoff Team"),
            Map.entry("xDa5rjoo5gyWHC", "Add Status Task"),
            Map.entry("xLa5rjoo5gyWHC", "Or Task"),
            Map.entry("hZT5rjoo5gyWHC", "Is Review Complete"),
            Map.entry("xHS5rjoo5gyWHC", "Condition Task"),
            Map.entry("xDS5rjoo5gyWHC", "Acknowledge Task"),
            Map.entry("xTY5rjoo5gyWHC", "Route Task"),
            Map.entry("xLS5rjoo5gyWHC", "Notify Task")
    );

    private final JdbcTemplate jdbcTemplate;

    public WorkflowRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public static String typeLabel(String typeId) {
        if (typeId == null) {
            return "";
        }
        return TYPE_LABELS.getOrDefault(typeId, typeId);
    }

    public List<TemplateSummary> listTemplates(int classification) {
        String sql = """
                SELECT pt.puid,
                       COALESCE(pt.ptemplate_name, pt.puid) AS template_name,
                       pt.ptemplate_classification,
                       pt.robject_typeu,
                       (SELECT COUNT(*) FROM pdependency_task_templates d WHERE d.puid = pt.puid) AS child_count
                FROM pepmtasktemplate pt
                WHERE pt.ptemplate_classification = ?
                ORDER BY template_name, pt.puid
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new TemplateSummary(
                rs.getString("puid"),
                rs.getString("template_name"),
                rs.getInt("ptemplate_classification"),
                rs.getString("robject_typeu"),
                typeLabel(rs.getString("robject_typeu")),
                1L,
                rs.getLong("child_count")
        ), classification);
    }

    public Optional<TemplateNode> findTemplate(String puid) {
        String sql = """
                SELECT puid, COALESCE(ptemplate_name, puid) AS template_name,
                       ptemplate_classification, robject_typeu
                FROM pepmtasktemplate WHERE puid = ?
                """;
        List<TemplateNode> rows = jdbcTemplate.query(sql, (rs, rowNum) -> new TemplateNode(
                rs.getString("puid"),
                rs.getString("template_name"),
                rs.getInt("ptemplate_classification"),
                rs.getString("robject_typeu"),
                typeLabel(rs.getString("robject_typeu")),
                0
        ), puid);
        return rows.stream().findFirst();
    }

    /**
     * 查询某个模板的直接子任务。金仓对递归 CTE 的类型推断有问题，
     * 因此改为在 Java 层按层展开，避免数据库兼容性风险。
     */
    public List<NodeRow> findChildren(String parentPuid) {
        String sql = """
                SELECT d.puid AS parent_puid,
                       d.pvalu_0 AS child_puid,
                       d.pseq,
                       COALESCE(c.ptemplate_name, c.puid) AS child_name,
                       c.ptemplate_classification AS child_class,
                       c.robject_typeu AS child_type
                FROM pdependency_task_templates d
                LEFT JOIN pepmtasktemplate c ON c.puid = d.pvalu_0
                WHERE d.puid = ?
                ORDER BY d.pseq
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new NodeRow(
                rs.getString("parent_puid"),
                rs.getString("child_puid"),
                rs.getInt("pseq"),
                rs.getString("child_name"),
                rs.getInt("child_class"),
                rs.getString("child_type")
        ), parentPuid);
    }

    public record NodeRow(
            String parentPuid,
            String childPuid,
            int sequence,
            String childName,
            int childClass,
            String childType
    ) {
    }
}
