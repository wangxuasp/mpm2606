package com.extech.mpms.service;

import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.mpm.MpmModels.Attachment;
import com.extech.mpms.model.mpm.MpmModels.Catalog;
import com.extech.mpms.model.mpm.MpmModels.CatalogEntry;
import com.extech.mpms.model.mpm.MpmModels.NodeDetail;
import com.extech.mpms.model.mpm.MpmModels.ObjectSummary;
import com.extech.mpms.model.mpm.MpmModels.Page;
import com.extech.mpms.model.mpm.MpmModels.Relation;
import com.extech.mpms.model.mpm.MpmModels.TreeNode;
import com.extech.mpms.model.mpm.MpmModels.TreeResponse;
import com.extech.mpms.repository.MpmReadRepository;
import com.extech.mpms.repository.MpmReadRepository.OccurrenceRow;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class MpmReadService {

    private static final int MAX_PAGE_SIZE = 200;
    private static final int MAX_TREE_DEPTH = 30;

    private final MpmReadRepository repository;

    public MpmReadService(MpmReadRepository repository) {
        this.repository = repository;
    }

    public Page<ObjectSummary> listItems(
            int page,
            int size,
            String keyword,
            String objectType
    ) {
        validatePage(page, size);
        long total = repository.countItems(keyword, objectType);
        int totalPages = total == 0 ? 0 : (int) ((total + size - 1) / size);
        List<ObjectSummary> content = repository.listItems(keyword, objectType, page, size);
        return new Page<>(content, page, size, total, totalPages);
    }

    public List<String> listObjectTypes() {
        return repository.listObjectTypes();
    }

    public Catalog getCatalog() {
        List<CatalogEntry> products = new ArrayList<>();
        List<CatalogEntry> processes = new ArrayList<>();
        List<CatalogEntry> operations = new ArrayList<>();

        for (CatalogEntry entry : repository.findCatalogEntries()) {
            switch (entry.category()) {
                case "process" -> processes.add(entry);
                case "operation" -> operations.add(entry);
                default -> products.add(entry);
            }
        }
        return new Catalog(products, processes, operations);
    }

    public TreeResponse getTree(String requestedPuid) {
        String rootPuid = resolveItemPuid(requestedPuid);
        ObjectSummary root = repository.findItemSummary(rootPuid)
                .orElseThrow(() -> ApiException.notFound("对象不存在或没有对应零组件: " + requestedPuid));

        Map<String, List<OccurrenceRow>> childrenByParent = new HashMap<>();
        for (OccurrenceRow occurrence : repository.findOccurrences()) {
            childrenByParent.computeIfAbsent(occurrence.parentItemPuid(), ignored -> new ArrayList<>())
                    .add(occurrence);
        }

        List<TreeNode> nodes = new ArrayList<>();
        Set<String> ancestors = new HashSet<>();
        ancestors.add(rootPuid);
        appendChildren(rootPuid, rootPuid, 1, ancestors, childrenByParent, nodes);
        return new TreeResponse(root, nodes);
    }

    public NodeDetail getNode(String requestedPuid) {
        String itemPuid = resolveItemPuid(requestedPuid);
        ObjectSummary object = repository.findItemSummary(itemPuid)
                .orElseThrow(() -> ApiException.notFound("对象不存在: " + requestedPuid));

        List<Relation> relations = repository.findRelations(itemPuid, object.revisionPuid());
        Set<String> targetPuids = new LinkedHashSet<>();
        for (Relation relation : relations) {
            if (relation.targetPuid() != null && !relation.targetPuid().isBlank()) {
                targetPuids.add(relation.targetPuid());
            }
        }

        List<Attachment> forms = repository.findForms(targetPuids);
        List<Attachment> datasets = repository.findDatasets(targetPuids);
        return new NodeDetail(object, relations, forms, datasets);
    }

    private void appendChildren(
            String parentItemPuid,
            String parentNodeId,
            int level,
            Set<String> ancestors,
            Map<String, List<OccurrenceRow>> childrenByParent,
            List<TreeNode> result
    ) {
        if (level > MAX_TREE_DEPTH) {
            return;
        }
        List<OccurrenceRow> children = childrenByParent.get(parentItemPuid);
        if (children == null || children.isEmpty()) {
            return;
        }

        for (OccurrenceRow child : children) {
            result.add(new TreeNode(
                    child.occurrencePuid(),
                    child.childPuid(),
                    parentNodeId,
                    child.childCode(),
                    child.childName(),
                    child.childObjectType(),
                    child.childRevision(),
                    child.childRevisionPuid(),
                    child.quantity(),
                    child.sequenceNo(),
                    level
            ));

            String childItemPuid = child.childItemPuid();
            if (childItemPuid == null || childItemPuid.isBlank() || ancestors.contains(childItemPuid)) {
                continue;
            }
            Set<String> nextAncestors = new HashSet<>(ancestors);
            nextAncestors.add(childItemPuid);
            appendChildren(
                    childItemPuid,
                    child.occurrencePuid(),
                    level + 1,
                    nextAncestors,
                    childrenByParent,
                    result
            );
        }
    }

    private String resolveItemPuid(String requestedPuid) {
        if (requestedPuid == null || requestedPuid.isBlank()) {
            throw ApiException.badRequest("对象 PUID 不能为空");
        }
        return repository.findItemPuidForObject(requestedPuid.trim())
                .orElseThrow(() -> ApiException.notFound("对象不存在: " + requestedPuid));
    }

    private void validatePage(int page, int size) {
        if (page < 0) {
            throw ApiException.badRequest("页码不能小于 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw ApiException.badRequest("每页记录数必须在 1 到 " + MAX_PAGE_SIZE + " 之间");
        }
    }
}
