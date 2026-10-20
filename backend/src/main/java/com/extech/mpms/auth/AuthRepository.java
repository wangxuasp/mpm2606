package com.extech.mpms.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class AuthRepository {

    private final JdbcTemplate jdbcTemplate;

    public AuthRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<AuthRow> findByUserId(String userId) {
        String sql = """
                SELECT a.user_puid,
                       a.puser_id,
                       a.password_hash,
                       a.role_code,
                       a.is_enabled,
                       a.failed_attempts,
                       a.locked_until,
                       u.pstatus,
                       COALESCE(u.puser_name, a.puser_id) AS display_name,
                       per.puser_name AS person_name,
                       per.ppa6 AS department,
                       per.ppa9 AS email
                FROM local_user_auth a
                LEFT JOIN ppom_user u ON u.puid = a.user_puid
                LEFT JOIN puser pu ON pu.puid = a.user_puid
                LEFT JOIN pperson per ON per.puid = pu.rpersonu
                WHERE LOWER(a.puser_id) = LOWER(?)
                """;
        List<AuthRow> rows = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new AuthRow(
                        rs.getString("user_puid"),
                        rs.getString("puser_id"),
                        rs.getString("password_hash"),
                        rs.getString("role_code"),
                        rs.getBoolean("is_enabled"),
                        rs.getInt("failed_attempts"),
                        toLocalDateTime(rs.getTimestamp("locked_until")),
                        toInteger(rs.getObject("pstatus")),
                        firstNonBlank(rs.getString("person_name"), rs.getString("display_name")),
                        rs.getString("department"),
                        rs.getString("email")
                ),
                userId
        );
        return rows.stream().findFirst();
    }

    public void recordSuccess(String userPuid) {
        jdbcTemplate.update("""
                UPDATE local_user_auth
                SET failed_attempts = 0, locked_until = NULL,
                    last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE user_puid = ?
                """, userPuid);
    }

    public void recordFailure(String userPuid, int failedAttempts, LocalDateTime lockedUntil) {
        jdbcTemplate.update("""
                UPDATE local_user_auth
                SET failed_attempts = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_puid = ?
                """, failedAttempts, lockedUntil == null ? null : Timestamp.valueOf(lockedUntil), userPuid);
    }

    public void writeAudit(
            String userPuid,
            String userId,
            String actionType,
            String targetResource,
            String targetPuid,
            String clientIp,
            String detail
    ) {
        jdbcTemplate.update("""
                INSERT INTO local_audit_log
                    (user_puid, puser_id, action_type, target_resource, target_puid, client_ip, detail_message)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, userPuid, userId, actionType, targetResource, targetPuid, clientIp, truncate(detail, 1000));
    }

    private static String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        return second;
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    /**
     * 金仓的 numeric 列通过 JDBC 返回 BigDecimal，不能直接强转 Integer。
     */
    private static Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.valueOf(String.valueOf(value).trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    public record AuthRow(
            String userPuid,
            String userId,
            String passwordHash,
            String roleCode,
            boolean enabled,
            int failedAttempts,
            LocalDateTime lockedUntil,
            Integer teamcenterStatus,
            String displayName,
            String department,
            String email
    ) {
    }
}
