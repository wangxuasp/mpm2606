package com.extech.mpms.data;

import java.util.List;
import java.util.Optional;

public record DataResourceDefinition(
        String key,
        String tableName,
        String label,
        String description,
        String primaryKey,
        List<DataFieldDefinition> fields
) {
    public Optional<DataFieldDefinition> findField(String name) {
        return fields.stream()
                .filter(field -> field.name().equals(name))
                .findFirst();
    }
}
