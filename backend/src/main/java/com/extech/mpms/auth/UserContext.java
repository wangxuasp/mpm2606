package com.extech.mpms.auth;

/**
 * 当前登录用户上下文。只由后端会话产生，前端无法传入。
 */
public record UserContext(
        String puid,
        String userId,
        String displayName,
        String roleCode
) {
    public static final String SESSION_KEY = "MPMS_USER";
}
