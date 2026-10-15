package com.extech.mpms.controller;

import com.extech.mpms.model.mpm.MpmModels.Catalog;
import com.extech.mpms.model.mpm.MpmModels.NodeDetail;
import com.extech.mpms.model.mpm.MpmModels.ObjectSummary;
import com.extech.mpms.model.mpm.MpmModels.Page;
import com.extech.mpms.model.mpm.MpmModels.TreeResponse;
import com.extech.mpms.service.MpmReadService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/mpm")
public class MpmReadController {

    private final MpmReadService service;

    public MpmReadController(MpmReadService service) {
        this.service = service;
    }

    @GetMapping("/items")
    public Page<ObjectSummary> listItems(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "") String objectType
    ) {
        return service.listItems(page, size, keyword, objectType);
    }

    @GetMapping("/types")
    public List<String> listObjectTypes() {
        return service.listObjectTypes();
    }

    @GetMapping("/catalog")
    public Catalog getCatalog() {
        return service.getCatalog();
    }

    @GetMapping("/tree/{puid}")
    public TreeResponse getTree(@PathVariable String puid) {
        return service.getTree(puid);
    }

    @GetMapping("/node/{puid}")
    public NodeDetail getNode(@PathVariable String puid) {
        return service.getNode(puid);
    }
}
