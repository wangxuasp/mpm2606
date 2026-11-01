package com.extech.mpms.auth;

import com.extech.mpms.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 保护需要登录的接口。当前用户只从服务端会话读取，前端无法通过参数伪造身份。
 */
public class AuthInterceptor implements HandlerInterceptor {

    public static final String CURRENT_USER_ATTRIBUTE = "MPMS_CURRENT_USER";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        HttpSession session = request.getSession(false);
        Object user = session == null ? null : session.getAttribute(UserContext.SESSION_KEY);
        if (!(user instanceof UserContext context)) {
            throw ApiException.unauthorized("请先登录");
        }
        request.setAttribute(CURRENT_USER_ATTRIBUTE, context);
        return true;
    }
}
