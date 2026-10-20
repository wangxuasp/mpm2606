package com.extech.mpms.model.workflow;

public final class WorkflowWriteModels {

    private WorkflowWriteModels() {
    }

    public record AssignTaskRequest(String targetUserPuid, String comment) {
    }

    public record TaskDecisionRequest(String action, String comments) {
    }

    public record StartJobRequest(
            String templatePuid,
            String targetObjectPuid,
            String assigneeUserPuid,
            Boolean autoSubmit,
            String description
    ) {
    }

    public record TaskActionResponse(
            String taskPuid,
            String status,
            String message,
            String nextTaskPuid
    ) {
    }

    public record StartJobResponse(
            String jobPuid,
            String taskPuid,
            String status,
            String message
    ) {
    }
}
