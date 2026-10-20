package com.extech.mpms.service;

import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.metadata.TcRelationModels.ImpactGraph;
import com.extech.mpms.model.metadata.TcRelationModels.ImpactNode;
import com.extech.mpms.model.metadata.TcRelationModels.ObjectSummary;
import com.extech.mpms.model.metadata.TcRelationModels.RelationItem;
import com.extech.mpms.repository.TcMetadataRepository;
import com.extech.mpms.repository.TcMetadataRepository.ObjectIdentityRow;
import com.extech.mpms.repository.TcRelationRepository;
import com.extech.mpms.repository.TcRelationRepository.ObjectSummaryRow;
import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class TcImpactService {

    private static final int MAX_DEPTH = 5;
    private static final int MAX_NODES = 500;

    private final TcRelationRepository relationRepository;
    private final TcMetadataRepository metadataRepository;

    public TcImpactService(
            TcRelationRepository relationRepository,
            TcMetadataRepository metadataRepository
    ) {
        this.relationRepository = relationRepository;
        this.metadataRepository = metadataRepository;
    }

    public ImpactGraph impact(String puid, String requestedDirection, int requestedDepth) {
        String rootPuid = requirePuid(puid);
        String direction = normalizeDirection(requestedDirection);
        int depth = Math.min(Math.max(requestedDepth, 1), MAX_DEPTH);

        Map<String, ImpactNode> nodes = new LinkedHashMap<>();
        List<RelationItem> edges = new ArrayList<>();
        Set<String> visited = new LinkedHashSet<>();
        ArrayDeque<Frontier> queue = new ArrayDeque<>();

        nodes.put(rootPuid, identityNode(rootPuid, 0));
        visited.add(rootPuid);
        queue.add(new Frontier(rootPuid, 0));

        while (!queue.isEmpty() && nodes.size() < MAX_NODES) {
            Frontier current = queue.removeFirst();
            if (current.level() >= depth) {
                continue;
            }
            for (RelationItem relation : relationRepository.listRelations(current.puid(), direction)) {
                String otherPuid = "in".equals(relation.direction())
                        ? relation.sourcePuid()
                        : relation.targetPuid();
                if (otherPuid == null || otherPuid.isBlank()) {
                    continue;
                }
                edges.add(relation);
                if (visited.add(otherPuid)) {
                    nodes.put(otherPuid, identityNode(otherPuid, current.level() + 1));
                    queue.add(new Frontier(otherPuid, current.level() + 1));
                    if (nodes.size() >= MAX_NODES) {
                        break;
                    }
                }
            }
        }

        return new ImpactGraph(
                rootPuid,
                direction,
                depth,
                List.copyOf(nodes.values()),
                List.copyOf(edges)
        );
    }

    public ObjectSummary summary(String puid, int requestedDepth) {
        ImpactGraph graph = impact(puid, "both", requestedDepth);
        List<String> puids = graph.nodes().stream().map(ImpactNode::puid).toList();
        List<ObjectSummaryRow> rows = relationRepository.summarize(puids);

        Map<String, Long> typeCounts = new LinkedHashMap<>();
        Map<String, Long> ownerCounts = new LinkedHashMap<>();
        Map<String, Long> revisionCounts = new LinkedHashMap<>();
        Map<String, Long> statusCounts = new LinkedHashMap<>();
        Map<String, Long> relationCounts = new LinkedHashMap<>();

        for (ObjectSummaryRow row : rows) {
            increment(typeCounts, blank(row.objectType(), "未知类型"));
            increment(ownerCounts, blank(row.ownerName(), "未指定"));
            increment(revisionCounts, blank(row.revision(), "无版本"));
            increment(statusCounts, row.released() ? "TCM Released" : "未发布");
        }
        for (RelationItem edge : graph.edges()) {
            increment(relationCounts, blank(edge.relationTypeName(), edge.relationTypePuid()));
        }
        return new ObjectSummary(
                graph.rootPuid(),
                rows.size(),
                typeCounts,
                ownerCounts,
                revisionCounts,
                statusCounts,
                relationCounts
        );
    }

    private ImpactNode identityNode(String puid, int level) {
        ObjectIdentityRow row = metadataRepository.findObjectIdentity(puid).orElse(null);
        if (row == null) {
            return new ImpactNode(puid, puid, "", level);
        }
        return new ImpactNode(
                row.puid(),
                row.objectName() == null || row.objectName().isBlank() ? row.puid() : row.objectName(),
                row.objectType(),
                level
        );
    }

    private static void increment(Map<String, Long> counts, String key) {
        counts.merge(key, 1L, Long::sum);
    }

    private static String blank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String requirePuid(String puid) {
        if (puid == null || puid.isBlank()) {
            throw ApiException.badRequest("对象 PUID 不能为空");
        }
        return puid.trim();
    }

    private static String normalizeDirection(String requestedDirection) {
        String direction = requestedDirection == null
                ? "both"
                : requestedDirection.trim().toLowerCase(Locale.ROOT);
        if (!List.of("in", "out", "both").contains(direction)) {
            throw ApiException.badRequest("direction 只能是 in、out 或 both");
        }
        return direction;
    }

    private record Frontier(String puid, int level) {
    }
}
