package com.extech.mpms.controller;

import com.extech.mpms.data.DataPage;
import com.extech.mpms.data.DataResourceDefinition;
import com.extech.mpms.service.LocalizationDataService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/data")
public class LocalizationDataController {

    private final LocalizationDataService dataService;

    public LocalizationDataController(LocalizationDataService dataService) {
        this.dataService = dataService;
    }

    @GetMapping
    public List<DataResourceDefinition> listResources() {
        return dataService.listResources();
    }

    @GetMapping("/{resource}/metadata")
    public DataResourceDefinition metadata(@PathVariable String resource) {
        return dataService.getResource(resource);
    }

    @GetMapping("/{resource}")
    public DataPage list(
            @PathVariable String resource,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String keyword
    ) {
        return dataService.list(resource, page, size, keyword);
    }

    @GetMapping("/{resource}/{id}")
    public Map<String, Object> detail(
            @PathVariable String resource,
            @PathVariable String id
    ) {
        return dataService.findById(resource, id);
    }

    @PostMapping("/{resource}")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(
            @PathVariable String resource,
            @RequestBody Map<String, Object> input
    ) {
        return dataService.create(resource, input);
    }

    @PutMapping("/{resource}/{id}")
    public Map<String, Object> update(
            @PathVariable String resource,
            @PathVariable String id,
            @RequestBody Map<String, Object> input
    ) {
        return dataService.update(resource, id, input);
    }

    @DeleteMapping("/{resource}/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable String resource,
            @PathVariable String id
    ) {
        dataService.delete(resource, id);
    }
}
