package com.extech.mpms.repository;

import com.extech.mpms.model.workspace.WorkspaceModels.FolderItem;
import com.extech.mpms.model.workspace.WorkspaceModels.MailItem;
import com.extech.mpms.model.workspace.WorkspaceModels.WorkspaceProfile;
import com.extech.mpms.model.workspace.WorkspaceModels.WorklistTask;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public class WorkspaceRepository {

    private final JdbcTemplate jdbcTemplate;

    public WorkspaceRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<WorkspaceProfile> findProfile(String userPuid) {
        String sql = """
                SELECT pu.puid,
                       pu.puser_id,
                       COALESCE(pu.puser_name, pu.puser_id) AS display_name,
                       per.puser_name AS person_name,
                       per.ppa6 AS department,
                       per.ppa9 AS email
                FROM ppom_user pu
                JOIN puser u ON u.puid = pu.puid
                LEFT JOIN pperson per ON per.puid = u.rpersonu
                WHERE pu.puid = ?
                """;
        List<WorkspaceProfile> rows = jdbcTemplate.query(sql, (rs, rowNum) -> new WorkspaceProfile(
                rs.getString("puid"),
                rs.getString("puser_id"),
                rs.getString("display_name"),
                rs.getString("person_name"),
                rs.getString("department"),
                rs.getString("email"),
                List.of(),
                List.of()
        ), userPuid);
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        WorkspaceProfile base = rows.get(0);
        List<String> groups = findGroups(userPuid);
        List<String> roles = findRoles(userPuid);
        return Optional.of(new WorkspaceProfile(
                base.puid(), base.userId(), base.displayName(), base.personName(),
                base.department(), base.email(), groups, roles
        ));
    }

    public List<String> findGroups(String userPuid) {
        // 组名优先取 pdescription，其次取 porganization_name；
        // 两者都为空时不回退到 PUID，避免界面上出现无意义的乱码串。
        return jdbcTemplate.queryForList("""
                SELECT DISTINCT COALESCE(g.pdescription, g.porganization_name) AS group_name
                FROM ppom_member m
                LEFT JOIN pgroup g ON g.puid = m.rgroupu
                WHERE m.ruseru = ?
                  AND COALESCE(g.pdescription, g.porganization_name) IS NOT NULL
                ORDER BY group_name
                """, String.class, userPuid);
    }

    public List<String> findRoles(String userPuid) {
        // 金仓在 Oracle 兼容语义下 '' 等价于 NULL，不能写 <> ''，否则条件恒不成立
        return jdbcTemplate.queryForList("""
                SELECT DISTINCT r.prole_name
                FROM ppom_member m
                JOIN pgroupmember gm ON gm.puid = m.puid
                JOIN prole r ON r.puid = gm.rroleu
                WHERE m.ruseru = ? AND r.prole_name IS NOT NULL
                ORDER BY r.prole_name
                """, String.class, userPuid);
    }

    /**
     * 返回用户三个根容器的 PUID。前端无法传入，只能由后端按当前登录用户读取。
     */
    public Optional<ContainerPuids> findContainers(String userPuid) {
        String sql = "SELECT rhome_folderu, rnewstuff_folderu, rmailboxu FROM puser WHERE puid = ?";
        List<ContainerPuids> rows = jdbcTemplate.query(sql, (rs, rowNum) -> new ContainerPuids(
                rs.getString("rhome_folderu"),
                rs.getString("rnewstuff_folderu"),
                rs.getString("rmailboxu")
        ), userPuid);
        return rows.stream().findFirst();
    }

    public List<FolderItem> listFolderContents(String containerPuid) {
        String sql = """
                SELECT c.pseq,
                       c.pvalu_0 AS child_puid,
                       COALESCE(w.pobject_name, i.pitem_id, c.pvalu_0) AS name,
                       COALESCE(w.pobject_type, '') AS object_type,
                       i.pitem_id,
                       COALESCE(ir.pitem_revision_id, '') AS revision,
                       COALESCE(owner.puser_name, '') AS owner_name,
                       app.plast_mod_date
                FROM pcontents c
                LEFT JOIN pworkspaceobject w ON w.puid = c.pvalu_0
                LEFT JOIN pitem i ON i.puid = c.pvalu_0
                LEFT JOIN pitemrevision ir ON ir.puid = c.pvalu_0
                LEFT JOIN ppom_application_object app ON app.puid = c.pvalu_0
                LEFT JOIN ppom_user owner ON owner.puid = app.rowning_useru
                WHERE c.puid = ?
                  AND NOT EXISTS (
                      SELECT 1
                      FROM local_hidden_items h
                      WHERE h.container_puid = c.puid
                        AND h.child_puid = c.pvalu_0
                  )
                ORDER BY c.pseq
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new FolderItem(
                rs.getInt("pseq"),
                rs.getString("child_puid"),
                rs.getString("name"),
                rs.getString("object_type"),
                rs.getString("pitem_id"),
                rs.getString("revision"),
                rs.getString("owner_name"),
                normalize(rs.getTimestamp("plast_mod_date")),
                isFolderType(rs.getString("object_type"))
        ), containerPuid);
    }

    public List<MailItem> listMailbox(String mailboxPuid) {
        String sql = """
                SELECT c.pseq,
                       env.puid AS envelope_puid,
                       COALESCE(w.pobject_name, '(无主题)') AS subject,
                       COALESCE(w.pobject_desc, '') AS body,
                       env.penvelopereadflag,
                       env.psent_date,
                       COALESCE(sender.puser_name, '') AS sender_name
                FROM pcontents c
                JOIN penvelope env ON env.puid = c.pvalu_0
                LEFT JOIN pworkspaceobject w ON w.puid = env.puid
                LEFT JOIN ppom_application_object app ON app.puid = env.puid
                LEFT JOIN ppom_user sender ON sender.puid = app.rowning_useru
                WHERE c.puid = ?
                ORDER BY c.pseq
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new MailItem(
                rs.getInt("pseq"),
                rs.getString("envelope_puid"),
                rs.getString("subject"),
                rs.getString("body"),
                readFlag(rs.getObject("penvelopereadflag")),
                normalize(rs.getTimestamp("psent_date")),
                rs.getString("sender_name")
        ), mailboxPuid);
    }

    /** 当前用户的任务收件箱（TaskInbox）。工作列表的根节点。 */
    public Optional<TaskInboxRow> findTaskInbox(String userPuid) {
        // PTASKINBOX 同时存放收件箱和它下面的分类文件夹，需要用对象类型区分；
        // 归属人列名是 ROWNERU，不是 roweru。
        String sql = """
                SELECT t.puid,
                       COALESCE(w.pobject_name, 'Inbox') AS inbox_name,
                       COALESCE(t.pnew_tasks_count, 0) AS new_task_count
                FROM ptaskinbox t
                JOIN pworkspaceobject w ON w.puid = t.puid
                WHERE t.rowneru = ? AND w.pobject_type = 'TaskInbox'
                ORDER BY t.puid
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new TaskInboxRow(
                rs.getString("puid"),
                rs.getString("inbox_name"),
                rs.getInt("new_task_count")
        ), userPuid).stream().findFirst();
    }

    /** 收件箱下的工作列表分类文件夹，实测有 TasksToPerform 与 TasksToTrack。 */
    public List<WorklistFolderRow> listInboxFolders(String inboxPuid) {
        String sql = """
                SELECT c.pseq,
                       c.pvalu_0 AS folder_puid,
                       COALESCE(fw.pobject_name, '') AS folder_name,
                       COALESCE(fw.pobject_type, '') AS folder_type
                FROM pcontents c
                JOIN pworkspaceobject fw ON fw.puid = c.pvalu_0
                WHERE c.puid = ?
                ORDER BY c.pseq
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new WorklistFolderRow(
                rs.getInt("pseq"),
                rs.getString("folder_puid"),
                rs.getString("folder_name"),
                rs.getString("folder_type")
        ), inboxPuid);
    }

    /**
     * 某个分类文件夹下的任务。任务名来自 EPMTask，
     * 所属流程实例名（通常等于目标对象编码）来自 Job，与 Teamcenter 显示口径一致。
     */
    public List<WorklistTask> listFolderTasks(String folderPuid) {
        String sql = """
                SELECT c.pseq,
                       c.pvalu_0 AS task_puid,
                       COALESCE(tw.pobject_name, '') AS task_name,
                       COALESCE(tw.pobject_type, '') AS task_type,
                       t.ptask_result,
                       t.pstate_value,
                       t.rparent_processu AS job_puid,
                       COALESCE(jw.pobject_name, '') AS job_name,
                       ti.puid AS target_item_puid,
                       ti.pitem_id AS target_item_id
                FROM pcontents c
                JOIN pepmtask t ON t.puid = c.pvalu_0
                LEFT JOIN pworkspaceobject tw ON tw.puid = c.pvalu_0
                LEFT JOIN pepmjob j ON j.puid = t.rparent_processu
                LEFT JOIN pworkspaceobject jw ON jw.puid = j.puid
                -- 流程实例名通常是目标对象编码（形如 000032/A;1-测试3），
                -- 取第一个斜杠前的部分去匹配零组件号，用于跳转规划器
                LEFT JOIN pitem ti ON ti.pitem_id = SPLIT_PART(COALESCE(jw.pobject_name, ''), '/', 1)
                WHERE c.puid = ?
                ORDER BY c.pseq
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            return mapWorklistTask(rs);
        }, folderPuid);
    }

    /** 平台本地队列的任务，覆盖原始 pcontents 队列关系。 */
    public List<WorklistTask> listLocalQueueTasks(String userPuid, String folderType) {
        String sql = """
                SELECT q.sequence AS pseq,
                       q.task_puid,
                       COALESCE(tw.pobject_name, '') AS task_name,
                       COALESCE(tw.pobject_type, '') AS task_type,
                       t.ptask_result,
                       t.pstate_value,
                       t.rparent_processu AS job_puid,
                       COALESCE(jw.pobject_name, '') AS job_name,
                       ti.puid AS target_item_puid,
                       ti.pitem_id AS target_item_id
                FROM local_task_queue q
                JOIN pepmtask t ON t.puid = q.task_puid
                LEFT JOIN pworkspaceobject tw ON tw.puid = t.puid
                LEFT JOIN pepmjob j ON j.puid = t.rparent_processu
                LEFT JOIN pworkspaceobject jw ON jw.puid = j.puid
                LEFT JOIN pitem ti ON ti.pitem_id = SPLIT_PART(COALESCE(jw.pobject_name, ''), '/', 1)
                WHERE q.user_puid = ? AND q.folder_type = ?
                ORDER BY q.sequence, q.task_puid
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> mapWorklistTask(rs), userPuid, folderType);
    }

    /** 已由平台队列接管的 task，原始 pcontents 队列不再重复展示。 */
    public Set<String> findOverriddenTaskIds() {
        return new HashSet<>(jdbcTemplate.queryForList(
                "SELECT task_puid FROM local_task_queue",
                String.class
        ));
    }

    public void upsertLocalQueue(String taskPuid, String userPuid, String folderType) {
        jdbcTemplate.update("""
                INSERT INTO local_task_queue (task_puid, user_puid, folder_type, sequence, updated_at)
                VALUES (
                    ?, ?, ?,
                    (SELECT COALESCE(MAX(sequence), 0) + 1
                     FROM local_task_queue WHERE user_puid = ? AND folder_type = ?),
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT (task_puid) DO UPDATE SET
                    user_puid = EXCLUDED.user_puid,
                    folder_type = EXCLUDED.folder_type,
                    sequence = EXCLUDED.sequence,
                    updated_at = CURRENT_TIMESTAMP
                """, taskPuid, userPuid, folderType, userPuid, folderType);
    }

    public void removeLocalQueue(String taskPuid) {
        jdbcTemplate.update("DELETE FROM local_task_queue WHERE task_puid = ?", taskPuid);
    }

    public long countContainer(String containerPuid) {
        if (containerPuid == null || containerPuid.isBlank()) {
            return 0L;
        }
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pcontents WHERE puid = ?", Long.class, containerPuid);
        return count == null ? 0L : count;
    }

    public long countUnreadMail(String mailboxPuid) {
        if (mailboxPuid == null || mailboxPuid.isBlank()) {
            return 0L;
        }
        Long count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM pcontents c
                JOIN penvelope e ON e.puid = c.pvalu_0
                WHERE c.puid = ? AND COALESCE(e.penvelopereadflag, 0) = 0
                """, Long.class, mailboxPuid);
        return count == null ? 0L : count;
    }

    public long countTasks(String userPuid) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pepmtask WHERE rresponsible_partyu = ?", Long.class, userPuid);
        return count == null ? 0L : count;
    }

    private static boolean readFlag(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        String text = String.valueOf(value);
        return "1".equals(text) || "true".equalsIgnoreCase(text);
    }

    private static boolean isFolderType(String objectType) {
        if (objectType == null) {
            return false;
        }
        String normalized = objectType.toLowerCase();
        return normalized.contains("folder");
    }

    private static String normalize(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime().toString();
    }

    private static WorklistTask mapWorklistTask(java.sql.ResultSet rs) throws java.sql.SQLException {
        String taskName = rs.getString("task_name");
        String jobName = rs.getString("job_name");
        String display = (jobName == null || jobName.isBlank())
                ? taskName
                : jobName + " (" + taskName + ")";
        return new WorklistTask(
                rs.getString("task_puid"),
                taskName,
                rs.getString("task_type"),
                display,
                rs.getString("job_puid"),
                jobName,
                rs.getString("pstate_value"),
                rs.getString("ptask_result"),
                rs.getString("target_item_puid"),
                rs.getString("target_item_id")
        );
    }

    public record ContainerPuids(String home, String newstuff, String mailbox) {
    }

    public record TaskInboxRow(String puid, String name, int newTaskCount) {
    }

    public record WorklistFolderRow(int sequence, String puid, String name, String type) {
    }
}
