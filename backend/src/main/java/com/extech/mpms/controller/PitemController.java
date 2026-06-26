package com.extech.mpms.controller;

import com.extech.mpms.model.Pitem;
import com.extech.mpms.repository.PitemRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/test")
public class PitemController {

    private final PitemRepository pitemRepository;

    public PitemController(PitemRepository pitemRepository) {
        this.pitemRepository = pitemRepository;
    }

    @GetMapping("/pitems")
    public List<Pitem> listPitems() {
        return pitemRepository.findAllPuidsAndPitemIds();
    }
}
