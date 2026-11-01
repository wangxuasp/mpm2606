package com.extech.mpms.model.mpm;

import java.math.BigDecimal;
import java.util.List;

public final class MpmWriteModels {

    private MpmWriteModels() {
    }

    /** 可挂载到结构树下的候选对象。 */
    public record Candidate(
            String puid,
            String code,
            String name,
            String objectType,
            String revision,
            String category
    ) {
    }

    public record CandidatePage(List<Candidate> content, long total) {
    }

    public record AddOccurrenceRequest(
            String parentPuid,
            String childPuid,
            BigDecimal quantity,
            String sequence
    ) {
    }

    public record OccurrenceResult(
            String puid,
            String parentPuid,
            String childPuid,
            String sequence,
            String message
    ) {
    }

    public record OccurrenceUpdateRequest(
            BigDecimal quantity,
            String sequence
    ) {
    }

    /**
     * 新建对象并挂载。objectType 支持 Part / Item / MEProcess / MEOP，
     * 其余类型会被后端拒绝。
     */
    public record CreateAndMountRequest(
            String parentPuid,
            String objectType,
            String itemId,
            String name,
            String description,
            String revision,
            BigDecimal quantity,
            String sequence
    ) {
    }

    public record CreateAndMountResult(
            String itemPuid,
            String revisionPuid,
            String occurrencePuid,
            String parentPuid,
            String objectType,
            String itemId,
            String name,
            String sequence,
            String message
    ) {
    }

    /**
     * 整棵子树递归克隆。支持的零组件类型会创建新对象，
     * 不支持的类型沿用原对象挂载（仅复制结构）。
     */
    public record CloneSubtreeRequest(
            String sourcePuid,
            String targetPuid,
            String itemIdSuffix
    ) {
    }

    public record CloneSubtreeEntry(
            String sourcePuid,
            String objectPuid,
            String occurrencePuid,
            String code,
            String name,
            String objectType,
            String sequence,
            boolean objectCreated
    ) {
    }

    public record CloneSubtreeResult(
            String sourcePuid,
            String targetPuid,
            int createdObjects,
            int createdOccurrences,
            List<CloneSubtreeEntry> entries,
            String message
    ) {
    }

    public record ResequenceResult(
            String parentBvrPuid,
            int updated,
            String message
    ) {
    }

    public record AccountabilityEntry(
            String childPuid,
            String code,
            String name,
            BigDecimal sourceQty,
            BigDecimal targetQty,
            String status
    ) {
    }

    public record AccountabilityReport(
            String sourceRootPuid,
            String targetRootPuid,
            List<AccountabilityEntry> entries
    ) {
    }

    /** 结构行的父视图信息。 */
    public record ParentView(String viewPuid, String bvrPuid, long parentBvrClass) {
    }

    /** 与某个对象关联的父项（产品结构或工艺路线）。 */
    public record Association(
            String parentPuid,
            String parentCode,
            String parentName,
            String parentType,
            String viewName,
            String category
    ) {
    }
}
