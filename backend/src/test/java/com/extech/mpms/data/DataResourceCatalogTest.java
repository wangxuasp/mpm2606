package com.extech.mpms.data;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DataResourceCatalogTest {

    private final DataResourceCatalog catalog = new DataResourceCatalog();

    @Test
    void exposesOnlyTheTwoMigratedResources() {
        assertThat(catalog.all())
                .extracting(DataResourceDefinition::key)
                .containsExactly("pitem", "puser");
    }

    @Test
    void mapsTheActualKingbaseColumnCounts() {
        assertThat(catalog.find("pitem").orElseThrow().fields()).hasSize(15);
        assertThat(catalog.find("puser").orElseThrow().fields()).hasSize(26);
    }

    @Test
    void usesLowercaseDatabaseIdentifiers() {
        for (DataResourceDefinition resource : catalog.all()) {
            assertThat(resource.tableName()).isEqualTo(resource.tableName().toLowerCase());
            assertThat(resource.fields())
                    .allSatisfy(field -> assertThat(field.name()).isEqualTo(field.name().toLowerCase()));
        }
    }
}
