package com.extech.mpms.service;

import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.workflow.WorkflowModels.Edge;
import com.extech.mpms.model.workflow.WorkflowModels.TemplateGraph;
import com.extech.mpms.model.workflow.WorkflowModels.TemplateNode;
import com.extech.mpms.model.workflow.WorkflowModels.TemplateSummary;
import com.extech.mpms.repository.WorkflowRepository;
import com.extech.mpms.repository.WorkflowRepository.NodeRow;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class WorkflowService {

    private static final int CLASS_PROCESS = 0;
    private static final int CLASS_TASK = 1;

    private final WorkflowRepository repository;

    public WorkflowService(WorkflowRepository repository) {
        this.repository = repository;
    }

    /**
     * classification: 0 = 流程模板，1 = 任务模板。
     * 同一名称的模板在本库里存在多份复制实例，列表按名称归并展示。
     */
    public List<TemplateSummary> listTemplates(Integer classification) {
        int cls = classification == null ? CLASS_PROCESS : classification;
        if (cls != CLASS_PROCESS && cls != CLASS_TASK) {
            throw ApiException.badRequest("模板分类只能是 0（流程）或 1（任务）");
        }
        List<TemplateSummary> rows = repository.listTemplates(cls);
        Map<String, Long> counts = new HashMap<>();
        Map<String, TemplateSummary> byName = new LinkedHashMap<>();
        for (TemplateSummary row : rows) {
            counts.merge(row.name(), 1L, Long::sum);
            byName.putIfAbsent(row.name(), row);
        }
        List<TemplateSummary> result = new ArrayList<>();
        for (TemplateSummary row : byName.values()) {
            result.add(new TemplateSummary(
                    row.puid(),
                    row.name(),
                    row.classification(),
                    row.typeId(),
                    row.typeLabel(),
                    counts.getOrDefault(row.name(), 1L),
                    row.childCount()
            ));
        }
        return result;
    }

    /** 展开一个模板节点，返回其下游节点与连线。 */
    public TemplateGraph graph(String puid) {
        if (puid == null || puid.isBlank()) {
            throw ApiException.badRequest("模板 PUID 不能为空");
        }
        TemplateNode root = repository.findTemplate(puid.trim())
                .orElseThrow(() -> ApiException.notFound("流程模板不存在: " + puid));

        Map<String, TemplateNode> nodes = new LinkedHashMap<>();
        nodes.put(root.puid(), root);
        List<Edge> edges = new ArrayList<>();
        Set<String> expanded = new HashSet<>();
        expanded.add(root.puid());
        List<String> frontier = List.of(root.puid());

        // 按层展开，最多 8 层；用 expanded 防止 申请 -> 工艺入库流程 这类回指造成死循环
        for (int level = 1; level <= 8 && !frontier.isEmpty(); level++) {
            List<String> next = new ArrayList<>();
            for (String parent : frontier) {
                for (NodeRow row : repository.findChildren(parent)) {
                    edges.add(new Edge(row.parentPuid(), row.childPuid(), row.sequence()));
                    nodes.putIfAbsent(row.childPuid(), new TemplateNode(
                            row.childPuid(),
                            row.childName(),
                            row.childClass(),
                            row.childType(),
                            WorkflowRepository.typeLabel(row.childType()),
                            level
                    ));
                    if (expanded.add(row.childPuid())) {
                        next.add(row.childPuid());
                    }
                }
            }
            frontier = next;
        }
        return new TemplateGraph(root, List.copyOf(nodes.values()), edges);
    }
}
