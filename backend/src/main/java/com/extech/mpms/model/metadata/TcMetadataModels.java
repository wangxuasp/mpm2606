package com.extech.mpms.model.metadata;

import java.util.List;

public final class TcMetadataModels {

    private TcMetadataModels() {
    }

    public record ObjectType(
            String className,
            String displayName,
            String parentClassName,
            String sourceTable
    ) {
    }

    public record PropertyDefinition(
            String propertyName,
            String displayName,
            String propertyType,
            boolean multiValued,
            boolean runtime,
            boolean compound,
            boolean editable,
            String sourceTable,
            String sourceColumn,
            String storage,
            int sortOrder
    ) {
    }

    public record PropertyValue(
            String sourcePuid,
            String propertyName,
            String displayName,
            String propertyType,
            String rawValue,
            String displayValue,
            boolean defined,
            boolean present,
            boolean editable,
            String storage,
            String emptyReason
    ) {
    }

    public record PropertyUpdate(
            String sourcePuid,
            String propertyName,
            String value
    ) {
    }

    public record PropertyUpdateRequest(
            List<PropertyUpdate> properties
    ) {
    }

    public record ObjectProperties(
            String puid,
            String objectType,
            String className,
            boolean classDefined,
            String sourceTable,
            boolean sourceRowPresent,
            List<PropertyValue> properties
    ) {
    }
}
