package com.extech.mpms.model.mpm;

import java.math.BigDecimal;
import java.util.List;

public final class MpmModels {

    private MpmModels() {
    }

    public record ObjectSummary(
            String puid,
            String code,
            String name,
            String description,
            String objectType,
            String revision,
            String revisionPuid,
            String owner,
            String ownerName,
            String createdAt,
            String modifiedAt
    ) {
    }

    public record CatalogEntry(
            ObjectSummary object,
            String category,
            long childCount
    ) {
    }

    public record Catalog(
            List<CatalogEntry> products,
            List<CatalogEntry> processes,
            List<CatalogEntry> operations
    ) {
    }

    public record TreeNode(
            String id,
            String objectPuid,
            String parentId,
            String code,
            String name,
            String objectType,
            String revision,
            String revisionPuid,
            BigDecimal quantity,
            String sequenceNo,
            int level
    ) {
    }

    public record TreeResponse(
            ObjectSummary root,
            List<TreeNode> nodes
    ) {
    }

    public record Relation(
            String puid,
            String type,
            String direction,
            String targetPuid,
            String targetCode,
            String targetName,
            String targetType
    ) {
    }

    public record Attachment(
            String puid,
            String name,
            String objectType,
            String fileName,
            String format,
            String datasetType
    ) {
    }

    public record NodeDetail(
            ObjectSummary object,
            List<Relation> relations,
            List<Attachment> forms,
            List<Attachment> datasets
    ) {
    }

    public record Page<T>(
            List<T> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }
}
