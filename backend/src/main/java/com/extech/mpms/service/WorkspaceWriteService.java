package com.extech.mpms.service;

import com.extech.mpms.auth.AuthRepository;
import com.extech.mpms.auth.UserContext;
import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.workflow.WorkflowModels.TemplateNode;
import com.extech.mpms.model.workflow.WorkflowWriteModels.AssignTaskRequest;
import com.extech.mpms.model.workflow.WorkflowWriteModels.StartJobRequest;
import com.extech.mpms.model.workflow.WorkflowWriteModels.StartJobResponse;
import com.extech.mpms.model.workflow.WorkflowWriteModels.TaskActionResponse;
import com.extech.mpms.model.workflow.WorkflowWriteModels.TaskDecisionRequest;
import com.extech.mpms.repository.WorkflowRepository;
import com.extech.mpms.repository.WorkflowRepository.NodeRow;
import com.extech.mpms.repository.WorkspaceRepository;
import com.extech.mpms.repository.WorkspaceRepository.ContainerPuids;
import com.extech.mpms.repository.WorkspaceWriteRepository;
import com.extech.mpms.repository.WorkspaceWriteRepository.TargetRevisionRow;
import com.extech.mpms.repository.WorkspaceWriteRepository.TaskRow;
import com.extech.mpms.repository.WorkspaceWriteRepository.TargetRow;
import com.extech.mpms.repository.WorkspaceWriteRepository.UserRow;
import com.extech.mpms.repository.WorkspaceWriteRepository.WorkflowJobRow;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class WorkspaceWriteService {

    private static final String FOLDER_PERFORM = "TasksToPerform";
    private static final String FOLDER_TRACK = "TasksToTrack";
    private static final int STATE_WAITING = 2;
    private static final int STATE_ACTIVE = 4;
    private static final int STATE_COMPLETE = 8;
    private static final int DECISION_APPROVE = 89;
    private static final int DECISION_REJECT = 0;

    private static final String TYPE_DO = "xHa5rjoo5gyWHC";
    private static final String TYPE_REVIEW = "xTQ5rjoo5gyWHC";
    private static final String TYPE_SIGNOFF = "xPS5rjoo5gyWHC";
    private static final String TYPE_SELECT_SIGNOFF = "xXQ5rjoo5gyWHC";
    private static final String TYPE_ADD_STATUS = "xDa5rjoo5gyWHC";
    private static final String TYPE_ACKNOWLEDGE = "xDS5rjoo5gyWHC";
    private static final String TYPE_ROUTE = "xTY5rjoo5gyWHC";
    private static final String TYPE_NOTIFY = "xLS5rjoo5gyWHC";

    private final WorkspaceWriteRepository repository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkflowRepository workflowRepository;
    private final AuthRepository authRepository;

    public WorkspaceWriteService(
            WorkspaceWriteRepository repository,
            WorkspaceRepository workspaceRepository,
            WorkflowRepository workflowRepository,
            AuthRepository authRepository
    ) {
        this.repository = repository;
        this.workspaceRepository = workspaceRepository;
        this.workflowRepository = workflowRepository;
        this.authRepository = authRepository;
    }

    @Transactional
    public TaskActionResponse assignTask(
            String taskPuid,
            AssignTaskRequest request,
            UserContext currentUser,
            String clientIp
    ) {
        if (request == null || request.targetUserPuid() == null || request.targetUserPuid().isBlank()) {
            throw ApiException.badRequest("请选择指派用户");
        }
        TaskRow task = requireTask(taskPuid);
        if (task.state() != STATE_ACTIVE) {
            throw ApiException.badRequest("只有进行中的任务才能指派");
        }
        if (!currentUser.puid().equals(task.responsiblePuid())) {
            throw ApiException.forbidden("只能指派当前由你负责的任务");
        }
        UserRow target = repository.findActiveUser(request.targetUserPuid().trim())
                .orElseThrow(() -> ApiException.notFound("目标用户不存在"));
        if (target.status() != 0) {
            throw ApiException.badRequest("目标用户在 Teamcenter 中已停用");
        }

        repository.updateTask(
                task.puid(),
                target.puid(),
                task.state(),
                task.result(),
                appendComment(task.comments(), request.comment()),
                null,
                null,
                target.puid()
        );
        workspaceRepository.upsertLocalQueue(task.puid(), target.puid(), FOLDER_PERFORM);
        repository.writeModifiedRow("pepmtask", task.puid());
        authRepository.writeAudit(
                currentUser.puid(),
                currentUser.userId(),
                "TASK_ASSIGN",
                "workspace-task",
                task.puid(),
                clientIp,
                "指派给 " + target.userId()
        );
        return new TaskActionResponse(task.puid(), "ASSIGNED",
                "已指派给 " + target.displayName(), null);
    }

    @Transactional
    public TaskActionResponse completeTask(
            String taskPuid,
            TaskDecisionRequest request,
            UserContext currentUser,
            String clientIp
    ) {
        String action = request == null || request.action() == null
                ? "COMPLETE"
                : request.action().trim().toUpperCase(Locale.ROOT);
        return executeTask(
                taskPuid,
                action,
                request == null ? null : request.comments(),
                currentUser,
                clientIp
        );
    }

    @Transactional
    public TaskActionResponse removeTaskFromWorklist(
            String taskPuid,
            UserContext currentUser,
            String clientIp
    ) {
        TaskRow task = requireTask(taskPuid);
        if (!currentUser.puid().equals(task.responsiblePuid())) {
            throw ApiException.forbidden("只能从自己的工作列表中删除任务");
        }
        workspaceRepository.upsertLocalQueue(task.puid(), currentUser.puid(), "HIDDEN");
        authRepository.writeAudit(
                currentUser.puid(),
                currentUser.userId(),
                "TASK_REMOVE_FROM_WORKLIST",
                "workspace-task",
                task.puid(),
                clientIp,
                "从工作列表删除任务"
        );
        return new TaskActionResponse(task.puid(), "REMOVED", "已从工作列表删除", null);
    }

    @Transactional
    public void removeFolderItem(
            String type,
            String childPuid,
            UserContext currentUser,
            String clientIp
    ) {
        if (!"home".equalsIgnoreCase(type) && !"newstuff".equalsIgnoreCase(type)) {
            throw ApiException.badRequest("只支持 home 或 newstuff");
        }
        ContainerPuids containers = workspaceRepository.findContainers(currentUser.puid())
                .orElseThrow(() -> ApiException.notFound("当前用户没有个人容器"));
        String containerPuid = "home".equalsIgnoreCase(type)
                ? containers.home()
                : containers.newstuff();
        if (isBlank(containerPuid)) {
            throw ApiException.notFound("目标文件夹不存在");
        }
        if (!repository.folderItemExists(containerPuid, childPuid)) {
            throw ApiException.notFound("文件夹项目不存在或已删除");
        }
        repository.hideFolderItem(containerPuid, childPuid);
        authRepository.writeAudit(
                currentUser.puid(),
                currentUser.userId(),
                "FOLDER_ITEM_REMOVE",
                "workspace-folder:" + type,
                childPuid,
                clientIp,
                "从个人文件夹移除项目"
        );
    }

    @Transactional
    public StartJobResponse startJob(
            StartJobRequest request,
            UserContext currentUser,
            String clientIp
    ) {
        if (request == null || isBlank(request.templatePuid()) || isBlank(request.targetObjectPuid())) {
            throw ApiException.badRequest("流程模板和目标对象不能为空");
        }

        TemplateNode template = workflowRepository.findTemplate(request.templatePuid().trim())
                .orElseThrow(() -> ApiException.notFound("流程模板不存在"));
        if (template.classification() != 0) {
            throw ApiException.badRequest("只能选择流程模板发起流程");
        }
        TargetRow target = repository.findTargetObject(request.targetObjectPuid().trim())
                .orElseThrow(() -> ApiException.notFound("目标对象不存在"));

        List<RuntimeNode> nodes = collectRuntimeNodes(template.puid());
        boolean requiresAssignee = nodes.stream().anyMatch(this::isReviewType);
        UserRow assignee = null;
        if (requiresAssignee) {
            if (isBlank(request.assigneeUserPuid())) {
                throw ApiException.badRequest("该流程包含审核/签发节点，必须先选择审核人");
            }
            assignee = repository.findActiveUser(request.assigneeUserPuid().trim())
                    .orElseThrow(() -> ApiException.notFound("审核人不存在"));
            if (assignee.status() != 0) {
                throw ApiException.badRequest("审核人在 Teamcenter 中已停用");
            }
        }
        if (nodes.isEmpty()) {
            throw ApiException.badRequest("该流程模板没有可执行节点");
        }

        TargetRevisionRow targetRevision = repository.findTargetRevision(target.puid()).orElse(null);
        String jobPuid = newPuid("LOC_JOB_");
        String rootTaskPuid = newPuid("LOC_PROC_");
        String jobName = target.code()
                + "/" + (targetRevision == null ? "A" : targetRevision.revision())
                + ";1-" + template.name();
        String description = isBlank(request.description()) ? "通过平台发起" : request.description().trim();
        boolean autoSubmit = Boolean.TRUE.equals(request.autoSubmit()) && requiresAssignee;

        repository.insertJob(jobPuid, template.puid());
        repository.insertWorkspaceObject(jobPuid, jobName, description, "Job", currentUser.puid());
        repository.insertWorkflowJob(
                jobPuid,
                template.puid(),
                target.puid(),
                targetRevision == null ? null : targetRevision.puid(),
                currentUser.puid()
        );
        repository.insertTask(
                rootTaskPuid,
                template.name(),
                "EPMTask",
                template.puid(),
                jobPuid,
                currentUser.puid(),
                "",
                STATE_ACTIVE,
                "Unset",
                description,
                LocalDateTime.now(),
                null
        );
        repository.updateJobRootTask(jobPuid, rootTaskPuid);
        repository.updateWorkflowJobRootTask(jobPuid, rootTaskPuid);

        Map<String, String> taskIdByNode = new LinkedHashMap<>();
        String previousTaskPuid = rootTaskPuid;
        for (RuntimeNode node : nodes) {
            String taskPuid = newPuid(node.auto() ? "LOC_AUTO_" : "LOC_TSK_");
            String responsible = isReviewType(node) && assignee != null
                    ? assignee.puid()
                    : currentUser.puid();
            repository.insertTask(
                    taskPuid,
                    node.name(),
                    node.runtimeType(),
                    node.templatePuid(),
                    jobPuid,
                    responsible,
                    previousTaskPuid,
                    STATE_WAITING,
                    "Unset",
                    "",
                    null,
                    null
            );
            taskIdByNode.put(node.templatePuid(), taskPuid);
            previousTaskPuid = taskPuid;
        }

        String firstActiveTask = activateFromIndex(
                jobPuid,
                rootTaskPuid,
                nodes,
                taskIdByNode,
                0,
                autoSubmit,
                currentUser,
                description
        );

        registerJobRows(jobPuid, rootTaskPuid, taskIdByNode.values());
        authRepository.writeAudit(
                currentUser.puid(),
                currentUser.userId(),
                "WORKFLOW_START",
                "workflow-job",
                jobPuid,
                clientIp,
                "模板=" + template.name() + ", 目标=" + target.code()
                        + (assignee == null ? "" : ", 审核人=" + assignee.userId())
        );

        return new StartJobResponse(
                jobPuid,
                firstActiveTask,
                firstActiveTask == null ? "COMPLETED" : "STARTED",
                firstActiveTask == null
                        ? "流程已自动执行并完成"
                        : "流程已发起"
        );
    }

    private TaskActionResponse executeTask(
            String taskPuid,
            String action,
            String comments,
            UserContext currentUser,
            String clientIp
    ) {
        TaskRow task = requireTask(taskPuid);
        if (task.state() != STATE_ACTIVE) {
            throw ApiException.badRequest("该任务当前不是进行中状态");
        }
        if (!currentUser.puid().equals(task.responsiblePuid())) {
            throw ApiException.forbidden("只能执行当前由你负责的任务");
        }
        if ("ABSTAIN".equals(action)) {
            repository.updateTask(
                    task.puid(),
                    task.responsiblePuid(),
                    STATE_ACTIVE,
                    "Unset",
                    appendComment(task.comments(), comments),
                    null,
                    null,
                    currentUser.puid()
            );
            repository.writeModifiedRow("pepmtask", task.puid());
            return new TaskActionResponse(task.puid(), "ABSTAINED", "已保存，不作决定", null);
        }
        if (!"COMPLETE".equals(action) && !"APPROVE".equals(action) && !"REJECT".equals(action)) {
            throw ApiException.badRequest("不支持的任务操作: " + action);
        }

        if ("REJECT".equals(action)) {
            return rejectTask(task, comments, currentUser, clientIp);
        }

        String result = "APPROVE".equals(action) ? "Approved" : "Completed";
        repository.updateTask(
                task.puid(),
                task.responsiblePuid(),
                STATE_COMPLETE,
                result,
                appendComment(task.comments(), comments),
                null,
                LocalDateTime.now(),
                currentUser.puid()
        );
        workspaceRepository.upsertLocalQueue(task.puid(), currentUser.puid(), FOLDER_TRACK);
        repository.writeModifiedRow("pepmtask", task.puid());
        if (isReviewTask(task)) {
            repository.upsertSignoff(
                    task.puid(),
                    repository.findUserMembershipPuid(currentUser.puid()).orElse(null),
                    DECISION_APPROVE,
                    comments,
                    currentUser.puid()
            );
            repository.writeModifiedRow("psignoff", task.puid());
        }

        authRepository.writeAudit(
                currentUser.puid(),
                currentUser.userId(),
                "TASK_" + action,
                "workspace-task",
                task.puid(),
                clientIp,
                comments
        );
        TaskActionResponse advanced = advanceAfter(task, currentUser);
        if ("APPROVE".equals(action)) {
            return new TaskActionResponse(
                    task.puid(),
                    "APPROVE",
                    advanced.message(),
                    advanced.nextTaskPuid()
            );
        }
        return advanced;
    }

    private TaskActionResponse rejectTask(
            TaskRow task,
            String comments,
            UserContext currentUser,
            String clientIp
    ) {
        repository.updateTask(
                task.puid(),
                task.responsiblePuid(),
                STATE_WAITING,
                "Rejected",
                appendComment(task.comments(), comments),
                null,
                null,
                currentUser.puid()
        );
        workspaceRepository.removeLocalQueue(task.puid());
        repository.writeModifiedRow("pepmtask", task.puid());
        if (isReviewTask(task)) {
            repository.upsertSignoff(
                    task.puid(),
                    repository.findUserMembershipPuid(currentUser.puid()).orElse(null),
                    DECISION_REJECT,
                    comments,
                    currentUser.puid()
            );
            repository.writeModifiedRow("psignoff", task.puid());
        }

        TaskRow previous = repository.findPreviousTask(task.puid())
                .orElseThrow(() -> ApiException.badRequest("找不到可退回的前置任务"));
        activateTask(previous);
        authRepository.writeAudit(
                currentUser.puid(),
                currentUser.userId(),
                "TASK_REJECT",
                "workspace-task",
                task.puid(),
                clientIp,
                comments
        );
        return new TaskActionResponse(task.puid(), "REJECT", "任务已驳回并退回申请", previous.puid());
    }

    private TaskActionResponse advanceAfter(TaskRow completedTask, UserContext currentUser) {
        TaskRow cursor = completedTask;
        while (true) {
            TaskRow next = repository.findNextTask(cursor.puid()).orElse(null);
            if (next == null) {
                completeProcess(completedTask.jobPuid(), currentUser);
                return new TaskActionResponse(
                        completedTask.puid(),
                        "COMPLETED",
                        "流程已结束，任务已从工作列表清除",
                        null
                );
            }
            if (isAutoTask(next)) {
                executeAutoTask(next, currentUser);
                cursor = next;
                continue;
            }
            activateTask(next);
            return new TaskActionResponse(
                    completedTask.puid(),
                    "COMPLETED",
                    "任务已完成，下一步已激活",
                    next.puid()
            );
        }
    }

    private String activateFromIndex(
            String jobPuid,
            String rootTaskPuid,
            List<RuntimeNode> nodes,
            Map<String, String> taskIdByNode,
            int startIndex,
            boolean autoSubmit,
            UserContext currentUser,
            String description
    ) {
        int index = startIndex;
        if (autoSubmit) {
            while (index < nodes.size() && isDoNode(nodes.get(index))) {
                String taskPuid = taskIdByNode.get(nodes.get(index).templatePuid());
                repository.updateTask(
                        taskPuid,
                        currentUser.puid(),
                        STATE_COMPLETE,
                        "Completed",
                        description,
                        LocalDateTime.now(),
                        LocalDateTime.now(),
                        currentUser.puid()
                );
                workspaceRepository.upsertLocalQueue(taskPuid, currentUser.puid(), FOLDER_TRACK);
                index++;
            }
        }
        while (index < nodes.size()) {
            RuntimeNode node = nodes.get(index);
            String taskPuid = taskIdByNode.get(node.templatePuid());
            if (node.auto()) {
                executeAutoTask(requireTask(taskPuid), currentUser);
                index++;
                continue;
            }
            activateTask(requireTask(taskPuid));
            return taskPuid;
        }
        completeProcess(jobPuid, currentUser);
        return null;
    }

    private void activateTask(TaskRow task) {
        repository.updateTask(
                task.puid(),
                task.responsiblePuid(),
                STATE_ACTIVE,
                "Unset",
                task.comments(),
                LocalDateTime.now(),
                null,
                null
        );
        workspaceRepository.upsertLocalQueue(task.puid(), task.responsiblePuid(), FOLDER_PERFORM);
        repository.writeModifiedRow("pepmtask", task.puid());
    }

    private void executeAutoTask(TaskRow task, UserContext currentUser) {
        if (isAddStatusTask(task)) {
            WorkflowJobRow job = repository.findWorkflowJob(task.jobPuid())
                    .orElseThrow(() -> ApiException.notFound("流程实例扩展信息不存在"));
            String revisionPuid = job.targetRevisionPuid();
            if (isBlank(revisionPuid) && !isBlank(job.targetObjectPuid())) {
                revisionPuid = repository.findTargetRevision(job.targetObjectPuid())
                        .map(TargetRevisionRow::puid)
                        .orElse(null);
            }
            if (isBlank(revisionPuid)) {
                throw ApiException.badRequest("目标对象没有可用的 ItemRevision，无法写入发布状态");
            }
            String statusPuid = newPuid("LOC_RLS_");
            String relationPuid = newPuid("LOC_REL_");
            repository.insertReleaseStatus(statusPuid);
            repository.insertReleaseStatusList(revisionPuid, statusPuid);
            if (!isBlank(job.rootTaskPuid())) {
                repository.insertReleaseRelation(relationPuid, job.rootTaskPuid(), statusPuid);
            }
            repository.writeModifiedRow("preleasestatus", statusPuid);
            repository.writeModifiedRow("pimanrelation", relationPuid);
        }
        repository.updateTask(
                task.puid(),
                task.responsiblePuid(),
                STATE_COMPLETE,
                "Completed",
                task.comments(),
                task.state() == STATE_ACTIVE ? LocalDateTime.now() : null,
                LocalDateTime.now(),
                currentUser.puid()
        );
        repository.writeModifiedRow("pepmtask", task.puid());
    }

    private void completeProcess(String jobPuid, UserContext currentUser) {
        repository.clearJobTaskQueue(jobPuid);
        WorkflowJobRow job = repository.findWorkflowJob(jobPuid).orElse(null);
        if (job != null && !isBlank(job.rootTaskPuid())) {
            repository.updateTask(
                    job.rootTaskPuid(),
                    currentUser.puid(),
                    STATE_COMPLETE,
                    "Completed",
                    "",
                    null,
                    LocalDateTime.now(),
                    currentUser.puid()
            );
            repository.writeModifiedRow("pepmtask", job.rootTaskPuid());
        }
        repository.completeWorkflowJob(jobPuid);
    }

    private List<RuntimeNode> collectRuntimeNodes(String rootTemplatePuid) {
        List<RuntimeNode> discovered = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        visited.add(rootTemplatePuid);
        collectChildren(rootTemplatePuid, visited, discovered, 0);
        discovered.sort(Comparator.comparingInt(this::runtimePriority));
        return discovered;
    }

    private void collectChildren(
            String parentPuid,
            Set<String> visited,
            List<RuntimeNode> result,
            int depth
    ) {
        if (depth > 8) {
            return;
        }
        for (NodeRow child : workflowRepository.findChildren(parentPuid)) {
            if (child.childPuid() == null || !visited.add(child.childPuid())) {
                continue;
            }
            RuntimeNode runtimeNode = toRuntimeNode(child);
            if (runtimeNode != null) {
                result.add(runtimeNode);
            }
            collectChildren(child.childPuid(), visited, result, depth + 1);
        }
    }

    private RuntimeNode toRuntimeNode(NodeRow child) {
        if (child.childClass() != 1) {
            return null;
        }
        String type = child.childType();
        String runtimeType = runtimeType(type);
        if (runtimeType == null || TYPE_SELECT_SIGNOFF.equals(type)) {
            return null;
        }
        return new RuntimeNode(
                child.childPuid(),
                child.childName(),
                type,
                runtimeType,
                TYPE_ADD_STATUS.equals(type)
        );
    }

    private int runtimePriority(RuntimeNode node) {
        if (TYPE_DO.equals(node.typeId())) return 10;
        if (TYPE_REVIEW.equals(node.typeId())) return 20;
        if (TYPE_SIGNOFF.equals(node.typeId())) return 30;
        if (TYPE_ADD_STATUS.equals(node.typeId())) return 40;
        return 50;
    }

    private String runtimeType(String typeId) {
        if (TYPE_DO.equals(typeId)) return "EPMDoTask";
        if (TYPE_REVIEW.equals(typeId)) return "EPMReviewTask";
        if (TYPE_SIGNOFF.equals(typeId)) return "EPMPerformSignoffTask";
        if (TYPE_ADD_STATUS.equals(typeId)) return "EPMAddStatusTask";
        if (TYPE_ACKNOWLEDGE.equals(typeId)) return "EPMAcknowledgeTask";
        if (TYPE_ROUTE.equals(typeId)) return "EPMRouteTask";
        if (TYPE_NOTIFY.equals(typeId)) return "EPMNotifyTask";
        return null;
    }

    private boolean isDoNode(RuntimeNode node) {
        return TYPE_DO.equals(node.typeId());
    }

    private boolean isReviewType(RuntimeNode node) {
        return TYPE_REVIEW.equals(node.typeId()) || TYPE_SIGNOFF.equals(node.typeId());
    }

    private boolean isReviewTask(TaskRow task) {
        String type = task.type() == null ? "" : task.type().toLowerCase(Locale.ROOT);
        return type.contains("review") || type.contains("signoff");
    }

    private boolean isAutoTask(TaskRow task) {
        return task.type() != null && task.type().toLowerCase(Locale.ROOT).contains("addstatustask");
    }

    private boolean isAddStatusTask(TaskRow task) {
        return isAutoTask(task);
    }

    private void registerJobRows(String jobPuid, String rootTaskPuid, Iterable<String> taskPuuids) {
        for (String table : new String[]{"pepmjob", "pworkspaceobject", "ppom_application_object"}) {
            repository.writeModifiedRow(table, jobPuid);
        }
        for (String taskPuid : taskPuuids) {
            for (String table : new String[]{"pepmtask", "pworkspaceobject", "ppom_application_object"}) {
                repository.writeModifiedRow(table, taskPuid);
            }
        }
        for (String table : new String[]{"pepmtask", "pworkspaceobject", "ppom_application_object"}) {
            repository.writeModifiedRow(table, rootTaskPuid);
        }
    }

    private TaskRow requireTask(String taskPuid) {
        if (isBlank(taskPuid)) {
            throw ApiException.badRequest("任务 PUID 不能为空");
        }
        return repository.findTask(taskPuid.trim())
                .orElseThrow(() -> ApiException.notFound("任务不存在: " + taskPuid));
    }

    private static String appendComment(String existing, String comment) {
        if (isBlank(comment)) {
            return existing == null ? "" : existing;
        }
        if (isBlank(existing)) {
            return comment.trim();
        }
        return existing + "\n" + comment.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String newPuid(String prefix) {
        String raw = UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT);
        return prefix + raw.substring(0, 12);
    }

    private record RuntimeNode(
            String templatePuid,
            String name,
            String typeId,
            String runtimeType,
            boolean auto
    ) {
    }
}
