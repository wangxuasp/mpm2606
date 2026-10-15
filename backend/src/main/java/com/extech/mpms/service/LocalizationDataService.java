package com.extech.mpms.service;

import com.extech.mpms.data.DataFieldDefinition;
import com.extech.mpms.data.DataPage;
import com.extech.mpms.data.DataResourceCatalog;
import com.extech.mpms.data.DataResourceDefinition;
import com.extech.mpms.exception.ApiException;
import com.extech.mpms.repository.LocalizationDataRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class LocalizationDataService {

    private static final int MAX_PAGE_SIZE = 200;

    private final DataResourceCatalog catalog;
    private final LocalizationDataRepository repository;

    public LocalizationDataService(
            DataResourceCatalog catalog,
            LocalizationDataRepository repository
    ) {
        this.catalog = catalog;
        this.repository = repository;
    }

    public List<DataResourceDefinition> listResources() {
        return catalog.all();
    }

    public DataResourceDefinition getResource(String resourceKey) {
        return catalog.find(resourceKey)
                .orElseThrow(() -> ApiException.notFound("未知数据资源: " + resourceKey));
    }

    public DataPage list(String resourceKey, int page, int size, String keyword) {
        DataResourceDefinition resource = getResource(resourceKey);
        if (page < 0) {
            throw ApiException.badRequest("页码不能小于 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw ApiException.badRequest("每页记录数必须在 1 到 " + MAX_PAGE_SIZE + " 之间");
        }

        long total = repository.count(resource, keyword);
        int totalPages = total == 0 ? 0 : (int) ((total + size - 1) / size);
        List<Map<String, Object>> content = repository.findAll(resource, keyword, page, size);
        return new DataPage(content, page, size, total, totalPages);
    }

    public Map<String, Object> findById(String resourceKey, String id) {
        DataResourceDefinition resource = getResource(resourceKey);
        ensureSingleRow(resource, id);
        return repository.findById(resource, id)
                .orElseThrow(() -> ApiException.notFound(resource.label() + "记录不存在: " + id));
    }

    @Transactional
    public Map<String, Object> create(String resourceKey, Map<String, Object> input) {
        DataResourceDefinition resource = getResource(resourceKey);
        rejectUnknownFields(resource, input);
        Map<String, Object> converted = convertValues(resource, input);
        validateRequiredFields(resource, converted);

        String primaryKey = asString(converted.get(resource.primaryKey()), resource.primaryKey());
        if (repository.countByPrimaryKey(resource, primaryKey) > 0) {
            throw ApiException.conflict(resource.primaryKey() + " 已存在: " + primaryKey);
        }

        repository.insert(resource, converted);
        return repository.findById(resource, primaryKey)
                .orElseThrow(() -> ApiException.conflict("记录已写入，但回读失败，请刷新列表确认"));
    }

    @Transactional
    public Map<String, Object> update(
            String resourceKey,
            String id,
            Map<String, Object> input
    ) {
        DataResourceDefinition resource = getResource(resourceKey);
        ensureSingleRow(resource, id);
        rejectUnknownFields(resource, input);

        Map<String, Object> existing = repository.findById(resource, id)
                .orElseThrow(() -> ApiException.notFound(resource.label() + "记录不存在: " + id));
        Map<String, Object> merged = new LinkedHashMap<>(existing);
        input.forEach((name, value) -> {
            if (!name.equals(resource.primaryKey())) {
                merged.put(name, value);
            }
        });
        merged.put(resource.primaryKey(), id);

        Map<String, Object> converted = convertValues(resource, merged);
        validateRequiredFields(resource, converted);
        int affected = repository.update(resource, converted);
        if (affected != 1) {
            throw ApiException.conflict("更新影响行数为 " + affected + "，已拒绝不确定写入");
        }
        return repository.findById(resource, id)
                .orElseThrow(() -> ApiException.conflict("记录已更新，但回读失败，请刷新列表确认"));
    }

    @Transactional
    public void delete(String resourceKey, String id) {
        DataResourceDefinition resource = getResource(resourceKey);
        ensureSingleRow(resource, id);
        int affected = repository.deleteByPrimaryKey(resource, id);
        if (affected != 1) {
            throw ApiException.conflict("删除影响行数为 " + affected + "，已拒绝不确定写入");
        }
    }

    private void ensureSingleRow(DataResourceDefinition resource, String id) {
        long count = repository.countByPrimaryKey(resource, id);
        if (count == 0) {
            throw ApiException.notFound(resource.label() + "记录不存在: " + id);
        }
        if (count > 1) {
            throw ApiException.conflict(
                    resource.primaryKey() + " 存在 " + count + " 条重复记录，禁止执行单条操作: " + id
            );
        }
    }

    private void rejectUnknownFields(
            DataResourceDefinition resource,
            Map<String, Object> input
    ) {
        for (String name : input.keySet()) {
            if (resource.findField(name).isEmpty()) {
                throw ApiException.badRequest("不支持的字段: " + name);
            }
        }
    }

    private Map<String, Object> convertValues(
            DataResourceDefinition resource,
            Map<String, Object> input
    ) {
        Map<String, Object> converted = new LinkedHashMap<>();
        for (DataFieldDefinition field : resource.fields()) {
            if (input.containsKey(field.name())) {
                converted.put(field.name(), convertValue(field, input.get(field.name())));
            } else {
                converted.put(field.name(), null);
            }
        }
        return converted;
    }

    private Object convertValue(DataFieldDefinition field, Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String text && text.isBlank()) {
            return null;
        }

        return switch (field.type()) {
            case STRING -> {
                String text = String.valueOf(value);
                if (field.maxLength() > 0 && text.length() > field.maxLength()) {
                    throw ApiException.badRequest(
                            field.label() + " 长度不能超过 " + field.maxLength() + " 个字符"
                    );
                }
                yield text;
            }
            case DECIMAL -> {
                try {
                    yield new BigDecimal(String.valueOf(value).trim());
                } catch (NumberFormatException exception) {
                    throw ApiException.badRequest(field.label() + " 必须是有效数字");
                }
            }
            case DATE_TIME -> parseDateTime(field, value);
        };
    }

    private LocalDateTime parseDateTime(DataFieldDefinition field, Object value) {
        if (value instanceof LocalDateTime dateTime) {
            return dateTime;
        }
        String text = String.valueOf(value).trim().replace(' ', 'T');
        try {
            return LocalDateTime.parse(text);
        } catch (DateTimeParseException exception) {
            throw ApiException.badRequest(
                    field.label() + " 必须是 yyyy-MM-ddTHH:mm 格式的日期时间"
            );
        }
    }

    private void validateRequiredFields(
            DataResourceDefinition resource,
            Map<String, Object> values
    ) {
        for (DataFieldDefinition field : resource.fields()) {
            if (field.required() && values.get(field.name()) == null) {
                throw ApiException.badRequest(field.label() + " 不能为空");
            }
        }
    }

    private String asString(Object value, String fieldName) {
        if (value == null) {
            throw ApiException.badRequest(fieldName + " 不能为空");
        }
        return String.valueOf(value);
    }
}
