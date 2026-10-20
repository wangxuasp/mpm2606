package com.extech.mpms.controller;

import com.extech.mpms.auth.AuthInterceptor;
import com.extech.mpms.auth.UserContext;
import com.extech.mpms.exception.ApiException;
import com.extech.mpms.model.metadata.TcMetadataModels.ObjectProperties;
import com.extech.mpms.model.metadata.TcMetadataModels.ObjectType;
import com.extech.mpms.model.metadata.TcMetadataModels.PropertyDefinition;
import com.extech.mpms.model.metadata.TcMetadataModels.PropertyUpdateRequest;
import com.extech.mpms.model.metadata.TcRelationModels.RelationItem;
import com.extech.mpms.model.metadata.TcRelationModels.ImpactGraph;
import com.extech.mpms.model.metadata.TcRelationModels.ObjectSummary;
import com.extech.mpms.service.TcMetadataService;
import com.extech.mpms.service.TcImpactService;
import com.extech.mpms.service.TcRelationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;

@RestController
@RequestMapping("/api")
public class TcMetadataController {

    private final TcMetadataService service;
    private final TcRelationService relationService;
    private final TcImpactService impactService;

    public TcMetadataController(
            TcMetadataService service,
            TcRelationService relationService,
            TcImpactService impactService
    ) {
        this.service = service;
        this.relationService = relationService;
        this.impactService = impactService;
    }

    @GetMapping("/meta/object-types")
    public List<ObjectType> objectTypes() {
        return service.listObjectTypes();
    }

    @GetMapping("/meta/object-types/{typeName}/properties")
    public List<PropertyDefinition> properties(@PathVariable String typeName) {
        return service.listProperties(typeName);
    }

    @GetMapping("/objects/{puid}/properties")
    public ObjectProperties properties(
            @PathVariable String puid,
            @RequestParam(defaultValue = "true") boolean includeEmpty
    ) {
        return service.readProperties(puid, includeEmpty);
    }

    @GetMapping("/objects/{puid}/relations")
    public List<RelationItem> relations(
            @PathVariable String puid,
            @RequestParam(defaultValue = "both") String direction
    ) {
        return relationService.relations(puid, direction);
    }

    @GetMapping("/objects/{puid}/where-used")
    public List<RelationItem> whereUsed(@PathVariable String puid) {
        return relationService.relations(puid, "in");
    }

    @GetMapping("/objects/{puid}/where-reference")
    public List<RelationItem> whereReference(@PathVariable String puid) {
        return relationService.relations(puid, "out");
    }

    @GetMapping("/objects/{puid}/impact-analysis")
    public ImpactGraph impact(
            @PathVariable String puid,
            @RequestParam(defaultValue = "both") String direction,
            @RequestParam(defaultValue = "3") int depth
    ) {
        return impactService.impact(puid, direction, depth);
    }

    @GetMapping("/objects/{puid}/summary")
    public ObjectSummary summary(
            @PathVariable String puid,
            @RequestParam(defaultValue = "2") int depth
    ) {
        return impactService.summary(puid, depth);
    }

    @PatchMapping("/objects/{puid}/properties")
    public void updateProperties(
            @PathVariable String puid,
            @RequestBody PropertyUpdateRequest body,
            HttpServletRequest request
    ) {
        UserContext user = currentUser(request);
        service.updateProperties(
                body == null ? List.of() : body.properties(),
                user,
                request.getRemoteAddr()
        );
    }

    private UserContext currentUser(HttpServletRequest request) {
        Object user = request.getAttribute(AuthInterceptor.CURRENT_USER_ATTRIBUTE);
        if (!(user instanceof UserContext context)) {
            throw ApiException.unauthorized("请先登录");
        }
        return context;
    }
}
