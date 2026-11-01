package com.extech.mpms.model.workspace;

import java.util.List;

public final class WorkspaceModels {

    private WorkspaceModels() {
    }

    public record WorkspaceProfile(
            String puid,
            String userId,
            String displayName,
            String personName,
            String department,
            String email,
            List<String> groups,
            List<String> roles
    ) {
    }

    public record WorkspaceSummary(
            WorkspaceProfile profile,
            long homeCount,
            long newstuffCount,
            long unreadMailCount,
            long taskCount
    ) {
    }

    public record FolderItem(
            int sequence,
            String puid,
            String name,
            String objectType,
            String itemId,
            String revision,
            String ownerName,
            String modifiedAt,
            boolean folder
    ) {
    }

    public record MailItem(
            int sequence,
            String puid,
            String subject,
            String body,
            boolean read,
            String sentDate,
            String senderName
    ) {
    }

    /**
     * 工作列表任务。显示格式与 Teamcenter 一致：<流程实例名> (<任务名>)，
     * 其中流程实例名通常就是目标对象的编码，例如 "000032/A;1-测试3"。
     */
    public record WorklistTask(
            String puid,
            String name,
            String taskType,
            String displayName,
            String jobPuid,
            String jobName,
            String state,
            String result,
            String targetItemPuid,
            String targetItemId
    ) {
    }

    public record WorklistFolder(
            String key,
            String title,
            long count,
            List<WorklistTask> tasks
    ) {
    }

    public record Worklist(
            String inboxPuid,
            String inboxName,
            List<WorklistFolder> folders
    ) {
    }
}
