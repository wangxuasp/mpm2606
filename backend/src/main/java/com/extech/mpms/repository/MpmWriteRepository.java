package com.extech.mpms.repository;

import com.extech.mpms.model.mpm.MpmWriteModels.Candidate;
import com.extech.mpms.model.mpm.MpmWriteModels.Association;
import com.extech.mpms.model.mpm.MpmWriteModels.ParentView;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class MpmWriteRepository {

    /** 空指针与 BOMViewRevision 的 class id，取自本库现有结构行的实测值。 */
    public static final String NULL_UID = "AAAAAAAAAAAAAA";
    public static final long BVR_CLASS_ID = 822L;
    /** 默认"视图"类型与 class id，取自本库 61 个 BOMView 的实测值。 */
    public static final String DEFAULT_VIEW_TYPE = "T0Y5rjoo5gyWHC";
    public static final long DEFAULT_VIEW_TYPE_CLASS = 358L;
    public static final long OWNER_USER_CLASS = 860L;
    public static final long OWNER_GROUP_CLASS = 570L;
    public static final long BOM_VIEW_CLASS = 821L;

    /** 对象类型 → class id 实测映射。 */
    private static final Map<String, Long> TYPE_CLASS_IDS = Map.ofEntries(
            Map.entry("Item", 772L),
            Map.entry("ItemRevision", 1026L),
            Map.entry("MEOP", 779L),
            Map.entry("MEOPRevision", 1031L),
            Map.entry("MEProcess", 780L),
            Map.entry("MEProcessRevision", 1034L),
            Map.entry("Part", 825L),
            Map.entry("Part Revision", 1026L),
            Map.entry("CE3_test", 1259L)
    );

    /**
     * 平台允许新建的对象类型。item/revision 的 pobject_type 与 class id
     * 取自本库实测值，避免凭空猜测 Teamcenter 类型定义。
     */
    private static final Map<String, ObjectTypeSpec> OBJECT_TYPE_SPECS = Map.ofEntries(
            Map.entry("Part", new ObjectTypeSpec("Part", "Part Revision", 825L, 1026L, false)),
            Map.entry("Item", new ObjectTypeSpec("Item", "ItemRevision", 772L, 1026L, false)),
            Map.entry("MEProcess", new ObjectTypeSpec("MEProcess", "MEProcessRevision", 780L, 1034L, true)),
            Map.entry("MEOP", new ObjectTypeSpec("MEOP", "MEOPRevision", 779L, 1031L, true))
    );

    /** 工艺活动根对象的 class id，取自 PMEOPREVISION.RROOT_ACTIVITYC 实测值。 */
    public static final long ACTIVITY_CLASS_ID = 774L;

    private final JdbcTemplate jdbcTemplate;

    public MpmWriteRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * 找父对象用于挂结构行的视图。优先选名称以"视图"结尾的，
     * 没有则退回第一个视图。
     */
    public Optional<ParentView> findParentView(String parentPuid) {
        String sql = """
                SELECT b.puid AS view_puid, br.puid AS bvr_puid
                FROM ppsbomview b
                JOIN ppsbomviewrevision br ON br.rbom_viewu = b.puid
                LEFT JOIN pworkspaceobject w ON w.puid = b.puid
                WHERE b.rparent_itemu = ?
                ORDER BY CASE WHEN w.pobject_name LIKE '%视图' THEN 0 ELSE 1 END, b.puid
                LIMIT 1
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new ParentView(
                rs.getString("view_puid"),
                rs.getString("bvr_puid"),
                BVR_CLASS_ID
        ), parentPuid).stream().findFirst();
    }

    public int nextOrderNo(String bvrPuid) {
        Integer max = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(porder_no), 0) FROM ppsoccurrence WHERE rparent_bvru = ?",
                Integer.class, bvrPuid);
        return (max == null ? 0 : max) + 10;
    }

    /**
     * 确保父对象有可用的 BOMView 与 BOMViewRevision。
     * Teamcenter 在挂载时会为没有视图的对象自动创建视图
     * （用户所说的"item 在规划器里自动转换成 bom"），这里复刻同样的行为。
     */
    public ParentView ensureParentView(String parentPuid, String ownerPuid) {
        Optional<ParentView> existing = findParentView(parentPuid);
        if (existing.isPresent()) {
            return existing.get();
        }
        ParentInfo info = findParentInfo(parentPuid)
                .orElseThrow(() -> new IllegalStateException("找不到父对象: " + parentPuid));
        long parentClass = TYPE_CLASS_IDS.getOrDefault(info.type(), 772L);
        String owner = ownerPuid == null ? NULL_UID : ownerPuid;
        String viewPuid = generateLocPuid("VW");
        String bvrPuid = generateLocPuid("BR");

        insertWorkspaceObject(viewPuid, info.name() + "-视图", "BOMView");
        insertApplicationObject(viewPuid, owner);
        jdbcTemplate.update("""
                INSERT INTO ppsbomview
                    (puid, vla_821_2, vla_821_3, rparent_itemu, rparent_itemc,
                     rview_typeu, rview_typec)
                VALUES (?, 0, 0, ?, ?, ?, ?)
                """, viewPuid, parentPuid, parentClass, DEFAULT_VIEW_TYPE, DEFAULT_VIEW_TYPE_CLASS);

        insertWorkspaceObject(bvrPuid, info.name() + "-视图版本", "BOMView Revision");
        insertApplicationObject(bvrPuid, owner);
        jdbcTemplate.update("""
                INSERT INTO ppsbomviewrevision
                    (puid, vla_822_4, vla_822_2, rbom_viewu, rbom_viewc,
                     pis_precise, pstruct_last_mod_date)
                VALUES (?, 0, 0, ?, ?, 0, CURRENT_TIMESTAMP)
                """, bvrPuid, viewPuid, BOM_VIEW_CLASS);

        recordModifiedRow("ppsbomview", viewPuid);
        recordModifiedRow("ppsbomviewrevision", bvrPuid);
        recordModifiedRow("pworkspaceobject", viewPuid);
        recordModifiedRow("pworkspaceobject", bvrPuid);
        return new ParentView(viewPuid, bvrPuid, BVR_CLASS_ID);
    }

    public Optional<ParentInfo> findParentInfo(String puid) {
        return jdbcTemplate.query(
                """
                SELECT COALESCE(w.pobject_name, ?) AS object_name,
                       COALESCE(w.pobject_type, 'Item') AS object_type
                FROM pworkspaceobject w WHERE w.puid = ?
                """,
                (rs, rowNum) -> new ParentInfo(
                        rs.getString("object_name"), rs.getString("object_type")),
                puid, puid
        ).stream().findFirst();
    }

    /** 平台是否支持为该类型创建新对象。 */
    public static boolean supportsCreation(String objectType) {
        return objectType != null && OBJECT_TYPE_SPECS.containsKey(objectType);
    }

    /** 可新建的对象类型清单，供前端下拉框使用。 */
    public static List<String> creatableObjectTypes() {
        return List.copyOf(OBJECT_TYPE_SPECS.keySet());
    }

    /** 该对象类型在结构行里使用的 class id，找不到返回 0。 */
    public long classIdForObjectType(String objectType) {
        ObjectTypeSpec spec = OBJECT_TYPE_SPECS.get(objectType);
        if (spec != null) {
            return spec.itemClassId();
        }
        Long id = TYPE_CLASS_IDS.get(objectType);
        return id == null ? 0L : id;
    }

    public boolean itemIdExists(String itemId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM pitem WHERE pitem_id = ?", Integer.class, itemId);
        return count != null && count > 0;
    }

    /**
     * 创建零组件/工艺规程/工序本体：pitem + pitemrevision + 工作区对象 +
     * 应用对象，MEProcess/MEOP 还会补子表记录。
     * 编号相同由调用方先行校验，这里只负责落库。
     */
    public CreatedObject createObject(
            String objectType,
            String itemId,
            String name,
            String description,
            String revision,
            String ownerPuid
    ) {
        ObjectTypeSpec spec = OBJECT_TYPE_SPECS.get(objectType);
        if (spec == null) {
            throw new IllegalStateException("不支持新建的对象类型: " + objectType);
        }
        String itemPuid = generateLocPuid("ITM");
        String revisionPuid = generateLocPuid("REV");
        String itemName = name == null || name.isBlank() ? itemId : name;

        jdbcTemplate.update("""
                INSERT INTO pitem
                    (puid, pitem_id, vla_772_2, vla_772_8,
                     rconfiguration_object_tagu, rconfiguration_object_tagc,
                     ruom_tagu, ruom_tagc)
                VALUES (?, ?, 0, 0, ?, -1, ?, -1)
                """, itemPuid, itemId, NULL_UID, NULL_UID);
        insertWorkspaceObject(itemPuid, itemName, description, spec.itemType());
        insertApplicationObject(itemPuid, ownerPuid);

        jdbcTemplate.update("""
                INSERT INTO pitemrevision
                    (puid, pitem_revision_id, vla_1026_10, vla_1026_11,
                     vla_1026_12, vla_1026_14, ritems_tagu, ritems_tagc)
                VALUES (?, ?, 0, 0, 0, 0, ?, ?)
                """, revisionPuid, revision, itemPuid, spec.itemClassId());
        insertWorkspaceObject(revisionPuid, itemName, description, spec.revisionType());
        insertApplicationObject(revisionPuid, ownerPuid);

        if (spec.processSubtype()) {
            if ("MEProcess".equals(objectType)) {
                jdbcTemplate.update("INSERT INTO pmeprocess (puid) VALUES (?)", itemPuid);
                jdbcTemplate.update("INSERT INTO pmeprocessrevision (puid) VALUES (?)", revisionPuid);
            } else if ("MEOP".equals(objectType)) {
                jdbcTemplate.update("INSERT INTO pmeop (puid) VALUES (?)", itemPuid);
                String activityPuid = generateLocPuid("ACT");
                jdbcTemplate.update("""
                        INSERT INTO pmeactivity
                            (puid, ptime, pstart_time, ptime_system_category,
                             vla_774_3, vla_774_4, pmfg0has_origin, plong_description)
                        VALUES (?, 0, 0, 'NA', 0, 0, 0, 'Activity Root Object')
                        """, activityPuid);
                jdbcTemplate.update("""
                        INSERT INTO pmeoprevision
                            (puid, vla_1031_2, rroot_activityu, rroot_activityc)
                        VALUES (?, 0, ?, ?)
                        """, revisionPuid, activityPuid, ACTIVITY_CLASS_ID);
                recordModifiedRow("pmeactivity", activityPuid);
            }
        }

        recordModifiedRow("pitem", itemPuid);
        recordModifiedRow("pitemrevision", revisionPuid);
        recordModifiedRow("pworkspaceobject", itemPuid);
        recordModifiedRow("pworkspaceobject", revisionPuid);
        recordModifiedRow("ppom_application_object", itemPuid);
        recordModifiedRow("ppom_application_object", revisionPuid);
        return new CreatedObject(itemPuid, revisionPuid, objectType, itemId, itemName);
    }

    private void insertWorkspaceObject(String puid, String name, String type) {
        insertWorkspaceObject(puid, name, null, type);
    }

    private void insertWorkspaceObject(String puid, String name, String description, String type) {
        jdbcTemplate.update("""
                INSERT INTO pworkspaceobject
                    (puid, pobject_name, pobject_desc, pobject_type, pobject_application,
                     vla_677_7, vla_677_10, vla_677_12, vla_677_17, vla_677_19,
                     prevision_limit, prevision_number, pactive_seq, pfnd0inprocess)
                VALUES (?, ?, ?, ?, 'Teamcenter', 0, 0, 0, 0, 0, 1, 0, 1, 0)
                """, puid, name, description, type);
    }

    private void insertApplicationObject(String puid, String ownerPuid) {
        List<String> groups = jdbcTemplate.query(
                "SELECT COALESCE(pdefault_group, ?) AS grp FROM ppom_user WHERE puid = ?",
                (rs, rowNum) -> rs.getString("grp"), NULL_UID, ownerPuid);
        String group = groups.isEmpty() ? NULL_UID : groups.get(0);
        jdbcTemplate.update("""
                INSERT INTO ppom_application_object
                    (puid, rowning_groupu, rowning_groupc, pacl_bits,
                     rlast_mod_useru, rlast_mod_userc, rowning_useru, rowning_userc,
                     pcreation_date, plast_mod_date)
                VALUES (?, ?, ?, 0, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, puid, group == null ? NULL_UID : group, OWNER_GROUP_CLASS,
                ownerPuid, OWNER_USER_CLASS, ownerPuid, OWNER_USER_CLASS);
    }

    private static String generateLocPuid(String tag) {
        String stamp = Long.toString(System.currentTimeMillis(), 36).toUpperCase();
        int suffix = java.util.concurrent.ThreadLocalRandom.current().nextInt(1000, 9999);
        return "LOC_" + tag + stamp + suffix;
    }

    /** 同类型子对象已有的 class id，找不到返回 0。 */
    public long classIdForChildType(String childPuid) {
        String sql = """
                SELECT o.rchild_itemc
                FROM ppsoccurrence o
                JOIN pworkspaceobject cw ON cw.puid = o.rchild_itemu
                WHERE cw.pobject_type = (
                    SELECT pobject_type FROM pworkspaceobject WHERE puid = ?
                )
                LIMIT 1
                """;
        List<Long> rows = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getLong("rchild_itemc"), childPuid);
        return rows.isEmpty() ? 0L : rows.get(0);
    }

    public void insertOccurrence(
            String puid,
            String parentBvrPuid,
            String childPuid,
            long childClassId,
            String sequence,
            BigDecimal quantity
    ) {
        String sql = """
                INSERT INTO ppsoccurrence (
                    puid, pqty_value, pseq_no, porder_no,
                    vla_1070_5, vla_1070_12, vla_1070_13, vla_1070_6, vla_1070_30,
                    rchild_itemu, rchild_itemc,
                    ralternate_etc_refu, ralternate_etc_refc,
                    rvariant_conditionu, rvariant_conditionc,
                    poccurrence_type, pocc_flags,
                    rchild_bvu, rchild_bvc,
                    rparent_bvru, rparent_bvrc,
                    ruom_tagu, ruom_tagc,
                    rocc_typeu, rocc_typec,
                    rocc_threadu, rocc_threadc,
                    rxformu, rxformc,
                    rnotes_refu, rnotes_refc
                ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0,
                          ?, ?,
                          ?, -1,
                          ?, -1,
                          0, 0,
                          ?, -1,
                          ?, ?,
                          ?, -1,
                          ?, -1,
                          ?, -1,
                          ?, -1,
                          ?, -1)
                """;
        jdbcTemplate.update(
                sql,
                puid,
                quantity == null ? BigDecimal.valueOf(-1) : quantity,
                sequence,
                Integer.parseInt(sequence),
                childPuid,
                childClassId,
                NULL_UID,
                NULL_UID,
                NULL_UID,
                parentBvrPuid,
                BVR_CLASS_ID,
                NULL_UID,
                NULL_UID,
                NULL_UID,
                NULL_UID,
                NULL_UID
        );
    }

    public int deleteOccurrence(String occurrencePuid) {
        return jdbcTemplate.update("DELETE FROM ppsoccurrence WHERE puid = ?", occurrencePuid);
    }

    public Optional<OccurrenceInfo> findOccurrence(String occurrencePuid) {
        return jdbcTemplate.query("""
                SELECT puid, rparent_bvru, rchild_itemu, pseq_no, pqty_value
                FROM ppsoccurrence
                WHERE puid = ?
                """, (rs, rowNum) -> new OccurrenceInfo(
                rs.getString("puid"),
                rs.getString("rparent_bvru"),
                rs.getString("rchild_itemu"),
                rs.getString("pseq_no"),
                rs.getBigDecimal("pqty_value")
        ), occurrencePuid).stream().findFirst();
    }

    public int updateOccurrence(String occurrencePuid, String sequence, BigDecimal quantity) {
        int orderNo = 0;
        if (sequence != null) {
            try {
                orderNo = Integer.parseInt(sequence);
            } catch (NumberFormatException ignored) {
                orderNo = 0;
            }
        }
        return jdbcTemplate.update("""
                UPDATE ppsoccurrence
                SET pseq_no = ?, porder_no = ?, pqty_value = ?
                WHERE puid = ?
                """, sequence, orderNo, quantity == null ? BigDecimal.valueOf(-1) : quantity, occurrencePuid);
    }

    public List<OccurrenceInfo> listSiblings(String parentBvrPuid) {
        return jdbcTemplate.query("""
                SELECT puid, rparent_bvru, rchild_itemu, pseq_no, pqty_value
                FROM ppsoccurrence
                WHERE rparent_bvru = ?
                ORDER BY pseq_no NULLS LAST, porder_no NULLS LAST, puid
                """, (rs, rowNum) -> new OccurrenceInfo(
                rs.getString("puid"),
                rs.getString("rparent_bvru"),
                rs.getString("rchild_itemu"),
                rs.getString("pseq_no"),
                rs.getBigDecimal("pqty_value")
        ), parentBvrPuid);
    }

    public void setOccurrenceOrder(String occurrencePuid, int orderNo) {
        String sequence = String.valueOf(orderNo);
        jdbcTemplate.update("""
                UPDATE ppsoccurrence
                SET pseq_no = ?, porder_no = ?
                WHERE puid = ?
                """, sequence, orderNo, occurrencePuid);
    }

    public boolean occurrenceExists(String puid) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ppsoccurrence WHERE puid = ?", Integer.class, puid);
        return count != null && count > 0;
    }

    /** 候选对象：零组件、工序、工艺规程，供"新增子项"选择。 */
    public List<Candidate> listCandidates(String keyword, String category, int limit) {
        List<Object> args = new ArrayList<>();
        StringBuilder sql = new StringBuilder("""
                SELECT i.puid,
                       COALESCE(i.pitem_id, w.pobject_name, '') AS code,
                       COALESCE(w.pobject_name, i.pitem_id, '') AS name,
                       COALESCE(w.pobject_type, '') AS object_type,
                       COALESCE(r.pitem_revision_id, '') AS revision
                FROM pitem i
                JOIN pworkspaceobject w ON w.puid = i.puid
                LEFT JOIN pitemrevision r ON r.puid = (
                    SELECT pr.puid FROM pitemrevision pr
                    WHERE pr.ritems_tagu = i.puid
                    ORDER BY pr.puid DESC LIMIT 1
                )
                WHERE 1 = 1
                """);
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (LOWER(CAST(i.pitem_id AS VARCHAR)) LIKE LOWER(?)")
                    .append(" OR LOWER(CAST(w.pobject_name AS VARCHAR)) LIKE LOWER(?))");
            String pattern = "%" + keyword.trim() + "%";
            args.add(pattern);
            args.add(pattern);
        }
        if ("process".equals(category)) {
            sql.append(" AND w.pobject_type = 'MEProcess'");
        } else if ("operation".equals(category)) {
            sql.append(" AND w.pobject_type IN ('MEOP', 'MEOPRevision')");
        } else if ("item".equals(category)) {
            sql.append(" AND w.pobject_type NOT IN ('MEProcess', 'MEProcessRevision',")
                    .append(" 'MEOP', 'MEOPRevision')");
        }
        sql.append(" ORDER BY code LIMIT ?");
        args.add(limit);
        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> new Candidate(
                rs.getString("puid"),
                rs.getString("code"),
                rs.getString("name"),
                rs.getString("object_type"),
                rs.getString("revision"),
                classify(rs.getString("object_type"))
        ), args.toArray());
    }

    public void recordModifiedRow(String tableName, String recordPuid) {

        jdbcTemplate.update("""
                INSERT INTO local_modified_rows (table_name, record_puid, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (table_name, record_puid)
                DO UPDATE SET updated_at = CURRENT_TIMESTAMP
                """, tableName, recordPuid);
    }

    /**
     * 反查：某个对象被哪些父项（产品/工艺）的结构包含。
     * 用于规划器两个视图之间的联动。
     */
    public List<Association> findAssociations(String childPuid) {
        String sql = """
                SELECT b.rparent_itemu AS parent_puid,
                       COALESCE(i.pitem_id, w.pobject_name, '') AS parent_code,
                       COALESCE(w.pobject_name, i.pitem_id, '') AS parent_name,
                       COALESCE(w.pobject_type, '') AS parent_type,
                       COALESCE(vw.pobject_name, '') AS view_name
                FROM ppsoccurrence o
                JOIN ppsbomviewrevision br ON br.puid = o.rparent_bvru
                JOIN ppsbomview b ON b.puid = br.rbom_viewu
                LEFT JOIN pworkspaceobject vw ON vw.puid = b.puid
                LEFT JOIN pitem i ON i.puid = b.rparent_itemu
                LEFT JOIN pworkspaceobject w ON w.puid = b.rparent_itemu
                WHERE o.rchild_itemu = ?
                ORDER BY view_name, parent_code
                """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new Association(
                rs.getString("parent_puid"),
                rs.getString("parent_code"),
                rs.getString("parent_name"),
                rs.getString("parent_type"),
                rs.getString("view_name"),
                classify(rs.getString("parent_type"))
        ), childPuid);
    }

    public record ParentInfo(String name, String type) {
    }

    private record ObjectTypeSpec(
            String itemType,
            String revisionType,
            long itemClassId,
            long revisionClassId,
            boolean processSubtype
    ) {
    }

    /** 新建对象的结果：零组件本体与它的版本。 */
    public record CreatedObject(
            String itemPuid,
            String revisionPuid,
            String objectType,
            String itemId,
            String name
    ) {
    }

    public record OccurrenceInfo(
            String puid,
            String parentBvrPuid,
            String childPuid,
            String sequence,
            BigDecimal quantity
    ) {
    }

    private static String classify(String objectType) {
        if (objectType == null) {
            return "item";
        }
        if (objectType.startsWith("MEProcess")) {
            return "process";
        }
        if (objectType.startsWith("MEOP")) {
            return "operation";
        }
        return "item";
    }
}
