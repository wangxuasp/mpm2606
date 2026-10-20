package com.extech.mpms.service;

import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.metadata.TcRelationModels.RelationItem;
import com.extech.mpms.repository.TcRelationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class TcRelationService {

    private final TcRelationRepository repository;

    public TcRelationService(TcRelationRepository repository) {
        this.repository = repository;
    }

    public List<RelationItem> relations(String puid, String requestedDirection) {
        if (puid == null || puid.isBlank()) {
            throw ApiException.badRequest("对象 PUID 不能为空");
        }
        String direction = requestedDirection == null
                ? "both"
                : requestedDirection.trim().toLowerCase(Locale.ROOT);
        if (!List.of("in", "out", "both").contains(direction)) {
            throw ApiException.badRequest("direction 只能是 in、out 或 both");
        }
        return repository.listRelations(puid.trim(), direction);
    }
}
