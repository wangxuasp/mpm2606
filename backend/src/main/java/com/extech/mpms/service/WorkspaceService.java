package com.extech.mpms.service;

import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.workspace.WorkspaceModels.FolderItem;
import com.extech.mpms.model.workspace.WorkspaceModels.MailItem;
import com.extech.mpms.model.workspace.WorkspaceModels.WorkspaceProfile;
import com.extech.mpms.model.workspace.WorkspaceModels.WorkspaceSummary;
import com.extech.mpms.model.workspace.WorkspaceModels.Worklist;
import com.extech.mpms.model.workspace.WorkspaceModels.WorklistFolder;
import com.extech.mpms.model.workspace.WorkspaceModels.WorklistTask;
import com.extech.mpms.repository.WorkspaceRepository;
import com.extech.mpms.repository.WorkspaceRepository.ContainerPuids;
import com.extech.mpms.repository.WorkspaceRepository.TaskInboxRow;
import com.extech.mpms.repository.WorkspaceRepository.WorklistFolderRow;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class WorkspaceService {

    /** 工作列表固定显示的分类文件夹，顺序与 Teamcenter 一致。 */
    private static final List<String[]> WORKLIST_FOLDERS = List.of(
            new String[]{"TasksToPerform", "要执行的任务"},
            new String[]{"TasksToTrack", "要跟踪的任务"},
            new String[]{"ScheduleTasks", "时间表任务"}
    );

    private final WorkspaceRepository repository;

    public WorkspaceService(WorkspaceRepository repository) {
        this.repository = repository;
    }

    public WorkspaceSummary summary(String userPuid) {
        WorkspaceProfile profile = repository.findProfile(userPuid)
                .orElseThrow(() -> ApiException.notFound("当前用户档案不存在"));
        ContainerPuids containers = repository.findContainers(userPuid)
                .orElse(new ContainerPuids(null, null, null));
        Worklist worklist = worklist(userPuid);
        long taskCount = worklist.folders().stream().mapToLong(WorklistFolder::count).sum();
        return new WorkspaceSummary(
                profile,
                repository.countContainer(containers.home()),
                repository.countContainer(containers.newstuff()),
                repository.countUnreadMail(containers.mailbox()),
                taskCount
        );
    }

    /**
     * 只接受 home / newstuff 两种类型，容器 PUID 由后端按当前登录用户读取，
     * 前端无法传入任意 PUID，从入口上杜绝跨账号访问。
     */
    public List<FolderItem> folders(String userPuid, String type) {
        if (type == null || type.isBlank()) {
            throw ApiException.badRequest("缺少文件夹类型");
        }
        ContainerPuids containers = requireContainers(userPuid);
        String containerPuid = switch (type.trim().toLowerCase()) {
            case "home" -> containers.home();
            case "newstuff" -> containers.newstuff();
            default -> throw ApiException.badRequest("只支持 home 或 newstuff，收到: " + type);
        };
        if (containerPuid == null || containerPuid.isBlank()) {
            return List.of();
        }
        return repository.listFolderContents(containerPuid);
    }

    public List<MailItem> mailbox(String userPuid) {
        ContainerPuids containers = requireContainers(userPuid);
        if (containers.mailbox() == null || containers.mailbox().isBlank()) {
            return List.of();
        }
        return repository.listMailbox(containers.mailbox());
    }

    /**
     * 按 Teamcenter "我的工作列表"的真实层级返回：
     * TaskInbox -> 要执行的任务 / 要跟踪的任务 / 时间表任务 -> 任务。
     * 不使用 pepmtask 全表，避免把历史流程任务混进待办列表。
     */
    public Worklist worklist(String userPuid) {
        TaskInboxRow inbox = repository.findTaskInbox(userPuid).orElse(null);
        if (inbox == null) {
            return new Worklist("", "我的工作列表", buildFolders(Map.of()));
        }
        Map<String, WorklistFolderRow> byType = new HashMap<>();
        for (WorklistFolderRow row : repository.listInboxFolders(inbox.puid())) {
            byType.putIfAbsent(row.type(), row);
        }
        List<WorklistFolder> folders = buildFolders(userPuid, byType);
        long pendingCount = folders.stream()
                .filter(folder -> "TasksToPerform".equals(folder.key()))
                .mapToLong(WorklistFolder::count)
                .sum();
        String inboxLabel = pendingCount > 0
                ? inbox.name() + " (" + pendingCount + ")"
                : inbox.name();
        return new Worklist(inbox.puid(), inboxLabel, folders);
    }

    private List<WorklistFolder> buildFolders(Map<String, WorklistFolderRow> byType) {
        return buildFolders("", byType);
    }

    private List<WorklistFolder> buildFolders(
            String userPuid,
            Map<String, WorklistFolderRow> byType
    ) {
        Set<String> overriddenTaskIds = userPuid.isBlank()
                ? Set.of()
                : new HashSet<>(repository.findOverriddenTaskIds());
        List<WorklistFolder> folders = new ArrayList<>();
        for (String[] definition : WORKLIST_FOLDERS) {
            WorklistFolderRow row = byType.get(definition[0]);
            List<WorklistTask> tasks = new ArrayList<>();
            if (!userPuid.isBlank()) {
                tasks.addAll(repository.listLocalQueueTasks(userPuid, definition[0]));
            }
            if (row != null) {
                for (WorklistTask task : repository.listFolderTasks(row.puid())) {
                    if (!overriddenTaskIds.contains(task.puid())) {
                        tasks.add(task);
                    }
                }
            }
            folders.add(new WorklistFolder(definition[0], definition[1], tasks.size(), tasks));
        }
        return folders;
    }

    private ContainerPuids requireContainers(String userPuid) {
        return repository.findContainers(userPuid)
                .orElseThrow(() -> ApiException.notFound("当前用户不存在或没有个人容器"));
    }
}
