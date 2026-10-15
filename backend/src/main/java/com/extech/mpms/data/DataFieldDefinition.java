package com.extech.mpms.data;

public record DataFieldDefinition(
        String name,
        String label,
        DataFieldType type,
        int maxLength,
        boolean required,
        boolean listVisible,
        boolean primaryKey
) {
}
