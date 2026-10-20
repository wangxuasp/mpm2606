package com.extech.mpms.controller;

import com.extech.mpms.model.workflow.WorkflowModels.TemplateGraph;
import com.extech.mpms.model.workflow.WorkflowModels.TemplateSummary;
import com.extech.mpms.model.workflow.WorkflowModels.RuntimeCanvas;
import com.extech.mpms.model.workflow.WorkflowModels.RuntimeJobSummary;
import com.extech.mpms.service.WorkflowService;
import com.extech.mpms.service.WorkflowRuntimeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/workflow")
public class WorkflowController {

    private final WorkflowService service;
    private final WorkflowRuntimeService runtimeService;

    public WorkflowController(WorkflowService service, WorkflowRuntimeService runtimeService) {
        this.service = service;
        this.runtimeService = runtimeService;
    }

    @GetMapping("/templates")
    public List<TemplateSummary> templates(
            @RequestParam(required = false) Integer classification
    ) {
        return service.listTemplates(classification);
    }

    @GetMapping("/templates/{puid}")
    public TemplateGraph graph(@PathVariable String puid) {
        return service.graph(puid);
    }

    /** 运行态流程实例列表。 */
    @GetMapping("/jobs")
    public List<RuntimeJobSummary> jobs(
            @RequestParam(required = false) String state,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return runtimeService.listJobs(state, limit);
    }

    /** 运行态流程画布：任务节点、依赖连线与实例信息。 */
    @GetMapping("/jobs/{jobPuid}/canvas")
    public RuntimeCanvas canvas(@PathVariable String jobPuid) {
        return runtimeService.canvas(jobPuid);
    }
}
