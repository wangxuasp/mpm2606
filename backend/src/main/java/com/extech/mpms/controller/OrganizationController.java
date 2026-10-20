package com.extech.mpms.controller;

import com.extech.mpms.auth.AuthInterceptor;
import com.extech.mpms.auth.AuthRepository;
import com.extech.mpms.auth.UserContext;
import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.organization.OrganizationModels.OrgTree;
import com.extech.mpms.model.organization.OrganizationModels.OrgUserProfile;
import com.extech.mpms.model.workspace.WorkspaceModels.FolderItem;
import com.extech.mpms.model.workspace.WorkspaceModels.MailItem;
import com.extech.mpms.model.workspace.WorkspaceModels.WorkspaceSummary;
import com.extech.mpms.model.workspace.WorkspaceModels.Worklist;
import com.extech.mpms.service.OrganizationService;
import com.extech.mpms.service.WorkspaceService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/org")
public class OrganizationController {

    private final OrganizationService service;
    private final WorkspaceService workspaceService;
    private final AuthRepository authRepository;

    public OrganizationController(
            OrganizationService service,
            WorkspaceService workspaceService,
            AuthRepository authRepository
    ) {
        this.service = service;
        this.workspaceService = workspaceService;
        this.authRepository = authRepository;
    }

    @GetMapping("/tree")
    public OrgTree tree() {
        return service.tree();
    }

    @GetMapping("/users/{userPuid}/profile")
    public OrgUserProfile profile(@PathVariable String userPuid, HttpServletRequest request) {
        audit(request, userPuid, "profile");
        return service.profile(userPuid);
    }

    @GetMapping("/users/{userPuid}/workspace/summary")
    public WorkspaceSummary workspaceSummary(
            @PathVariable String userPuid,
            HttpServletRequest request
    ) {
        audit(request, userPuid, "summary");
        service.requireUser(userPuid);
        return workspaceService.summary(userPuid);
    }

    @GetMapping("/users/{userPuid}/workspace/folders/{type}")
    public List<FolderItem> workspaceFolders(
            @PathVariable String userPuid,
            @PathVariable String type,
            HttpServletRequest request
    ) {
        audit(request, userPuid, "folders/" + type);
        service.requireUser(userPuid);
        return workspaceService.folders(userPuid, type);
    }

    @GetMapping("/users/{userPuid}/workspace/mailbox")
    public List<MailItem> workspaceMailbox(
            @PathVariable String userPuid,
            HttpServletRequest request
    ) {
        audit(request, userPuid, "mailbox");
        service.requireUser(userPuid);
        return workspaceService.mailbox(userPuid);
    }

    @GetMapping("/users/{userPuid}/workspace/worklist")
    public Worklist workspaceWorklist(
            @PathVariable String userPuid,
            HttpServletRequest request
    ) {
        audit(request, userPuid, "worklist");
        service.requireUser(userPuid);
        return workspaceService.worklist(userPuid);
    }

    private void audit(HttpServletRequest request, String targetUserPuid, String resource) {
        UserContext current = currentUser(request);
        authRepository.writeAudit(
                current.puid(),
                current.userId(),
                "ORG_BROWSE_WORKSPACE",
                "org:" + resource,
                targetUserPuid,
                request.getRemoteAddr(),
                "通过组织结构图只读查看目标用户工作区"
        );
    }

    private UserContext currentUser(HttpServletRequest request) {
        Object user = request.getAttribute(AuthInterceptor.CURRENT_USER_ATTRIBUTE);
        if (!(user instanceof UserContext context)) {
            throw ApiException.unauthorized("请先登录");
        }
        return context;
    }
}
