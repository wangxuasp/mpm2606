package com.extech.mpms.controller;

import com.extech.mpms.auth.AuthInterceptor;
import com.extech.mpms.auth.UserContext;
import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.workspace.WorkspaceModels.FolderItem;
import com.extech.mpms.model.workspace.WorkspaceModels.MailItem;
import com.extech.mpms.model.workspace.WorkspaceModels.WorkspaceSummary;
import com.extech.mpms.model.workspace.WorkspaceModels.Worklist;
import com.extech.mpms.service.WorkspaceService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 个人工作区接口。当前用户一律取自服务端会话，绝不接受前端传入的 userPuid。
 */
@RestController
@RequestMapping("/api/workspace")
public class WorkspaceController {

    private final WorkspaceService service;

    public WorkspaceController(WorkspaceService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public WorkspaceSummary summary(HttpServletRequest request) {
        return service.summary(currentUser(request).puid());
    }

    @GetMapping("/folders/{type}")
    public List<FolderItem> folders(@PathVariable String type, HttpServletRequest request) {
        return service.folders(currentUser(request).puid(), type);
    }

    @GetMapping("/mailbox")
    public List<MailItem> mailbox(HttpServletRequest request) {
        return service.mailbox(currentUser(request).puid());
    }

    @GetMapping("/worklist")
    public Worklist worklist(HttpServletRequest request) {
        return service.worklist(currentUser(request).puid());
    }

    private UserContext currentUser(HttpServletRequest request) {
        Object user = request.getAttribute(AuthInterceptor.CURRENT_USER_ATTRIBUTE);
        if (!(user instanceof UserContext context)) {
            throw ApiException.unauthorized("请先登录");
        }
        return context;
    }
}
