package com.extech.mpms.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class WorkspaceWriteRepository {

    private final JdbcTemplate jdbcTemplate;

    public WorkspaceWriteRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<UserRow> findActiveUser(String userPuid) {
        String sql = """
                SELECT puid, puser_id, COALESCE(puser_name, puser_id) AS display_name,
                       COALESCE(pstatus, 0) AS user_status
                FROM ppom_user
                WHERE puid = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new UserRow(
                rs.getString("puid"),
                rs.getString("puser_id"),
                rs.getString("display_name"),
                toInt(rs.getObject("user_status"))
        ), userPuid).stream().findFirst();
    }

    public Optional<TaskRow> findTask(String taskPuid) {
        String sql = """
                SELECT t.puid,
                       COALESCE(tw.pobject_name, t.ptask_name, t.puid) AS task_name,
                       COALESCE(tw.pobject_type, '') AS task_type,
                       t.rparent_processu,
                       t.rresponsible_partyu,
                       COALESCE(t.rparent_tasku, '') AS parent_task_puid,
                       COALESCE(t.pstate_value, 0) AS task_state,
                       COALESCE(t.ptask_result, '') AS task_result,
                       COALESCE(t.rtask_templateu, '') AS task_template_puid,
                       COALESCE(t.pcomments, '') AS comments,
                       COALESCE(jw.pobject_name, '') AS job_name,
                       COALESCE(i.pitem_id, '') AS target_code
                FROM pepmtask t
                LEFT JOIN pworkspaceobject tw ON tw.puid = t.puid
                LEFT JOIN pepmjob j ON j.puid = t.rparent_processu
                LEFT JOIN pworkspaceobject jw ON jw.puid = j.puid
                LEFT JOIN pitem i ON i.pitem_id = SPLIT_PART(COALESCE(jw.pobject_name, ''), '/', 1)
                WHERE t.puid = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new TaskRow(
                rs.getString("puid"),
                rs.getString("task_name"),
                rs.getString("task_type"),
                rs.getString("rparent_processu"),
                rs.getString("rresponsible_partyu"),
                rs.getString("parent_task_puid"),
                toInt(rs.getObject("task_state")),
                rs.getString("task_result"),
                rs.getString("task_template_puid"),
                rs.getString("comments"),
                rs.getString("job_name"),
                rs.getString("target_code")
        ), taskPuid).stream().findFirst();
    }

    public Optional<TaskRow> findNextTask(String currentTaskPuid) {
        return findTaskByRelation("rparent_tasku", currentTaskPuid, 2);
    }

    public Optional<TaskRow> findPreviousTask(String currentTaskPuid) {
        Optional<TaskRow> current = findTask(currentTaskPuid);
        if (current.isEmpty() || current.get().parentTaskPuid().isBlank()) {
            return Optional.empty();
        }
        return findTask(current.get().parentTaskPuid());
    }

    public Optional<TemplateRow> findTemplate(String templatePuid) {
        String sql = """
                SELECT puid,
                       COALESCE(ptemplate_name, puid) AS template_name,
                       ptemplate_classification,
                       robject_typeu
                FROM pepmtasktemplate
                WHERE puid = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new TemplateRow(
                rs.getString("puid"),
                rs.getString("template_name"),
                toInt(rs.getObject("ptemplate_classification")),
                rs.getString("robject_typeu")
        ), templatePuid).stream().findFirst();
    }

    public Optional<TargetRow> findTargetObject(String targetObjectPuid) {
        String sql = """
                SELECT w.puid,
                       COALESCE(i.pitem_id, w.pobject_name, w.puid) AS target_code,
                       COALESCE(w.pobject_name, i.pitem_id, w.puid) AS target_name
                FROM pworkspaceobject w
                LEFT JOIN pitem i ON i.puid = w.puid
                WHERE w.puid = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new TargetRow(
                rs.getString("puid"),
                rs.getString("target_code"),
                rs.getString("target_name")
        ), targetObjectPuid).stream().findFirst();
    }

    public Optional<TargetRevisionRow> findTargetRevision(String targetObjectPuid) {
        String sql = """
                SELECT r.puid, r.pitem_revision_id
                FROM pitemrevision r
                WHERE r.ritems_tagu = ?
                ORDER BY CASE WHEN r.pitem_revision_id = 'A' THEN 0 ELSE 1 END, r.puid
                LIMIT 1
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new TargetRevisionRow(
                rs.getString("puid"),
                rs.getString("pitem_revision_id")
        ), targetObjectPuid).stream().findFirst();
    }

    public Optional<String> findUserMembershipPuid(String userPuid) {
        return jdbcTemplate.query("""
                SELECT gm.puid
                FROM ppom_member m
                JOIN pgroupmember gm ON gm.puid = m.puid
                WHERE m.ruseru = ?
                ORDER BY COALESCE(gm.pdefault_role, 0) DESC, gm.puid
                LIMIT 1
                """, (rs, rowNum) -> rs.getString("puid"), userPuid).stream().findFirst();
    }

    public void updateTask(
            String taskPuid,
            String responsibleUserPuid,
            int state,
            String result,
            String comments,
            LocalDateTime startDate,
            LocalDateTime endDate,
            String performerPuid
    ) {
        jdbcTemplate.update("""
                UPDATE pepmtask
                SET rresponsible_partyu = ?,
                    pstate_value = ?,
                    ptask_result = ?,
                    pcomments = ?,
                    pfnd0startdate = COALESCE(?, pfnd0startdate),
                    pfnd0enddate = ?,
                    rfnd0performeru = COALESCE(?, rfnd0performeru)
                WHERE puid = ?
                """,
                responsibleUserPuid,
                state,
                result,
                comments,
                toTimestamp(startDate),
                toTimestamp(endDate),
                performerPuid,
                taskPuid
        );
        touchApplicationObject(taskPuid);
    }

    public void upsertSignoff(
            String taskPuid,
            String membershipPuid,
            int decision,
            String comments,
            String performerPuid
    ) {
        jdbcTemplate.update("""
                INSERT INTO psignoff
                    (puid, pcomments, rgroup_memberu, pdecision, pdecision_date, rfnd0performeru)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
                ON CONFLICT (puid) DO UPDATE SET
                    pcomments = EXCLUDED.pcomments,
                    rgroup_memberu = EXCLUDED.rgroup_memberu,
                    pdecision = EXCLUDED.pdecision,
                    pdecision_date = CURRENT_TIMESTAMP,
                    rfnd0performeru = EXCLUDED.rfnd0performeru
                """, taskPuid, comments, membershipPuid, decision, performerPuid);
    }

    public void insertWorkspaceObject(
            String puid,
            String name,
            String description,
            String objectType,
            String ownerUserPuid
    ) {
        jdbcTemplate.update("""
                INSERT INTO pworkspaceobject
                    (puid, pobject_name, pobject_desc, pobject_type, pobject_application,
                     vla_677_7, vla_677_10, vla_677_12, vla_677_17, vla_677_19,
                     prevision_limit, prevision_number, pactive_seq)
                VALUES (?, ?, ?, ?, 'Teamcenter',
                        0, 0, 0, 0, 0,
                        0, 0, 1)
                """, puid, name, description, objectType);
        insertApplicationObject(puid, ownerUserPuid);
    }

    public void insertApplicationObject(String puid, String ownerUserPuid) {
        String owner = ownerUserPuid == null || ownerUserPuid.isBlank()
                ? "AAAAAAAAAAAAAA"
                : ownerUserPuid;
        jdbcTemplate.update("""
                INSERT INTO ppom_application_object
                    (puid, rowning_groupu, rowning_groupc, pacl_bits,
                     rlast_mod_useru, rlast_mod_userc, rowning_useru, rowning_userc,
                     pcreation_date, plast_mod_date)
                VALUES (?, 'AAAAAAAAAAAAAA', 0, 0,
                        ?, 0, ?, 0,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, puid, owner, owner);
    }

    public void insertJob(String puid, String templatePuid) {
        jdbcTemplate.update("""
                INSERT INTO pepmjob (puid, rprocess_templateu)
                VALUES (?, ?)
                """, puid, templatePuid);
    }

    public void updateJobRootTask(String jobPuid, String rootTaskPuid) {
        jdbcTemplate.update(
                "UPDATE pepmjob SET rroot_tasku = ? WHERE puid = ?",
                rootTaskPuid,
                jobPuid
        );
        touchApplicationObject(jobPuid);
    }

    public void insertWorkflowJob(
            String jobPuid,
            String templatePuid,
            String targetObjectPuid,
            String targetRevisionPuid,
            String createdBy
    ) {
        jdbcTemplate.update("""
                INSERT INTO local_workflow_job
                    (job_puid, template_puid, target_object_puid, target_revision_puid,
                     process_state, created_by)
                VALUES (?, ?, ?, ?, 'ACTIVE', ?)
                """, jobPuid, templatePuid, targetObjectPuid, targetRevisionPuid, createdBy);
    }

    public Optional<WorkflowJobRow> findWorkflowJob(String jobPuid) {
        String sql = """
                SELECT job_puid, template_puid, target_object_puid, target_revision_puid,
                       root_task_puid, process_state, created_by, created_at, completed_at
                FROM local_workflow_job
                WHERE job_puid = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new WorkflowJobRow(
                rs.getString("job_puid"),
                rs.getString("template_puid"),
                rs.getString("target_object_puid"),
                rs.getString("target_revision_puid"),
                rs.getString("root_task_puid"),
                rs.getString("process_state"),
                rs.getString("created_by"),
                normalize(rs.getTimestamp("created_at")),
                normalize(rs.getTimestamp("completed_at"))
        ), jobPuid).stream().findFirst();
    }

    public void updateWorkflowJobRootTask(String jobPuid, String rootTaskPuid) {
        jdbcTemplate.update(
                "UPDATE local_workflow_job SET root_task_puid = ? WHERE job_puid = ?",
                rootTaskPuid,
                jobPuid
        );
    }

    public void completeWorkflowJob(String jobPuid) {
        jdbcTemplate.update("""
                UPDATE local_workflow_job
                SET process_state = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
                WHERE job_puid = ?
                """, jobPuid);
    }

    private static final String JOB_COLUMNS = """
            j.job_puid, j.template_puid, j.target_object_puid, j.target_revision_puid,
            COALESCE(j.root_task_puid, '') AS root_task_puid,
            j.process_state, j.created_by, j.created_at, j.completed_at,
            COALESCE(tt.ptemplate_name, j.template_puid) AS template_name,
            COALESCE(ow.pobject_name, j.target_object_puid) AS target_name,
            COALESCE(oi.pitem_id, ow.pobject_name, j.target_object_puid) AS target_code,
            COALESCE(uw.pobject_name, cu.puser_name, j.created_by) AS created_by_name,
            (SELECT COUNT(*) FROM pepmtask t WHERE t.rparent_processu = j.job_puid) AS task_count,
            (SELECT COUNT(*) FROM pepmtask t WHERE t.rparent_processu = j.job_puid
                AND COALESCE(t.pstate_value, 0) = 4) AS active_count,
            (SELECT COUNT(*) FROM pepmtask t WHERE t.rparent_processu = j.job_puid
                AND COALESCE(t.pstate_value, 0) = 8) AS completed_count
            FROM local_workflow_job j
            LEFT JOIN pepmtasktemplate tt ON tt.puid = j.template_puid
            LEFT JOIN pworkspaceobject ow ON ow.puid = j.target_object_puid
            LEFT JOIN pitem oi ON oi.puid = j.target_object_puid
            LEFT JOIN pworkspaceobject uw ON uw.puid = j.created_by
            LEFT JOIN ppom_user cu ON cu.puid = j.created_by
            """;

    /** 运行态流程实例列表，按创建时间倒序；state 为空时返回全部。 */
    public List<JobRow> listWorkflowJobs(String state, int limit) {
        StringBuilder sql = new StringBuilder("SELECT ").append(JOB_COLUMNS);
        List<Object> args = new java.util.ArrayList<>();
        if (state != null && !state.isBlank()) {
            sql.append(" WHERE j.process_state = ?");
            args.add(state.trim().toUpperCase(java.util.Locale.ROOT));
        }
        sql.append(" ORDER BY j.created_at DESC, j.job_puid LIMIT ?");
        args.add(limit);
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> mapJobRow(rs), args.toArray());
    }

    public Optional<JobRow> findJobRow(String jobPuid) {
        String sql = "SELECT " + JOB_COLUMNS + " WHERE j.job_puid = ?";
        return jdbcTemplate.query(sql, (rs, rowNum) -> mapJobRow(rs), jobPuid)
                .stream().findFirst();
    }

    /** 某个流程实例下的全部任务节点，按父任务链在服务层排序。 */
    public List<RuntimeTaskRow> listJobTasks(String jobPuid) {
        String sql = """
                SELECT t.puid,
                       COALESCE(tw.pobject_name, t.ptask_name, t.puid) AS task_name,
                       COALESCE(tw.pobject_type, '') AS task_type,
                       COALESCE(t.rparent_tasku, '') AS parent_task_puid,
                       COALESCE(t.pstate_value, 0) AS task_state,
                       COALESCE(t.ptask_result, '') AS task_result,
                       COALESCE(t.pcomments, '') AS comments,
                       COALESCE(t.rtask_templateu, '') AS template_puid,
                       COALESCE(t.rresponsible_partyu, '') AS responsible_puid,
                       COALESCE(cu.puser_name, cu.puser_id, '') AS responsible_name,
                       t.pfnd0startdate,
                       t.pfnd0enddate
                FROM pepmtask t
                LEFT JOIN pworkspaceobject tw ON tw.puid = t.puid
                LEFT JOIN ppom_user cu ON cu.puid = t.rresponsible_partyu
                WHERE t.rparent_processu = ?
                ORDER BY t.puid
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new RuntimeTaskRow(
                rs.getString("puid"),
                rs.getString("task_name"),
                rs.getString("task_type"),
                rs.getString("parent_task_puid"),
                toInt(rs.getObject("task_state")),
                rs.getString("task_result"),
                rs.getString("comments"),
                rs.getString("template_puid"),
                rs.getString("responsible_puid"),
                rs.getString("responsible_name"),
                normalize(rs.getTimestamp("pfnd0startdate")),
                normalize(rs.getTimestamp("pfnd0enddate"))
        ), jobPuid);
    }

    private JobRow mapJobRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        String templateName = rs.getString("template_name");
        String targetCode = rs.getString("target_code");
        return new JobRow(
                rs.getString("job_puid"),
                (targetCode == null ? "" : targetCode) + "-" + (templateName == null ? "" : templateName),
                rs.getString("template_puid"),
                templateName,
                rs.getString("target_object_puid"),
                targetCode,
                rs.getString("target_name"),
                rs.getString("process_state"),
                rs.getString("created_by"),
                rs.getString("created_by_name"),
                normalize(rs.getTimestamp("created_at")),
                normalize(rs.getTimestamp("completed_at")),
                rs.getLong("task_count"),
                rs.getLong("active_count"),
                rs.getLong("completed_count"),
                rs.getString("root_task_puid")
        );
    }

    public void clearJobTaskQueue(String jobPuid) {
        jdbcTemplate.update("""
                DELETE FROM local_task_queue q
                USING pepmtask t
                WHERE q.task_puid = t.puid
                  AND t.rparent_processu = ?
                """, jobPuid);
    }

    public void hideFolderItem(String containerPuid, String childPuid) {
        jdbcTemplate.update("""
                INSERT INTO local_hidden_items (container_puid, child_puid, hidden_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (container_puid, child_puid)
                DO UPDATE SET hidden_at = CURRENT_TIMESTAMP
                """, containerPuid, childPuid);
    }

    public boolean folderItemExists(String containerPuid, String childPuid) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM pcontents
                    WHERE puid = ? AND pvalu_0 = ?
                )
                """, Boolean.class, containerPuid, childPuid);
        return Boolean.TRUE.equals(exists);
    }

    public String insertReleaseStatus(String statusPuid) {
        jdbcTemplate.update("""
                INSERT INTO preleasestatus
                    (puid, pname, vla_389_8, rauthorizationu, rauthorizationc,
                     pstart_serial_number, pend_serial_number, pdate_released)
                VALUES (?, 'TCM Released', 0, 'AAAAAAAAAAAAAA', -1, -1, -1, CURRENT_TIMESTAMP)
                """, statusPuid);
        return statusPuid;
    }

    public void insertReleaseStatusList(String revisionPuid, String statusPuid) {
        jdbcTemplate.update("""
                INSERT INTO prelease_status_list (puid, pseq, pvalu_0, pvalc_0)
                VALUES (
                    ?,
                    (SELECT COALESCE(MAX(pseq), -1) + 1
                     FROM prelease_status_list WHERE puid = ?),
                    ?, 389
                )
                """, revisionPuid, revisionPuid, statusPuid);
        writeModifiedRow("prelease_status_list", revisionPuid);
    }

    public void insertReleaseRelation(String relationPuid, String rootTaskPuid, String statusPuid) {
        jdbcTemplate.update("""
                INSERT INTO pimanrelation
                    (puid, rsecondary_objectu, rsecondary_objectc,
                     rrelation_typeu, rrelation_typec,
                     rprimary_objectu, rprimary_objectc)
                VALUES (?, ?, 389, 'wfa5rjoo5gyWHC', 896, ?, 896)
                """, relationPuid, statusPuid, rootTaskPuid);
    }

    public void insertTask(
            String puid,
            String name,
            String type,
            String templatePuid,
            String jobPuid,
            String responsiblePuid,
            String parentTaskPuid,
            int state,
            String result,
            String comments,
            LocalDateTime startDate,
            LocalDateTime endDate
    ) {
        jdbcTemplate.update("""
                INSERT INTO pepmtask
                    (puid, ptask_name, rtask_templateu, rparent_processu,
                     rresponsible_partyu, rparent_tasku, pstate_value,
                     ptask_result, pcomments, pfnd0startdate, pfnd0enddate,
                     vla_896_8, vla_896_9, vla_896_10, vla_896_13, ppriority)
                VALUES (?, ?, NULLIF(?, ''), ?, ?, NULLIF(?, ''), ?,
                        ?, ?, ?, ?,
                        0, 0, 0, 0, 0)
                """,
                puid,
                name,
                templatePuid,
                jobPuid,
                responsiblePuid,
                parentTaskPuid,
                state,
                result,
                comments,
                toTimestamp(startDate),
                toTimestamp(endDate)
        );
        insertWorkspaceObject(puid, name, comments, type, responsiblePuid);
    }

    public void touchApplicationObject(String puid) {
        jdbcTemplate.update("""
                UPDATE ppom_application_object
                SET plast_mod_date = CURRENT_TIMESTAMP
                WHERE puid = ?
                """, puid);
    }

    public void writeModifiedRow(String tableName, String recordPuid) {
        jdbcTemplate.update("""
                INSERT INTO local_modified_rows (table_name, record_puid, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (table_name, record_puid)
                DO UPDATE SET updated_at = CURRENT_TIMESTAMP
                """, tableName, recordPuid);
    }

    private Optional<TaskRow> findTaskByRelation(
            String relationColumn,
            String parentPuid,
            int state
    ) {
        String sql = """
                SELECT t.puid,
                       COALESCE(tw.pobject_name, t.ptask_name, t.puid) AS task_name,
                       COALESCE(tw.pobject_type, '') AS task_type,
                       t.rparent_processu,
                       t.rresponsible_partyu,
                       COALESCE(t.rparent_tasku, '') AS parent_task_puid,
                       COALESCE(t.pstate_value, 0) AS task_state,
                       COALESCE(t.ptask_result, '') AS task_result,
                       COALESCE(t.rtask_templateu, '') AS task_template_puid,
                       COALESCE(t.pcomments, '') AS comments,
                       '' AS job_name,
                       '' AS target_code
                FROM pepmtask t
                LEFT JOIN pworkspaceobject tw ON tw.puid = t.puid
                WHERE t.%s = ? AND COALESCE(t.pstate_value, 0) = ?
                ORDER BY t.puid
                LIMIT 1
                """.formatted(relationColumn);
        return jdbcTemplate.query(sql, (rs, rowNum) -> new TaskRow(
                rs.getString("puid"),
                rs.getString("task_name"),
                rs.getString("task_type"),
                rs.getString("rparent_processu"),
                rs.getString("rresponsible_partyu"),
                rs.getString("parent_task_puid"),
                toInt(rs.getObject("task_state")),
                rs.getString("task_result"),
                rs.getString("task_template_puid"),
                rs.getString("comments"),
                rs.getString("job_name"),
                rs.getString("target_code")
        ), parentPuid, state).stream().findFirst();
    }

    private static Timestamp toTimestamp(LocalDateTime value) {
        return value == null ? null : Timestamp.valueOf(value);
    }

    private static String normalize(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime().toString();
    }

    private static int toInt(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        return 0;
    }

    public record UserRow(String puid, String userId, String displayName, int status) {
    }

    public record TaskRow(
            String puid,
            String name,
            String type,
            String jobPuid,
            String responsiblePuid,
            String parentTaskPuid,
            int state,
            String result,
            String templatePuid,
            String comments,
            String jobName,
            String targetCode
    ) {
    }

    public record TemplateRow(
            String puid,
            String name,
            int classification,
            String typeId
    ) {
    }

    public record TargetRow(String puid, String code, String name) {
    }

    public record TargetRevisionRow(String puid, String revision) {
    }

    public record WorkflowJobRow(
            String jobPuid,
            String templatePuid,
            String targetObjectPuid,
            String targetRevisionPuid,
            String rootTaskPuid,
            String processState,
            String createdBy,
            String createdAt,
            String completedAt
    ) {
    }

    /** 运行态流程实例行。name 为“目标编号-模板名”的展示名。 */
    public record JobRow(
            String jobPuid,
            String name,
            String templatePuid,
            String templateName,
            String targetObjectPuid,
            String targetCode,
            String targetName,
            String processState,
            String createdBy,
            String createdByName,
            String createdAt,
            String completedAt,
            long taskCount,
            long activeCount,
            long completedCount,
            String rootTaskPuid
    ) {
    }

    /** 运行态任务节点行。 */
    public record RuntimeTaskRow(
            String taskPuid,
            String name,
            String taskType,
            String parentTaskPuid,
            int state,
            String result,
            String comments,
            String templatePuid,
            String responsiblePuid,
            String responsibleName,
            String startDate,
            String endDate
    ) {
    }
}
