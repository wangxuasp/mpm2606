package com.extech.mpms.service;

import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.mpm.MpmModels.CatalogEntry;
import com.extech.mpms.model.mpm.MpmModels.ObjectSummary;
import com.extech.mpms.repository.MpmReadRepository;
import com.extech.mpms.repository.MpmReadRepository.OccurrenceRow;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MpmReadServiceTest {

    @Test
    void assemblesNestedTreeAndStopsAtCycles() {
        FakeMpmReadRepository repository = new FakeMpmReadRepository();
        repository.summaries.put("ROOT", summary("ROOT", "ROOT-001", "根节点", "Item"));
        repository.occurrences.add(occurrence("ROOT", "OCC-1", "CHILD", "CHILD-001", "子件", "Part"));
        repository.occurrences.add(occurrence("CHILD", "OCC-2", "ROOT", "ROOT-001", "根节点", "Item"));
        MpmReadService service = new MpmReadService(repository);

        var tree = service.getTree("ROOT");

        assertThat(tree.root().code()).isEqualTo("ROOT-001");
        assertThat(tree.nodes()).hasSize(2);
        assertThat(tree.nodes().get(0).level()).isEqualTo(1);
        assertThat(tree.nodes().get(1).parentId()).isEqualTo("OCC-1");
        assertThat(tree.nodes().get(1).level()).isEqualTo(2);
    }

    @Test
    void resolvesRevisionToOwningItem() {
        FakeMpmReadRepository repository = new FakeMpmReadRepository();
        repository.itemPuids.put("REV-1", "ITEM-1");
        repository.summaries.put("ITEM-1", summary("ITEM-1", "CODE-1", "对象", "Item"));
        MpmReadService service = new MpmReadService(repository);

        var detail = service.getNode("REV-1");

        assertThat(detail.object().puid()).isEqualTo("ITEM-1");
    }

    @Test
    void rejectsInvalidPagination() {
        MpmReadService service = new MpmReadService(new FakeMpmReadRepository());

        assertThatThrownBy(() -> service.listItems(-1, 20, "", ""))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("页码");
        assertThatThrownBy(() -> service.listItems(0, 500, "", ""))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("每页记录数");
    }

    private ObjectSummary summary(
            String puid,
            String code,
            String name,
            String objectType
    ) {
        return new ObjectSummary(
                puid,
                code,
                name,
                "",
                objectType,
                "A",
                puid + "-REV",
                "",
                "",
                null,
                null
        );
    }

    private OccurrenceRow occurrence(
            String parentItemPuid,
            String occurrencePuid,
            String childItemPuid,
            String childCode,
            String childName,
            String childType
    ) {
        return new OccurrenceRow(
                parentItemPuid,
                occurrencePuid,
                childItemPuid + "-OBJECT",
                childItemPuid,
                childCode,
                childName,
                childType,
                "A",
                childItemPuid + "-REV",
                BigDecimal.ONE,
                "10"
        );
    }

    private static final class FakeMpmReadRepository extends MpmReadRepository {

        private final java.util.Map<String, String> itemPuids = new java.util.HashMap<>();
        private final java.util.Map<String, ObjectSummary> summaries = new java.util.HashMap<>();
        private final List<OccurrenceRow> occurrences = new java.util.ArrayList<>();

        private FakeMpmReadRepository() {
            super(null);
        }

        @Override
        public Optional<String> findItemPuidForObject(String puid) {
            if (summaries.containsKey(puid)) {
                return Optional.of(puid);
            }
            return Optional.ofNullable(itemPuids.get(puid));
        }

        @Override
        public Optional<ObjectSummary> findItemSummary(String itemPuid) {
            return Optional.ofNullable(summaries.get(itemPuid));
        }

        @Override
        public List<OccurrenceRow> findOccurrences() {
            return List.copyOf(occurrences);
        }

        @Override
        public List<CatalogEntry> findCatalogEntries() {
            return List.of();
        }

        @Override
        public List<com.extech.mpms.model.mpm.MpmModels.Relation> findRelations(
                String itemPuid,
                String revisionPuid
        ) {
            return List.of();
        }

        @Override
        public List<com.extech.mpms.model.mpm.MpmModels.Attachment> findForms(
                java.util.Collection<String> puids
        ) {
            return List.of();
        }

        @Override
        public List<com.extech.mpms.model.mpm.MpmModels.Attachment> findDatasets(
                java.util.Collection<String> puids
        ) {
            return List.of();
        }
    }
}
