package com.extech.mpms.controller;

import com.extech.mpms.auth.AuthInterceptor;
import com.extech.mpms.auth.UserContext;
import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.workflow.WorkflowWriteModels.AssignTaskRequest;
import com.extech.mpms.model.workflow.WorkflowWriteModels.StartJobRequest;
import com.extech.mpms.model.workflow.WorkflowWriteModels.StartJobResponse;
import com.extech.mpms.model.workflow.WorkflowWriteModels.TaskActionResponse;
import com.extech.mpms.model.workflow.WorkflowWriteModels.TaskDecisionRequest;
import com.extech.mpms.service.WorkspaceWriteService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class WorkspaceActionController {

    private final WorkspaceWriteService service;

    public WorkspaceActionController(WorkspaceWriteService service) {
        this.service = service;
    }

    @PostMapping("/workspace/tasks/{taskPuid}/assign")
    public TaskActionResponse assign(
            @PathVariable String taskPuid,
            @RequestBody AssignTaskRequest body,
            HttpServletRequest request
    ) {
        return service.assignTask(taskPuid, body, currentUser(request), request.getRemoteAddr());
    }

    @PostMapping("/workspace/tasks/{taskPuid}/complete")
    public TaskActionResponse complete(
            @PathVariable String taskPuid,
            @RequestBody(required = false) TaskDecisionRequest body,
            HttpServletRequest request
    ) {
        return service.completeTask(taskPuid, body, currentUser(request), request.getRemoteAddr());
    }

    @PostMapping("/workspace/tasks/{taskPuid}/decision")
    public TaskActionResponse decision(
            @PathVariable String taskPuid,
            @RequestBody TaskDecisionRequest body,
            HttpServletRequest request
    ) {
        return service.completeTask(taskPuid, body, currentUser(request), request.getRemoteAddr());
    }

    @DeleteMapping("/workspace/tasks/{taskPuid}")
    public TaskActionResponse removeTask(
            @PathVariable String taskPuid,
            HttpServletRequest request
    ) {
        return service.removeTaskFromWorklist(
                taskPuid,
                currentUser(request),
                request.getRemoteAddr()
        );
    }

    @DeleteMapping("/workspace/folders/{type}/items/{childPuid}")
    public void removeFolderItem(
            @PathVariable String type,
            @PathVariable String childPuid,
            HttpServletRequest request
    ) {
        service.removeFolderItem(
                type,
                childPuid,
                currentUser(request),
                request.getRemoteAddr()
        );
    }

    @PostMapping("/workflow/jobs/start")
    public StartJobResponse start(
            @RequestBody StartJobRequest body,
            HttpServletRequest request
    ) {
        return service.startJob(body, currentUser(request), request.getRemoteAddr());
    }

    private UserContext currentUser(HttpServletRequest request) {
        Object user = request.getAttribute(AuthInterceptor.CURRENT_USER_ATTRIBUTE);
        if (!(user instanceof UserContext context)) {
            throw ApiException.unauthorized("请先登录");
        }
        return context;
    }
}
