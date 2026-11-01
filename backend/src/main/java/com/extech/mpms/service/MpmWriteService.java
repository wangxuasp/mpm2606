package com.extech.mpms.service;

import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.mpm.MpmWriteModels.AddOccurrenceRequest;
import com.extech.mpms.model.mpm.MpmWriteModels.AccountabilityEntry;
import com.extech.mpms.model.mpm.MpmWriteModels.AccountabilityReport;
import com.extech.mpms.model.mpm.MpmWriteModels.Association;
import com.extech.mpms.model.mpm.MpmWriteModels.Candidate;
import com.extech.mpms.model.mpm.MpmWriteModels.CandidatePage;
import com.extech.mpms.model.mpm.MpmWriteModels.CloneSubtreeEntry;
import com.extech.mpms.model.mpm.MpmWriteModels.CloneSubtreeRequest;
import com.extech.mpms.model.mpm.MpmWriteModels.CloneSubtreeResult;
import com.extech.mpms.model.mpm.MpmWriteModels.CreateAndMountRequest;
import com.extech.mpms.model.mpm.MpmWriteModels.CreateAndMountResult;
import com.extech.mpms.model.mpm.MpmWriteModels.OccurrenceResult;
import com.extech.mpms.model.mpm.MpmWriteModels.OccurrenceUpdateRequest;
import com.extech.mpms.model.mpm.MpmWriteModels.ParentView;
import com.extech.mpms.model.mpm.MpmWriteModels.ResequenceResult;
import com.extech.mpms.repository.MpmReadRepository;
import com.extech.mpms.repository.MpmReadRepository.OccurrenceRow;
import com.extech.mpms.repository.MpmWriteRepository;
import com.extech.mpms.repository.MpmWriteRepository.CreatedObject;
import com.extech.mpms.repository.MpmWriteRepository.OccurrenceInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 规划器结构写操作。平台新增的结构行使用 LOC_ 前缀，
 * 并在 local_modified_rows 登记，供批量迁移时保护。
 */
@Service
public class MpmWriteService {

    private static final Logger log = LoggerFactory.getLogger(MpmWriteService.class);
    private static final int MAX_CANDIDATES = 200;
    /** 递归克隆的节点上限，防止误操作把整库结构复制一遍。 */
    private static final int MAX_CLONE_NODES = 200;
    private static final int MAX_CLONE_DEPTH = 12;

    private final MpmWriteRepository repository;
    private final MpmReadRepository readRepository;

    public MpmWriteService(
            MpmWriteRepository repository,
            MpmReadRepository readRepository
    ) {
        this.repository = repository;
        this.readRepository = readRepository;
    }

    public CandidatePage listCandidates(String keyword, String category, int limit) {
        int size = Math.min(Math.max(limit, 1), MAX_CANDIDATES);
        List<Candidate> content = repository.listCandidates(keyword, category, size);
        return new CandidatePage(content, content.size());
    }

    /** 平台支持新建的对象类型，供前端下拉框读取，避免前后端硬编码漂移。 */
    public List<String> creatableObjectTypes() {
        return MpmWriteRepository.creatableObjectTypes();
    }

    /** 对象被哪些产品/工艺包含，用于规划器两个视图联动。 */
    public List<Association> associations(String puid) {
        if (isBlank(puid)) {
            throw ApiException.badRequest("对象 PUID 不能为空");
        }
        return repository.findAssociations(puid.trim());
    }

    @Transactional
    public OccurrenceResult addOccurrence(AddOccurrenceRequest request, String ownerPuid) {
        if (request == null || isBlank(request.parentPuid()) || isBlank(request.childPuid())) {
            throw ApiException.badRequest("父节点与子对象不能为空");
        }
        String parentPuid = request.parentPuid().trim();
        String childPuid = request.childPuid().trim();
        if (parentPuid.equals(childPuid)) {
            throw ApiException.badRequest("不能把节点挂到自己下面");
        }

        // 父对象没有 BOMView 时自动创建，与 Teamcenter 的"自动转换为 BOM"行为一致
        ParentView parentView = repository.ensureParentView(parentPuid, ownerPuid);

        String sequence = isBlank(request.sequence())
                ? String.valueOf(repository.nextOrderNo(parentView.bvrPuid()))
                : request.sequence().trim();
        BigDecimal quantity = request.quantity() == null
                ? BigDecimal.valueOf(-1)
                : request.quantity();
        long childClassId = repository.classIdForChildType(childPuid);
        String occurrencePuid = generateLocPuid();

        repository.insertOccurrence(
                occurrencePuid,
                parentView.bvrPuid(),
                childPuid,
                childClassId,
                sequence,
                quantity
        );
        repository.recordModifiedRow("ppsoccurrence", occurrencePuid);

        log.info("add occurrence {} under {} -> {}", occurrencePuid, parentPuid, childPuid);
        return new OccurrenceResult(
                occurrencePuid,
                parentPuid,
                childPuid,
                sequence,
                "已挂载到结构中"
        );
    }

    /**
     * 新建对象并挂载到指定父节点下。后端只创建平台支持的类型，
     * 编号重复会先行拦截，避免写坏 Teamcenter 的编号唯一性约束。
     */
    @Transactional
    public CreateAndMountResult createAndMount(CreateAndMountRequest request, String ownerPuid) {
        if (request == null || isBlank(request.parentPuid())) {
            throw ApiException.badRequest("父节点不能为空");
        }
        String parentPuid = request.parentPuid().trim();
        String objectType = isBlank(request.objectType()) ? "Part" : request.objectType().trim();
        if (!MpmWriteRepository.supportsCreation(objectType)) {
            throw ApiException.badRequest(
                    "暂不支持新建 " + objectType + "，可选：" +
                            String.join(" / ", MpmWriteRepository.creatableObjectTypes()));
        }
        if (isBlank(request.itemId())) {
            throw ApiException.badRequest("对象编号不能为空");
        }
        String itemId = request.itemId().trim();
        if (repository.itemIdExists(itemId)) {
            throw ApiException.badRequest("编号已存在: " + itemId);
        }
        repository.findParentInfo(parentPuid)
                .orElseThrow(() -> ApiException.notFound("父对象不存在: " + parentPuid));

        String revision = isBlank(request.revision()) ? "A" : request.revision().trim();
        BigDecimal quantity = request.quantity() == null
                || request.quantity().compareTo(BigDecimal.ZERO) <= 0
                ? BigDecimal.ONE
                : request.quantity();

        ParentView parentView = repository.ensureParentView(parentPuid, ownerPuid);
        String sequence = isBlank(request.sequence())
                ? String.valueOf(repository.nextOrderNo(parentView.bvrPuid()))
                : requireNumericSequence(request.sequence());

        CreatedObject created = repository.createObject(
                objectType,
                itemId,
                request.name(),
                request.description(),
                revision,
                ownerPuid
        );
        long classId = repository.classIdForObjectType(objectType);
        String occurrencePuid = generateLocPuid();
        repository.insertOccurrence(
                occurrencePuid,
                parentView.bvrPuid(),
                created.itemPuid(),
                classId,
                sequence,
                quantity
        );
        repository.recordModifiedRow("ppsoccurrence", occurrencePuid);

        log.info("created {} {} ({}) mounted under {}",
                objectType, itemId, created.itemPuid(), parentPuid);
        return new CreateAndMountResult(
                created.itemPuid(),
                created.revisionPuid(),
                occurrencePuid,
                parentPuid,
                objectType,
                itemId,
                created.name(),
                sequence,
                "已新建 " + objectType + " 并挂载"
        );
    }

    /**
     * 整棵子树递归克隆到目标节点下。平台支持的类型会创建新对象，
     * 其他类型沿用原对象，只复制结构关系。
     */
    @Transactional
    public CloneSubtreeResult cloneSubtree(CloneSubtreeRequest request, String ownerPuid) {
        if (request == null || isBlank(request.sourcePuid()) || isBlank(request.targetPuid())) {
            throw ApiException.badRequest("源节点和目标节点不能为空");
        }
        String sourceItemPuid = readRepository.findItemPuidForObject(request.sourcePuid().trim())
                .orElseThrow(() -> ApiException.notFound("源对象不存在: " + request.sourcePuid()));
        String targetItemPuid = readRepository.findItemPuidForObject(request.targetPuid().trim())
                .orElseThrow(() -> ApiException.notFound("目标对象不存在: " + request.targetPuid()));
        if (sourceItemPuid.equals(targetItemPuid)) {
            throw ApiException.badRequest("不能把子树克隆到自己下面");
        }

        Map<String, List<OccurrenceRow>> childrenByParent = new HashMap<>();
        for (OccurrenceRow row : readRepository.findOccurrences()) {
            childrenByParent.computeIfAbsent(row.parentItemPuid(), ignored -> new ArrayList<>())
                    .add(row);
        }
        if (isDescendantOf(childrenByParent, sourceItemPuid, targetItemPuid)) {
            throw ApiException.badRequest("不能把子树克隆到它自己的子孙节点下面");
        }

        String suffix = isBlank(request.itemIdSuffix()) ? "-C" : request.itemIdSuffix().trim();
        List<CloneSubtreeEntry> entries = new ArrayList<>();
        Map<String, Integer> serialBySource = new HashMap<>();
        Set<String> visited = new HashSet<>();
        visited.add(sourceItemPuid);

        int createdObjects = 0;
        int createdOccurrences = 0;
        Deque<CloneFrame> queue = new ArrayDeque<>();
        queue.add(new CloneFrame(sourceItemPuid, targetItemPuid, 0));

        while (!queue.isEmpty()) {
            CloneFrame frame = queue.poll();
            if (frame.depth() >= MAX_CLONE_DEPTH) {
                continue;
            }
            for (OccurrenceRow child : childrenByParent.getOrDefault(frame.sourceItemPuid(), List.of())) {
                if (entries.size() >= MAX_CLONE_NODES) {
                    break;
                }
                String childItemPuid = child.childItemPuid();
                if (childItemPuid == null || childItemPuid.isBlank() || !visited.add(childItemPuid)) {
                    continue;
                }
                String childType = child.childObjectType();
                String mountPuid;
                boolean objectCreated;
                if (MpmWriteRepository.supportsCreation(childType)) {
                    String baseId = isBlank(child.childCode()) ? childItemPuid : child.childCode().trim();
                    String newItemId = nextCloneItemId(baseId, suffix, serialBySource);
                    CreatedObject created = repository.createObject(
                            childType,
                            newItemId,
                            child.childName(),
                            null,
                            "A",
                            ownerPuid
                    );
                    mountPuid = created.itemPuid();
                    objectCreated = true;
                    createdObjects++;
                } else {
                    mountPuid = childItemPuid;
                    objectCreated = false;
                }

                ParentView parentView = repository.ensureParentView(frame.targetItemPuid(), ownerPuid);
                long classId = objectCreated
                        ? repository.classIdForObjectType(childType)
                        : fallbackClassId(childItemPuid, childType);
                String sequence = resolveCloneSequence(child.sequenceNo(), parentView.bvrPuid());
                BigDecimal quantity = child.quantity() == null
                        || child.quantity().compareTo(BigDecimal.ZERO) <= 0
                        ? BigDecimal.ONE
                        : child.quantity();
                String occurrencePuid = generateLocPuid();
                repository.insertOccurrence(
                        occurrencePuid,
                        parentView.bvrPuid(),
                        mountPuid,
                        classId,
                        sequence,
                        quantity
                );
                repository.recordModifiedRow("ppsoccurrence", occurrencePuid);
                createdOccurrences++;
                entries.add(new CloneSubtreeEntry(
                        childItemPuid,
                        mountPuid,
                        occurrencePuid,
                        child.childCode(),
                        child.childName(),
                        childType,
                        sequence,
                        objectCreated
                ));
                queue.add(new CloneFrame(childItemPuid, mountPuid, frame.depth() + 1));
            }
        }

        if (entries.isEmpty()) {
            throw ApiException.badRequest("源对象没有子结构，无法克隆");
        }
        log.info("cloned subtree {} -> {} nodes={} objects={}",
                sourceItemPuid, targetItemPuid, createdOccurrences, createdObjects);
        return new CloneSubtreeResult(
                sourceItemPuid,
                targetItemPuid,
                createdObjects,
                createdOccurrences,
                entries,
                "已递归克隆 " + createdOccurrences + " 个结构行（新建 " + createdObjects + " 个对象）"
        );
    }

    private String nextCloneItemId(String baseId, String suffix, Map<String, Integer> serialBySource) {
        int serial = serialBySource.merge(baseId, 1, Integer::sum);
        String candidate = baseId + suffix + serial;
        while (repository.itemIdExists(candidate)) {
            serial = serial + 1;
            serialBySource.put(baseId, serial);
            candidate = baseId + suffix + serial;
        }
        return candidate;
    }

    /** 复用对象的 class id 优先取本库已有的同类结构行，避免平台猜类型。 */
    private long fallbackClassId(String childItemPuid, String childType) {
        long classId = repository.classIdForObjectType(childType);
        if (classId > 0) {
            return classId;
        }
        return repository.classIdForChildType(childItemPuid);
    }

    private String resolveCloneSequence(String sourceSequence, String parentBvrPuid) {
        if (sourceSequence != null && sourceSequence.trim().matches("\\d{1,9}")) {
            return sourceSequence.trim();
        }
        return String.valueOf(repository.nextOrderNo(parentBvrPuid));
    }

    private boolean isDescendantOf(
            Map<String, List<OccurrenceRow>> childrenByParent,
            String ancestorItemPuid,
            String candidateItemPuid
    ) {
        Deque<String> stack = new ArrayDeque<>();
        Set<String> seen = new HashSet<>();
        stack.add(ancestorItemPuid);
        while (!stack.isEmpty()) {
            String current = stack.pop();
            if (!seen.add(current)) {
                continue;
            }
            for (OccurrenceRow child : childrenByParent.getOrDefault(current, List.of())) {
                String next = child.childItemPuid();
                if (next == null || next.isBlank()) {
                    continue;
                }
                if (next.equals(candidateItemPuid)) {
                    return true;
                }
                stack.push(next);
            }
        }
        return false;
    }

    private String requireNumericSequence(String sequence) {
        String trimmed = sequence.trim();
        if (!trimmed.matches("\\d{1,9}")) {
            throw ApiException.badRequest("工序号必须是 1-9 位数字");
        }
        return trimmed;
    }

    @Transactional
    public void removeOccurrence(String occurrencePuid) {
        if (isBlank(occurrencePuid)) {
            throw ApiException.badRequest("结构行 PUID 不能为空");
        }
        String puid = occurrencePuid.trim();
        if (!repository.occurrenceExists(puid)) {
            throw ApiException.notFound("结构行不存在: " + puid);
        }
        repository.deleteOccurrence(puid);
        log.info("removed occurrence {}", puid);
    }

    @Transactional
    public OccurrenceResult updateOccurrence(
            String occurrencePuid,
            OccurrenceUpdateRequest request
    ) {
        if (request == null) {
            throw ApiException.badRequest("更新参数不能为空");
        }
        OccurrenceInfo occurrence = repository.findOccurrence(occurrencePuid)
                .orElseThrow(() -> ApiException.notFound("结构行不存在: " + occurrencePuid));
        String sequence = isBlank(request.sequence())
                ? occurrence.sequence()
                : request.sequence().trim();
        BigDecimal quantity = request.quantity() == null
                ? occurrence.quantity()
                : request.quantity();
        if (isBlank(sequence) && quantity == null) {
            throw ApiException.badRequest("工序号和数量至少需要修改一项");
        }
        repository.updateOccurrence(occurrencePuid, sequence, quantity);
        repository.recordModifiedRow("ppsoccurrence", occurrencePuid);
        return new OccurrenceResult(
                occurrencePuid,
                occurrence.parentBvrPuid(),
                occurrence.childPuid(),
                sequence,
                "结构行已更新"
        );
    }

    @Transactional
    public ResequenceResult resequenceOccurrence(String occurrencePuid) {
        OccurrenceInfo occurrence = repository.findOccurrence(occurrencePuid)
                .orElseThrow(() -> ApiException.notFound("结构行不存在: " + occurrencePuid));
        List<OccurrenceInfo> siblings = repository.listSiblings(occurrence.parentBvrPuid());
        int order = 10;
        for (OccurrenceInfo sibling : siblings) {
            repository.setOccurrenceOrder(sibling.puid(), order);
            repository.recordModifiedRow("ppsoccurrence", sibling.puid());
            order += 10;
        }
        return new ResequenceResult(
                occurrence.parentBvrPuid(),
                siblings.size(),
                "工序号已按 10、20、30 重排"
        );
    }

    public AccountabilityReport accountabilityCheck(
            String sourceRootPuid,
            String targetRootPuid
    ) {
        if (isBlank(sourceRootPuid) || isBlank(targetRootPuid)) {
            throw ApiException.badRequest("源结构和目标结构不能为空");
        }
        List<OccurrenceRow> occurrences = readRepository.findOccurrences();
        Map<String, List<OccurrenceRow>> childrenByParent = new HashMap<>();
        Map<String, OccurrenceRow> rowsByChild = new LinkedHashMap<>();
        for (OccurrenceRow row : occurrences) {
            childrenByParent.computeIfAbsent(row.parentItemPuid(), ignored -> new ArrayList<>())
                    .add(row);
            rowsByChild.putIfAbsent(row.childItemPuid(), row);
        }

        Map<String, BigDecimal> sourceQty = new LinkedHashMap<>();
        Map<String, BigDecimal> targetQty = new LinkedHashMap<>();
        aggregate(sourceRootPuid, childrenByParent, sourceQty, BigDecimal.ONE, new HashSet<>());
        aggregate(targetRootPuid, childrenByParent, targetQty, BigDecimal.ONE, new HashSet<>());

        Set<String> children = new LinkedHashSet<>();
        children.addAll(sourceQty.keySet());
        children.addAll(targetQty.keySet());
        List<AccountabilityEntry> entries = new ArrayList<>();
        for (String childPuid : children) {
            if (childPuid.equals(sourceRootPuid) || childPuid.equals(targetRootPuid)) {
                continue;
            }
            BigDecimal source = sourceQty.getOrDefault(childPuid, BigDecimal.ZERO);
            BigDecimal target = targetQty.getOrDefault(childPuid, BigDecimal.ZERO);
            if (source.compareTo(BigDecimal.ZERO) == 0 && target.compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }
            int comparison = target.compareTo(source);
            String status = source.compareTo(BigDecimal.ZERO) > 0 && comparison == 0
                    ? "MATCHED"
                    : comparison > 0 ? "OVER_ALLOCATED" : "PARTIAL_OR_MISSING";
            OccurrenceRow row = rowsByChild.get(childPuid);
            entries.add(new AccountabilityEntry(
                    childPuid,
                    row == null ? childPuid : row.childCode(),
                    row == null ? childPuid : row.childName(),
                    source,
                    target,
                    status
            ));
        }
        entries.sort((a, b) -> {
            int status = a.status().compareTo(b.status());
            return status == 0 ? a.code().compareTo(b.code()) : status;
        });
        return new AccountabilityReport(sourceRootPuid.trim(), targetRootPuid.trim(), entries);
    }

    private void aggregate(
            String parentPuid,
            Map<String, List<OccurrenceRow>> childrenByParent,
            Map<String, BigDecimal> totals,
            BigDecimal multiplier,
            Set<String> visiting
    ) {
        if (!visiting.add(parentPuid)) {
            return;
        }
        for (OccurrenceRow child : childrenByParent.getOrDefault(parentPuid, List.of())) {
            BigDecimal quantity = child.quantity();
            if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
                quantity = BigDecimal.ONE;
            }
            BigDecimal contribution = multiplier.multiply(quantity);
            totals.merge(child.childItemPuid(), contribution, BigDecimal::add);
            Set<String> next = new HashSet<>(visiting);
            aggregate(child.childItemPuid(), childrenByParent, totals, contribution, next);
        }
    }

    /** 平台新增对象统一使用 LOC_ 前缀，便于批量迁移时识别与保护。 */
    private String generateLocPuid() {
        String stamp = Long.toString(System.currentTimeMillis(), 36).toUpperCase();
        int suffix = ThreadLocalRandom.current().nextInt(1000, 9999);
        return "LOC_" + stamp + suffix;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /** 递归克隆的工作队列元素：源节点 → 目标挂载点。 */
    private record CloneFrame(String sourceItemPuid, String targetItemPuid, int depth) {
    }
}
