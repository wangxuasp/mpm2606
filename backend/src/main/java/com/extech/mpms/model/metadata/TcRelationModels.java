package com.extech.mpms.model.metadata;

import java.util.List;
import java.util.Map;

public final class TcRelationModels {

    private TcRelationModels() {
    }

    public record RelationItem(
            String relationPuid,
            String relationTypePuid,
            String relationTypeName,
            String direction,
            String sourcePuid,
            String sourceName,
            String sourceType,
            String targetPuid,
            String targetName,
            String targetType,
            String storage,
            String sequenceNo,
            String quantity
    ) {
    }

    public record ImpactNode(
            String puid,
            String name,
            String objectType,
            int level
    ) {
    }

    public record ImpactGraph(
            String rootPuid,
            String direction,
            int depth,
            List<ImpactNode> nodes,
            List<RelationItem> edges
    ) {
    }

    public record ObjectSummary(
            String puid,
            long objectCount,
            Map<String, Long> typeCounts,
            Map<String, Long> ownerCounts,
            Map<String, Long> revisionCounts,
            Map<String, Long> statusCounts,
            Map<String, Long> relationCounts
    ) {
    }
}
