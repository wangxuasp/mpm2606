package com.extech.mpms.auth;

import com.extech.mpms.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;

/**
 * 检查演示期间的写入冻结开关。
 * app.write-frozen=true 时，除认证与查询外的写操作一律拒绝，
 * 避免演示过程中数据被意外改动。
 */
public class WriteFrozenInterceptor implements HandlerInterceptor {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");

    private final boolean frozen;

    public WriteFrozenInterceptor(boolean frozen) {
        this.frozen = frozen;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!frozen) {
            return true;
        }
        if (SAFE_METHODS.contains(request.getMethod().toUpperCase())) {
            return true;
        }
        if (request.getRequestURI().startsWith("/api/auth/")) {
            // 登录、退出必须保持可用，否则演示无法开始
            return true;
        }
        throw ApiException.forbidden("当前处于检查演示冻结状态，数据写入已暂停");
    }
}
