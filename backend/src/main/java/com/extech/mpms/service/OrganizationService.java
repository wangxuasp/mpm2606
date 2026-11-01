package com.extech.mpms.service;

import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.organization.OrganizationModels.OrgGroup;
import com.extech.mpms.model.organization.OrganizationModels.OrgLinks;
import com.extech.mpms.model.organization.OrganizationModels.OrgMembership;
import com.extech.mpms.model.organization.OrganizationModels.OrgNode;
import com.extech.mpms.model.organization.OrganizationModels.OrgPerson;
import com.extech.mpms.model.organization.OrganizationModels.OrgTree;
import com.extech.mpms.model.organization.OrganizationModels.OrgUser;
import com.extech.mpms.model.organization.OrganizationModels.OrgUserProfile;
import com.extech.mpms.repository.OrganizationRepository;
import com.extech.mpms.repository.WorkspaceRepository;
import com.extech.mpms.repository.WorkspaceRepository.ContainerPuids;
import com.extech.mpms.repository.WorkspaceRepository.TaskInboxRow;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class OrganizationService {

    private final OrganizationRepository repository;
    private final WorkspaceRepository workspaceRepository;

    public OrganizationService(
            OrganizationRepository repository,
            WorkspaceRepository workspaceRepository
    ) {
        this.repository = repository;
        this.workspaceRepository = workspaceRepository;
    }

    public OrgTree tree() {
        List<OrgGroup> groups = repository.listGroups();
        List<OrgMembership> memberships = repository.listMemberships();

        Map<String, List<OrgMembership>> membersByGroup = new LinkedHashMap<>();
        for (OrgMembership membership : memberships) {
            membersByGroup.computeIfAbsent(membership.groupPuid(), key -> new ArrayList<>())
                    .add(membership);
        }

        Map<String, List<OrgGroup>> childrenByParent = new LinkedHashMap<>();
        for (OrgGroup group : groups) {
            if (group.parentPuid() != null) {
                childrenByParent.computeIfAbsent(group.parentPuid(), key -> new ArrayList<>())
                        .add(group);
            }
        }

        List<OrgNode> roots = new ArrayList<>();
        for (OrgGroup group : groups) {
            if (group.parentPuid() == null) {
                roots.add(groupNode(group, childrenByParent, membersByGroup));
            }
        }
        return new OrgTree(List.of(
                new OrgNode("ORG_ROOT", "root", "组织", null, null, null, null, roots)
        ));
    }

    public OrgUserProfile profile(String userPuid) {
        OrgUser user = repository.findUser(userPuid)
                .orElseThrow(() -> ApiException.notFound("用户不存在: " + userPuid));
        OrgPerson person = repository.findPerson(userPuid)
                .orElse(new OrgPerson(null, user.displayName(), null, null, null));
        ContainerPuids containers = workspaceRepository.findContainers(userPuid)
                .orElse(new ContainerPuids(null, null, null));
        String worklistPuid = workspaceRepository.findTaskInbox(userPuid)
                .map(TaskInboxRow::puid)
                .orElse(null);

        return new OrgUserProfile(
                user,
                person,
                repository.findDefaultGroupName(userPuid).orElse(null),
                repository.findLastLogin(userPuid).orElse(null),
                repository.listMembershipsForUser(userPuid),
                new OrgLinks(
                        containers.home(),
                        containers.newstuff(),
                        containers.mailbox(),
                        worklistPuid
                )
        );
    }

    public void requireUser(String userPuid) {
        repository.findUser(userPuid)
                .orElseThrow(() -> ApiException.notFound("用户不存在: " + userPuid));
    }

    private OrgNode groupNode(
            OrgGroup group,
            Map<String, List<OrgGroup>> childrenByParent,
            Map<String, List<OrgMembership>> membersByGroup
    ) {
        List<OrgNode> children = new ArrayList<>();

        for (OrgGroup child : childrenByParent.getOrDefault(group.puid(), List.of())) {
            children.add(groupNode(child, childrenByParent, membersByGroup));
        }

        Map<String, List<OrgMembership>> byRole = new LinkedHashMap<>();
        for (OrgMembership membership : membersByGroup.getOrDefault(group.puid(), List.of())) {
            byRole.computeIfAbsent(membership.rolePuid(), key -> new ArrayList<>())
                    .add(membership);
        }

        for (Map.Entry<String, List<OrgMembership>> entry : byRole.entrySet()) {
            List<OrgMembership> roleMembers = entry.getValue();
            OrgMembership first = roleMembers.get(0);
            List<OrgNode> users = roleMembers.stream()
                    .map(membership -> new OrgNode(
                            "USER:" + membership.userPuid() + ":" + group.puid() + ":" + entry.getKey(),
                            "user",
                            membership.userName() + " (" + membership.userId() + ")",
                            null,
                            membership.userPuid(),
                            group.puid(),
                            entry.getKey(),
                            List.of()
                    ))
                    .toList();
            children.add(new OrgNode(
                    "ROLE:" + group.puid() + ":" + entry.getKey(),
                    "role",
                    first.roleName(),
                    group.puid(),
                    null,
                    group.puid(),
                    entry.getKey(),
                    users
            ));
        }

        return new OrgNode(
                "GROUP:" + group.puid(),
                "group",
                group.name(),
                group.parentPuid(),
                null,
                group.puid(),
                null,
                children
        );
    }
}
