package com.extech.mpms.service;

import com.extech.mpms.auth.AuthRepository;
import com.extech.mpms.auth.UserContext;
import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.metadata.TcMetadataModels.ObjectProperties;
import com.extech.mpms.model.metadata.TcMetadataModels.ObjectType;
import com.extech.mpms.model.metadata.TcMetadataModels.PropertyDefinition;
import com.extech.mpms.model.metadata.TcMetadataModels.PropertyUpdate;
import com.extech.mpms.model.metadata.TcMetadataModels.PropertyValue;
import com.extech.mpms.repository.TcMetadataRepository;
import com.extech.mpms.repository.TcMetadataRepository.ObjectIdentityRow;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class TcMetadataService {

    private final TcMetadataRepository repository;
    private final AuthRepository authRepository;

    public TcMetadataService(
            TcMetadataRepository repository,
            AuthRepository authRepository
    ) {
        this.repository = repository;
        this.authRepository = authRepository;
    }

    public List<ObjectType> listObjectTypes() {
        return repository.listObjectTypes();
    }

    public List<PropertyDefinition> listProperties(String className) {
        if (className == null || className.isBlank()) {
            throw ApiException.badRequest("类型名称不能为空");
        }
        return repository.listProperties(className.trim());
    }

    public ObjectProperties readProperties(String puid, boolean includeEmpty) {
        if (puid == null || puid.isBlank()) {
            throw ApiException.badRequest("对象 PUID 不能为空");
        }
        ObjectIdentityRow identity = repository.findObjectIdentity(puid.trim())
                .orElseThrow(() -> ApiException.notFound("对象不存在: " + puid));
        String objectType = identity.objectType() == null ? "" : identity.objectType();
        ObjectType type = repository.findObjectType(objectType).orElse(null);
        String className = type == null ? objectType : type.className();
        String sourceTable = type == null ? null : type.sourceTable();

        boolean tablePresent = sourceTable != null && repository.tableExists(sourceTable);
        Map<String, Object> sourceRow = sourceTable == null || !tablePresent
                ? Map.of()
                : repository.findSourceRow(sourceTable, identity.puid()).orElse(Map.of());
        boolean sourceRowPresent = !sourceRow.isEmpty();
        // 表没迁进来和"表在、但这条对象没有扩展行"是两回事，必须分开报，
        // 否则客户数据比对时会分不清"人家没填"还是"我们没搬过来"。
        String missingReason = sourceTable == null
                ? null
                : !tablePresent ? "TABLE_NOT_MIGRATED"
                : !sourceRowPresent ? "ROW_NOT_MIGRATED" : null;

        List<PropertyValue> values = new ArrayList<>();
        values.add(value(identity.puid(), "object_string", "对象标识", "SYSTEM",
                objectString(identity), true, false, "COLUMN", null));
        values.add(value(identity.puid(), "pobject_name", "中文名称", "PERSISTENT",
                identity.objectName(), true, true, "COLUMN", null));
        values.add(value(identity.puid(), "pobject_desc", "描述", "PERSISTENT",
                identity.objectDesc(), true, true, "COLUMN", null));
        values.add(value(identity.puid(), "pobject_type", "对象类型", "SYSTEM",
                identity.objectType(), true, false, "COLUMN", null));
        values.add(value(identity.puid(), "owning_user", "拥有者", "SYSTEM",
                identity.ownerName(), true, false, "COLUMN", null));
        values.add(value(identity.puid(), "owning_group", "拥有组", "SYSTEM",
                identity.owningGroupName(), true, false, "COLUMN", null));
        values.add(value(identity.puid(), "last_mod_user", "最后修改人", "SYSTEM",
                identity.lastModUserName(), true, false, "COLUMN", null));
        values.add(value(identity.puid(), "creation_date", "创建时间", "SYSTEM",
                identity.createdAt(), true, false, "COLUMN", null));
        values.add(value(identity.puid(), "last_mod_date", "修改时间", "SYSTEM",
                identity.modifiedAt(), true, false, "COLUMN", null));

        if (type != null) {
            for (PropertyDefinition property : repository.listProperties(className)) {
                if ("puid".equalsIgnoreCase(property.propertyName())) {
                    continue;
                }
                Object raw = sourceRow.get(property.sourceColumn());
                boolean present = raw != null;
                String emptyReason = present ? null
                        : missingReason != null ? missingReason
                        : "NULL_VALUE";
                if (!includeEmpty && !present) {
                    continue;
                }
                values.add(new PropertyValue(
                        identity.puid(),
                        property.propertyName(),
                        property.displayName(),
                        property.propertyType(),
                        raw == null ? null : String.valueOf(raw),
                        raw == null ? null : String.valueOf(raw),
                        true,
                        present,
                        property.editable(),
                        property.storage(),
                        emptyReason
                ));
            }
        }
        return new ObjectProperties(
                identity.puid(),
                objectType,
                className,
                type != null,
                sourceTable,
                sourceRowPresent,
                values
        );
    }

    /** Teamcenter 的 object_string 展示串：优先"编号/版本"，否则退回对象名。 */
    private static String objectString(ObjectIdentityRow identity) {
        String itemId = identity.itemId() == null ? "" : identity.itemId().trim();
        String revision = identity.revisionId() == null ? "" : identity.revisionId().trim();
        if (!itemId.isEmpty()) {
            return revision.isEmpty() ? itemId : itemId + "/" + revision;
        }
        return identity.objectName();
    }

    @Transactional
    public void updateProperties(
            List<PropertyUpdate> updates,
            UserContext currentUser,
            String clientIp
    ) {
        if (updates == null || updates.isEmpty()) {
            throw ApiException.badRequest("没有需要保存的属性");
        }
        for (PropertyUpdate update : updates) {
            if (update == null || update.sourcePuid() == null || update.sourcePuid().isBlank()
                    || update.propertyName() == null || update.propertyName().isBlank()) {
                throw ApiException.badRequest("属性更新参数不完整");
            }
            String sourcePuid = update.sourcePuid().trim();
            String propertyName = update.propertyName().trim();
            ObjectIdentityRow identity = repository.findObjectIdentity(sourcePuid)
                    .orElseThrow(() -> ApiException.notFound("目标对象不存在: " + sourcePuid));
            String objectType = identity.objectType() == null ? "" : identity.objectType();
            ObjectType type = repository.findObjectType(objectType).orElse(null);

            if ("pobject_name".equals(propertyName) || "pobject_desc".equals(propertyName)) {
                repository.updateWorkspaceNameDesc(
                        sourcePuid,
                        "pobject_name".equals(propertyName) ? update.value() : null,
                        "pobject_desc".equals(propertyName) ? update.value() : null
                );
                repository.recordModifiedRow("pworkspaceobject", sourcePuid);
            } else {
                if (type == null) {
                    throw ApiException.badRequest("对象类型未在元数据中定义: " + objectType);
                }
                PropertyDefinition property = repository.findProperty(type.className(), propertyName)
                        .orElseThrow(() -> ApiException.badRequest("类型未定义该属性: " + propertyName));
                if (!property.editable()
                        || !"PERSISTENT".equals(property.propertyType())
                        || !"COLUMN".equals(property.storage())) {
                    throw ApiException.badRequest("该属性当前不允许编辑: " + propertyName);
                }
                if (property.sourceTable() == null || property.sourceColumn() == null) {
                    throw ApiException.badRequest("属性缺少物理存储映射: " + propertyName);
                }
                try {
                    repository.updateColumn(
                            property.sourceTable(),
                            property.sourceColumn(),
                            sourcePuid,
                            update.value()
                    );
                } catch (org.springframework.dao.DataAccessException exception) {
                    throw ApiException.badRequest(
                            "属性 " + propertyName + " 写入失败，值类型与该列不匹配或超出长度限制");
                }
                repository.recordModifiedRow(property.sourceTable(), sourcePuid);
            }
            repository.touchApplicationObject(sourcePuid, currentUser.puid());
        }

        authRepository.writeAudit(
                currentUser.puid(),
                currentUser.userId(),
                "OBJECT_PROPERTY_EDIT",
                "tc-object",
                updates.get(0).sourcePuid(),
                clientIp,
                "编辑属性数量=" + updates.size()
        );
    }

    private static PropertyValue value(
            String sourcePuid,
            String name,
            String displayName,
            String type,
            String raw,
            boolean defined,
            boolean editable,
            String storage,
            String emptyReason
    ) {
        boolean present = raw != null && !raw.isBlank();
        return new PropertyValue(
                sourcePuid,
                name,
                displayName,
                type,
                raw,
                raw,
                defined,
                present,
                editable,
                storage,
                present ? null : emptyReason == null ? "NULL_VALUE" : emptyReason
        );
    }
}
