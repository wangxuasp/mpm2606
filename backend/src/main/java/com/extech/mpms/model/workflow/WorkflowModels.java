package com.extech.mpms.model.workflow;

import java.util.List;

public final class WorkflowModels {

    private WorkflowModels() {
    }

    /** 模板列表条目。名称相同的模板在实例化时会复制多份，列表按名称归并。 */
    public record TemplateSummary(
            String puid,
            String name,
            int classification,
            String typeId,
            String typeLabel,
            long variantCount,
            long childCount
    ) {
    }

    public record TemplateNode(
            String puid,
            String name,
            int classification,
            String typeId,
            String typeLabel,
            int level
    ) {
    }

    /** 流程图：节点列表 + 有向边列表，前端按顺序渲染并画连线。 */
    public record TemplateGraph(
            TemplateNode root,
            List<TemplateNode> nodes,
            List<Edge> edges
    ) {
    }

    public record Edge(String parentPuid, String childPuid, int sequence) {
    }

    /** 运行态流程实例摘要，用于流程查看器的“运行实例”列表。 */
    public record RuntimeJobSummary(
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
            long completedCount
    ) {
    }

    /** 运行态任务节点。state 取值 WAITING / ACTIVE / COMPLETED / REJECTED。 */
    public record RuntimeNode(
            String taskPuid,
            String name,
            String taskType,
            String typeLabel,
            String state,
            String stateLabel,
            String responsiblePuid,
            String responsibleName,
            String comments,
            String result,
            String startDate,
            String endDate,
            String templatePuid,
            int order
    ) {
    }

    public record RuntimeEdge(String parentTaskPuid, String childTaskPuid) {
    }

    /** 运行态画布：任务节点 + 依赖连线 + 流程实例信息。 */
    public record RuntimeCanvas(
            RuntimeJobSummary job,
            List<RuntimeNode> nodes,
            List<RuntimeEdge> edges
    ) {
    }
}
