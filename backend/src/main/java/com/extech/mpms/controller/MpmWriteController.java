package com.extech.mpms.controller;

import com.extech.mpms.model.mpm.MpmWriteModels.AddOccurrenceRequest;
import com.extech.mpms.model.mpm.MpmWriteModels.Association;
import com.extech.mpms.model.mpm.MpmWriteModels.CandidatePage;
import com.extech.mpms.model.mpm.MpmWriteModels.CloneSubtreeRequest;
import com.extech.mpms.model.mpm.MpmWriteModels.CloneSubtreeResult;
import com.extech.mpms.model.mpm.MpmWriteModels.CreateAndMountRequest;
import com.extech.mpms.model.mpm.MpmWriteModels.CreateAndMountResult;
import com.extech.mpms.model.mpm.MpmWriteModels.OccurrenceResult;
import com.extech.mpms.model.mpm.MpmWriteModels.OccurrenceUpdateRequest;
import com.extech.mpms.model.mpm.MpmWriteModels.ResequenceResult;
import com.extech.mpms.model.mpm.MpmWriteModels.AccountabilityReport;
import com.extech.mpms.service.MpmWriteService;
import com.extech.mpms.auth.AuthInterceptor;
import com.extech.mpms.auth.UserContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/mpm")
public class MpmWriteController {

    private final MpmWriteService service;

    public MpmWriteController(MpmWriteService service) {
        this.service = service;
    }

    /** 可挂载的候选对象：零组件、工序、工艺规程。 */
    @GetMapping("/candidates")
    public CandidatePage candidates(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "") String category,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return service.listCandidates(keyword, category, limit);
    }

    /** 在指定父节点下新增结构行（挂载零组件、工序或工艺规程）。 */
    @PostMapping("/occurrence")
    public OccurrenceResult add(
            @RequestBody AddOccurrenceRequest request,
            HttpServletRequest httpRequest
    ) {
        Object user = httpRequest.getAttribute(AuthInterceptor.CURRENT_USER_ATTRIBUTE);
        String ownerPuid = user instanceof UserContext context ? context.puid() : null;
        return service.addOccurrence(request, ownerPuid);
    }

    /** 移除结构行。只删金仓展示库中的结构，不回写 Oracle。 */
    @DeleteMapping("/occurrence/{puid}")
    public Map<String, Object> remove(@PathVariable String puid) {
        service.removeOccurrence(puid);
        return Map.of("ok", true, "puid", puid);
    }

    @PutMapping("/occurrence/{puid}")
    public OccurrenceResult update(
            @PathVariable String puid,
            @RequestBody OccurrenceUpdateRequest request
    ) {
        return service.updateOccurrence(puid, request);
    }

    @PostMapping("/occurrence/{puid}/resequence")
    public ResequenceResult resequence(@PathVariable String puid) {
        return service.resequenceOccurrence(puid);
    }

    @GetMapping("/accountability-check")
    public AccountabilityReport accountability(
            @RequestParam String sourceRootPuid,
            @RequestParam String targetRootPuid
    ) {
        return service.accountabilityCheck(sourceRootPuid, targetRootPuid);
    }

    /** 平台支持新建的对象类型。 */
    @GetMapping("/object-types")
    public List<String> objectTypes() {
        return service.creatableObjectTypes();
    }

    /** 新建零组件/工艺规程/工序并挂载到指定父节点下。 */
    @PostMapping("/create-and-mount")
    public CreateAndMountResult createAndMount(
            @RequestBody CreateAndMountRequest request,
            HttpServletRequest httpRequest
    ) {
        Object user = httpRequest.getAttribute(AuthInterceptor.CURRENT_USER_ATTRIBUTE);
        String ownerPuid = user instanceof UserContext context ? context.puid() : null;
        return service.createAndMount(request, ownerPuid);
    }

    /** 整棵子树递归克隆到目标节点下。 */
    @PostMapping("/clone-subtree")
    public CloneSubtreeResult cloneSubtree(
            @RequestBody CloneSubtreeRequest request,
            HttpServletRequest httpRequest
    ) {
        Object user = httpRequest.getAttribute(AuthInterceptor.CURRENT_USER_ATTRIBUTE);
        String ownerPuid = user instanceof UserContext context ? context.puid() : null;
        return service.cloneSubtree(request, ownerPuid);
    }

    /** 反查关联：该对象被哪些产品结构或工艺路线包含。 */
    @GetMapping("/association/{puid}")
    public List<Association> associations(@PathVariable String puid) {
        return service.associations(puid);
    }
}
