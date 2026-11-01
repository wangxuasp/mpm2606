package com.extech.mpms.auth;

import com.extech.mpms.auth.AuthRepository.AuthRow;
import com.extech.mpms.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    private final AuthRepository repository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(AuthRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * 校验 Teamcenter 同步过来的 bcrypt 哈希。
     * 哈希由 PPOM_USER.PNEWPASSWORD 原样导入，$2a$07$ 的成本因子由算法自身解析。
     */
    public UserProfile login(String userId, String rawPassword, String clientIp) {
        if (userId == null || userId.isBlank() || rawPassword == null || rawPassword.isEmpty()) {
            throw ApiException.badRequest("请输入账号和密码");
        }
        String normalizedUserId = userId.trim();
        AuthRow row = repository.findByUserId(normalizedUserId)
                .orElseThrow(() -> {
                    repository.writeAudit(null, normalizedUserId, "LOGIN_FAILED", "auth", null, clientIp,
                            "账号不存在");
                    return ApiException.unauthorized("账号或密码错误");
                });

        if (!row.enabled() || (row.teamcenterStatus() != null && row.teamcenterStatus() != 0)) {
            repository.writeAudit(row.userPuid(), row.userId(), "LOGIN_REJECTED_DISABLED", "auth",
                    row.userPuid(), clientIp, "账号在 Teamcenter 或平台侧已停用");
            throw ApiException.forbidden("该账号已停用，请联系管理员");
        }

        LocalDateTime now = LocalDateTime.now();
        if (row.lockedUntil() != null && row.lockedUntil().isAfter(now)) {
            repository.writeAudit(row.userPuid(), row.userId(), "LOGIN_REJECTED_LOCKED", "auth",
                    row.userPuid(), clientIp, "账号处于锁定期");
            throw ApiException.forbidden("账号已锁定，请在 "
                    + row.lockedUntil().toLocalTime().withNano(0) + " 后重试");
        }

        if (!passwordEncoder.matches(rawPassword, row.passwordHash())) {
            int attempts = row.failedAttempts() + 1;
            LocalDateTime lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? now.plus(LOCK_DURATION) : null;
            repository.recordFailure(row.userPuid(), attempts, lockedUntil);
            repository.writeAudit(
                    row.userPuid(),
                    row.userId(),
                    lockedUntil == null ? "LOGIN_FAILED" : "ACCOUNT_LOCKED",
                    "auth",
                    row.userPuid(),
                    clientIp,
                    "密码错误，累计 " + attempts + " 次"
            );
            if (lockedUntil != null) {
                throw ApiException.forbidden("密码连续错误 " + MAX_FAILED_ATTEMPTS + " 次，账号已锁定 "
                        + LOCK_DURATION.toMinutes() + " 分钟");
            }
            throw ApiException.unauthorized("账号或密码错误");
        }

        repository.recordSuccess(row.userPuid());
        repository.writeAudit(row.userPuid(), row.userId(), "LOGIN_SUCCESS", "auth",
                row.userPuid(), clientIp, "登录成功");
        log.info("user {} logged in from {}", row.userId(), clientIp);

        return new UserProfile(
                row.userPuid(),
                row.userId(),
                row.displayName(),
                row.roleCode(),
                row.department(),
                row.email()
        );
    }

    public void logout(UserContext user, String clientIp) {
        if (user == null) {
            return;
        }
        repository.writeAudit(user.puid(), user.userId(), "LOGOUT", "auth", user.puid(), clientIp, "退出登录");
    }

    public UserProfile profile(UserContext user) {
        if (user == null) {
            throw ApiException.unauthorized("请先登录");
        }
        AuthRow row = repository.findByUserId(user.userId())
                .orElseThrow(() -> ApiException.unauthorized("账号不存在或已移除"));
        return new UserProfile(
                row.userPuid(),
                row.userId(),
                row.displayName(),
                row.roleCode(),
                row.department(),
                row.email()
        );
    }

    public void recordAccessDenied(UserContext user, String resource, String targetPuid, String clientIp) {
        repository.writeAudit(
                user == null ? null : user.puid(),
                user == null ? null : user.userId(),
                "ACCESS_DENIED",
                resource,
                targetPuid,
                clientIp,
                "越权访问被拦截"
        );
    }

    public record UserProfile(
            String puid,
            String userId,
            String displayName,
            String roleCode,
            String department,
            String email
    ) {
    }
}
