package com.extech.mpms.model.organization;

import java.util.List;

public final class OrganizationModels {

    private OrganizationModels() {
    }

    public record OrgUser(
            String puid,
            String userId,
            String displayName,
            int status,
            String statusLabel
    ) {
    }

    public record OrgPerson(
            String puid,
            String name,
            String department,
            String email,
            String phone
    ) {
    }

    public record OrgGroup(
            String puid,
            String name,
            String parentPuid,
            String description
    ) {
    }

    public record OrgMembership(
            String puid,
            String userPuid,
            String userId,
            String userName,
            String groupPuid,
            String groupName,
            String rolePuid,
            String roleName,
            String roleDescription,
            boolean defaultRole,
            int status
    ) {
    }

    public record OrgNode(
            String id,
            String type,
            String label,
            String parentId,
            String userPuid,
            String groupPuid,
            String rolePuid,
            List<OrgNode> children
    ) {
    }

    public record OrgTree(List<OrgNode> roots) {
    }

    public record OrgLinks(
            String homePuid,
            String newstuffPuid,
            String mailboxPuid,
            String worklistPuid
    ) {
    }

    public record OrgUserProfile(
            OrgUser user,
            OrgPerson person,
            String defaultGroupName,
            String lastLoginAt,
            List<OrgMembership> memberships,
            OrgLinks links
    ) {
    }
}
