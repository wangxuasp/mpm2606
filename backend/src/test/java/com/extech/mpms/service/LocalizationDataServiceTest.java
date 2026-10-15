package com.extech.mpms.service;

import com.extech.mpms.data.DataResourceCatalog;
import com.extech.mpms.exception.ApiException;
import com.extech.mpms.repository.LocalizationDataRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalizationDataServiceTest {

    private FakeLocalizationDataRepository repository;
    private LocalizationDataService service;

    @BeforeEach
    void setUp() {
        repository = new FakeLocalizationDataRepository();
        service = new LocalizationDataService(new DataResourceCatalog(), repository);
    }

    @Test
    void rejectsUnknownFieldsBeforeWriting() {
        Map<String, Object> input = validPitem();
        input.put("raw_sql", "drop table pitem");

        assertThatThrownBy(() -> service.create("pitem", input))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("不支持的字段");
    }

    @Test
    void rejectsDuplicatePrimaryKey() {
        repository.records.put("A5R57zrz5gyWHC", validPitem());

        assertThatThrownBy(() -> service.create("pitem", validPitem()))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("已存在");
    }

    @Test
    void updateMergesSubmittedFieldsWithExistingValues() {
        repository.records.put("A5R57zrz5gyWHC", validPitem());

        Map<String, Object> updated = service.update(
                "pitem",
                "A5R57zrz5gyWHC",
                Map.of("pitem_id", "UPDATED-001")
        );

        assertThat(updated)
                .containsEntry("pitem_id", "UPDATED-001")
                .containsEntry("vla_772_2", new BigDecimal("0"));
    }

    @Test
    void refusesSingleRowMutationWhenPrimaryKeyIsDuplicated() {
        repository.duplicateCount = 2L;

        assertThatThrownBy(() -> service.delete("pitem", "DUPLICATE"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("重复记录");
    }

    private Map<String, Object> validPitem() {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("puid", "A5R57zrz5gyWHC");
        values.put("pitem_id", "000026");
        values.put("vla_772_2", "0");
        values.put("pfnd0originallocationcode", null);
        values.put("vla_772_8", "0");
        values.put("rpreferred_global_altu", null);
        values.put("rpreferred_global_altc", null);
        values.put("rconfiguration_object_tagu", "AAAAAAAAAAAAAA");
        values.put("rconfiguration_object_tagc", "-1");
        values.put("ruom_tagu", "AAAAAAAAAAAAAA");
        values.put("ruom_tagc", "-1");
        values.put("phas_variant_module", null);
        values.put("pfnd0is_monolithic", null);
        values.put("pis_vi", null);
        values.put("pis_configuration_item", "0");
        return values;
    }

    private static final class FakeLocalizationDataRepository
            extends LocalizationDataRepository {

        private final Map<String, Map<String, Object>> records = new LinkedHashMap<>();
        private long duplicateCount;

        private FakeLocalizationDataRepository() {
            super(null);
        }

        @Override
        public long countByPrimaryKey(
                com.extech.mpms.data.DataResourceDefinition resource,
                String id
        ) {
            if (duplicateCount > 0) {
                return duplicateCount;
            }
            return records.containsKey(id) ? 1L : 0L;
        }

        @Override
        public Optional<Map<String, Object>> findById(
                com.extech.mpms.data.DataResourceDefinition resource,
                String id
        ) {
            Map<String, Object> row = records.get(id);
            return row == null ? Optional.empty() : Optional.of(new LinkedHashMap<>(row));
        }

        @Override
        public int insert(
                com.extech.mpms.data.DataResourceDefinition resource,
                Map<String, Object> values
        ) {
            records.put(String.valueOf(values.get(resource.primaryKey())), new LinkedHashMap<>(values));
            return 1;
        }

        @Override
        public int update(
                com.extech.mpms.data.DataResourceDefinition resource,
                Map<String, Object> values
        ) {
            records.put(String.valueOf(values.get(resource.primaryKey())), new LinkedHashMap<>(values));
            return 1;
        }

        @Override
        public int deleteByPrimaryKey(
                com.extech.mpms.data.DataResourceDefinition resource,
                String id
        ) {
            return records.remove(id) == null ? 0 : 1;
        }
    }
}
