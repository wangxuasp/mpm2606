package com.extech.mpms.repository;

import com.extech.mpms.model.organization.OrganizationModels.OrgGroup;
import com.extech.mpms.model.organization.OrganizationModels.OrgMembership;
import com.extech.mpms.model.organization.OrganizationModels.OrgPerson;
import com.extech.mpms.model.organization.OrganizationModels.OrgUser;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Repository
public class OrganizationRepository {

    private final JdbcTemplate jdbcTemplate;

    public OrganizationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<OrgGroup> listGroups() {
        String sql = """
                SELECT g.puid,
                       COALESCE(pg.pname, g.pdescription, g.porganization_name, g.puid) AS group_name,
                       parent.puid AS parent_puid,
                       g.pdescription
                FROM pgroup g
                LEFT JOIN ppom_group pg ON pg.puid = g.puid
                LEFT JOIN ppom_group parent
                       ON pg.rparentu IS NOT NULL
                      AND pg.rparentu <> 'AAAAAAAAAAAAAA'
                      AND pg.rparentu LIKE parent.puid || '%'
                      AND parent.puid <> pg.puid
                ORDER BY group_name, g.puid
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new OrgGroup(
                rs.getString("puid"),
                rs.getString("group_name"),
                rs.getString("parent_puid"),
                rs.getString("pdescription")
        ));
    }

    public List<OrgMembership> listMemberships() {
        return listMemberships(null);
    }

    public List<OrgMembership> listMembershipsForUser(String userPuid) {
        return listMemberships(userPuid);
    }

    private List<OrgMembership> listMemberships(String userPuid) {
        String sql = """
                SELECT m.puid,
                       u.puid AS user_puid,
                       u.puser_id,
                       COALESCE(u.puser_name, u.puser_id) AS user_name,
                       g.puid AS group_puid,
                       COALESCE(pg.pname, g.pdescription, g.porganization_name, g.puid) AS group_name,
                       r.puid AS role_puid,
                       COALESCE(r.prole_name, '成员') AS role_name,
                       COALESCE(r.pdescription, '') AS role_description,
                       COALESCE(gm.pdefault_role, 0) AS default_role,
                       COALESCE(gm.pstatus, 0) AS member_status
                FROM ppom_member m
                JOIN ppom_user u ON u.puid = m.ruseru
                JOIN pgroup g ON g.puid = m.rgroupu
                LEFT JOIN ppom_group pg ON pg.puid = g.puid
                LEFT JOIN pgroupmember gm ON gm.puid = m.puid
                LEFT JOIN prole r ON r.puid = gm.rroleu
                WHERE (? IS NULL OR u.puid = ?)
                ORDER BY group_name, role_name, u.puser_id
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new OrgMembership(
                rs.getString("puid"),
                rs.getString("user_puid"),
                rs.getString("puser_id"),
                rs.getString("user_name"),
                rs.getString("group_puid"),
                rs.getString("group_name"),
                rs.getString("role_puid"),
                rs.getString("role_name"),
                rs.getString("role_description"),
                toBoolean(rs.getObject("default_role")),
                toInteger(rs.getObject("member_status"))
        ), userPuid, userPuid);
    }

    public Optional<OrgUser> findUser(String userPuid) {
        String sql = """
                SELECT puid,
                       puser_id,
                       COALESCE(puser_name, puser_id) AS display_name,
                       COALESCE(pstatus, 0) AS user_status
                FROM ppom_user
                WHERE puid = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new OrgUser(
                rs.getString("puid"),
                rs.getString("puser_id"),
                rs.getString("display_name"),
                toInteger(rs.getObject("user_status")),
                toInteger(rs.getObject("user_status")) == 0 ? "活动的" : "已停用"
        ), userPuid).stream().findFirst();
    }

    public Optional<OrgPerson> findPerson(String userPuid) {
        String sql = """
                SELECT per.puid,
                       per.puser_name,
                       per.ppa6 AS department,
                       per.ppa9 AS email,
                       per.ppa10 AS phone
                FROM puser u
                LEFT JOIN pperson per ON per.puid = u.rpersonu
                WHERE u.puid = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new OrgPerson(
                rs.getString("puid"),
                rs.getString("puser_name"),
                rs.getString("department"),
                rs.getString("email"),
                rs.getString("phone")
        ), userPuid).stream().findFirst();
    }

    public Optional<String> findDefaultGroupName(String userPuid) {
        String sql = """
                SELECT COALESCE(g.pname, g.puid)
                FROM ppom_user u
                LEFT JOIN ppom_group g
                       ON u.pdefault_group IS NOT NULL
                      AND u.pdefault_group LIKE g.puid || '%'
                WHERE u.puid = ?
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> rs.getString(1), userPuid)
                .stream()
                .filter(value -> value != null && !value.isBlank())
                .findFirst();
    }

    public Optional<String> findLastLogin(String userPuid) {
        String sql = "SELECT last_login_at FROM local_user_auth WHERE user_puid = ?";
        return jdbcTemplate.query(sql, (rs, rowNum) -> normalize(rs.getTimestamp(1)), userPuid)
                .stream()
                .filter(value -> value != null && !value.isBlank())
                .findFirst();
    }

    private static boolean toBoolean(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Number number) {
            return number.intValue() != 0;
        }
        return "true".equalsIgnoreCase(String.valueOf(value));
    }

    private static int toInteger(Object value) {
        if (value == null) {
            return 0;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private static String normalize(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime().toString();
    }
}
