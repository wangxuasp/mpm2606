package com.extech.mpms.repository;

import com.extech.mpms.model.Pitem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class PitemRepository {

    private final JdbcTemplate jdbcTemplate;

    public PitemRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Pitem> findAllPuidsAndPitemIds() {
        return jdbcTemplate.query(
                "SELECT puid, pitem_id FROM pitem",
                (rs, rowNum) -> new Pitem(
                        rs.getString("puid"),
                        rs.getString("pitem_id")
                )
        );
    }
}
