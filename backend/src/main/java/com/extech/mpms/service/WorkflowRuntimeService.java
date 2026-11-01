package com.extech.mpms.service;

import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.workflow.WorkflowModels.RuntimeCanvas;
import com.extech.mpms.model.workflow.WorkflowModels.RuntimeEdge;
import com.extech.mpms.model.workflow.WorkflowModels.RuntimeJobSummary;
import com.extech.mpms.model.workflow.WorkflowModels.RuntimeNode;
import com.extech.mpms.repository.WorkspaceWriteRepository;
import com.extech.mpms.repository.WorkspaceWriteRepository.JobRow;
import com.extech.mpms.repository.WorkspaceWriteRepository.RuntimeTaskRow;
import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * 流程运行态视图：把工作列表里的真实任务按父子依赖还原成流程图，
 * 供 /workflow 画布按绿/橙/灰高亮，并与工作列表动作联动。
 */
@Service
public class WorkflowRuntimeService {

    private static final int STATE_WAITING = 2;
    private static final int STATE_ACTIVE = 4;
    private static final int STATE_COMPLETE = 8;
    private static final int MAX_JOBS = 100;

    /** 运行时任务类型 → Teamcenter 界面名称。 */
    private static final Map<String, String> RUNTIME_TYPE_LABELS = Map.ofEntries(
            Map.entry("EPMDoTask", "Do Task"),
            Map.entry("EPMReviewTask", "Approval Review Task"),
            Map.entry("EPMPerformSignoffTask", "Perform Signoff Task"),
            Map.entry("EPMAddStatusTask", "Add Status Task"),
            Map.entry("EPMAcknowledgeTask", "Acknowledge Task"),
            Map.entry("EPMRouteTask", "Route Task"),
            Map.entry("EPMNotifyTask", "Notify Task"),
            Map.entry("EPMTask", "Process")
    );

    private final WorkspaceWriteRepository repository;

    public WorkflowRuntimeService(WorkspaceWriteRepository repository) {
        this.repository = repository;
    }

    public List<RuntimeJobSummary> listJobs(String state, int limit) {
        int size = Math.min(Math.max(limit, 1), MAX_JOBS);
        List<RuntimeJobSummary> result = new ArrayList<>();
        for (JobRow row : repository.listWorkflowJobs(state, size)) {
            result.add(toSummary(row));
        }
        return result;
    }

    public RuntimeCanvas canvas(String jobPuid) {
        if (jobPuid == null || jobPuid.isBlank()) {
            throw ApiException.badRequest("流程 PUID 不能为空");
        }
        JobRow job = repository.findJobRow(jobPuid.trim())
                .orElseThrow(() -> ApiException.notFound("流程实例不存在: " + jobPuid));
        List<RuntimeTaskRow> tasks = repository.listJobTasks(job.jobPuid());
        Map<String, RuntimeTaskRow> byPuid = new LinkedHashMap<>();
        for (RuntimeTaskRow task : tasks) {
            byPuid.put(task.taskPuid(), task);
        }

        List<RuntimeEdge> edges = new ArrayList<>();
        Map<String, List<String>> childrenByParent = new HashMap<>();
        for (RuntimeTaskRow task : tasks) {
            String parent = task.parentTaskPuid();
            if (parent == null || parent.isBlank() || !byPuid.containsKey(parent)) {
                continue;
            }
            edges.add(new RuntimeEdge(parent, task.taskPuid()));
            childrenByParent.computeIfAbsent(parent, ignored -> new ArrayList<>()).add(task.taskPuid());
        }

        // 从根任务按依赖关系 BFS，得到稳定的展示顺序
        String rootPuid = job.rootTaskPuid() == null || job.rootTaskPuid().isBlank()
                ? firstRoot(byPuid)
                : job.rootTaskPuid();
        List<RuntimeNode> nodes = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        Deque<String> queue = new ArrayDeque<>();
        if (rootPuid != null && byPuid.containsKey(rootPuid)) {
            queue.add(rootPuid);
            visited.add(rootPuid);
        }
        int order = 0;
        while (!queue.isEmpty()) {
            String current = queue.poll();
            RuntimeTaskRow task = byPuid.get(current);
            if (task != null) {
                nodes.add(toNode(task, order++));
            }
            for (String child : childrenByParent.getOrDefault(current, List.of())) {
                if (visited.add(child)) {
                    queue.add(child);
                }
            }
        }
        // 兜底：没有父链或孤立的任务仍然展示
        for (RuntimeTaskRow task : tasks) {
            if (visited.add(task.taskPuid())) {
                nodes.add(toNode(task, order++));
            }
        }
        return new RuntimeCanvas(toSummary(job), nodes, edges);
    }

    private String firstRoot(Map<String, RuntimeTaskRow> byPuid) {
        for (RuntimeTaskRow task : byPuid.values()) {
            String parent = task.parentTaskPuid();
            if (parent == null || parent.isBlank() || !byPuid.containsKey(parent)) {
                return task.taskPuid();
            }
        }
        return null;
    }

    private RuntimeJobSummary toSummary(JobRow row) {
        return new RuntimeJobSummary(
                row.jobPuid(),
                row.name(),
                row.templatePuid(),
                row.templateName(),
                row.targetObjectPuid(),
                row.targetCode(),
                row.targetName(),
                row.processState(),
                row.createdBy(),
                row.createdByName(),
                row.createdAt(),
                row.completedAt(),
                row.taskCount(),
                row.activeCount(),
                row.completedCount()
        );
    }

    private RuntimeNode toNode(RuntimeTaskRow task, int order) {
        String state = resolveState(task);
        return new RuntimeNode(
                task.taskPuid(),
                task.name(),
                task.taskType(),
                typeLabel(task.taskType()),
                state,
                stateLabel(state),
                task.responsiblePuid(),
                task.responsibleName(),
                task.comments(),
                task.result(),
                task.startDate(),
                task.endDate(),
                task.templatePuid(),
                order
        );
    }

    private String resolveState(RuntimeTaskRow task) {
        String result = task.result() == null ? "" : task.result().trim().toLowerCase(Locale.ROOT);
        if ("rejected".equals(result)) {
            return "REJECTED";
        }
        if (task.state() == STATE_COMPLETE) {
            return "COMPLETED";
        }
        if (task.state() == STATE_ACTIVE) {
            return "ACTIVE";
        }
        if (task.state() == STATE_WAITING) {
            return "WAITING";
        }
        return "WAITING";
    }

    private String stateLabel(String state) {
        return switch (state) {
            case "COMPLETED" -> "已完成";
            case "ACTIVE" -> "进行中";
            case "REJECTED" -> "已驳回";
            default -> "待处理";
        };
    }

    private String typeLabel(String runtimeType) {
        if (runtimeType == null || runtimeType.isBlank()) {
            return "";
        }
        return RUNTIME_TYPE_LABELS.getOrDefault(runtimeType, runtimeType);
    }
}
