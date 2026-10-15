package com.extech.mpms.repository;

import com.extech.mpms.data.DataResourceDefinition;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class LocalizationDataRepository {

    private final JdbcTemplate jdbcTemplate;

    public LocalizationDataRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public long count(DataResourceDefinition resource, String keyword) {
        String normalized = normalizeKeyword(keyword);
        if (normalized == null) {
            Long value = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM " + table(resource),
                    Long.class
            );
            return value == null ? 0L : value;
        }

        List<String> searchableColumns = resource.fields().stream()
                .map(field -> "LOWER(CAST(" + identifier(field.name()) + " AS VARCHAR)) LIKE LOWER(?)")
                .toList();
        String sql = "SELECT COUNT(*) FROM " + table(resource)
                + " WHERE " + String.join(" OR ", searchableColumns);
        List<Object> arguments = new ArrayList<>();
        for (int i = 0; i < resource.fields().size(); i++) {
            arguments.add(normalized);
        }
        Long value = jdbcTemplate.queryForObject(sql, Long.class, arguments.toArray());
        return value == null ? 0L : value;
    }

    public List<Map<String, Object>> findAll(
            DataResourceDefinition resource,
            String keyword,
            int page,
            int size
    ) {
        StringBuilder sql = new StringBuilder("SELECT ")
                .append(selectColumns(resource))
                .append(" FROM ")
                .append(table(resource));
        List<Object> arguments = new ArrayList<>();
        String normalized = normalizeKeyword(keyword);
        if (normalized != null) {
            List<String> searchableColumns = resource.fields().stream()
                    .map(field -> "LOWER(CAST(" + identifier(field.name()) + " AS VARCHAR)) LIKE LOWER(?)")
                    .toList();
            sql.append(" WHERE ").append(String.join(" OR ", searchableColumns));
            for (int i = 0; i < resource.fields().size(); i++) {
                arguments.add(normalized);
            }
        }
        sql.append(" ORDER BY ").append(identifier(resource.primaryKey()))
                .append(" ASC LIMIT ? OFFSET ?");
        arguments.add(size);
        arguments.add((long) page * size);

        return jdbcTemplate.query(
                sql.toString(),
                preparedStatement -> bind(preparedStatement, arguments),
                (resultSet, rowNum) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (var field : resource.fields()) {
                        row.put(field.name(), normalizeValue(resultSet.getObject(field.name())));
                    }
                    return row;
                }
        );
    }

    public Optional<Map<String, Object>> findById(DataResourceDefinition resource, String id) {
        String sql = "SELECT " + selectColumns(resource)
                + " FROM " + table(resource)
                + " WHERE " + identifier(resource.primaryKey()) + " = ?";
        List<Map<String, Object>> rows = jdbcTemplate.query(
                sql,
                (resultSet, rowNum) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (var field : resource.fields()) {
                        row.put(field.name(), normalizeValue(resultSet.getObject(field.name())));
                    }
                    return row;
                },
                id
        );
        return rows.stream().findFirst();
    }

    public long countByPrimaryKey(DataResourceDefinition resource, String id) {
        Long value = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + table(resource)
                        + " WHERE " + identifier(resource.primaryKey()) + " = ?",
                Long.class,
                id
        );
        return value == null ? 0L : value;
    }

    public int insert(DataResourceDefinition resource, Map<String, Object> values) {
        List<String> columns = resource.fields().stream()
                .map(field -> identifier(field.name()))
                .toList();
        List<Object> arguments = resource.fields().stream()
                .map(field -> values.get(field.name()))
                .toList();
        String placeholders = String.join(", ", java.util.Collections.nCopies(columns.size(), "?"));
        String sql = "INSERT INTO " + table(resource)
                + " (" + String.join(", ", columns) + ") VALUES (" + placeholders + ")";
        return update(sql, arguments);
    }

    public int update(DataResourceDefinition resource, Map<String, Object> values) {
        List<Object> arguments = new ArrayList<>();
        List<String> assignments = new ArrayList<>();
        for (var field : resource.fields()) {
            if (!field.primaryKey()) {
                assignments.add(identifier(field.name()) + " = ?");
                arguments.add(values.get(field.name()));
            }
        }
        arguments.add(values.get(resource.primaryKey()));
        String sql = "UPDATE " + table(resource)
                + " SET " + String.join(", ", assignments)
                + " WHERE " + identifier(resource.primaryKey()) + " = ?";
        return update(sql, arguments);
    }

    public int deleteByPrimaryKey(DataResourceDefinition resource, String id) {
        return jdbcTemplate.update(
                "DELETE FROM " + table(resource)
                        + " WHERE " + identifier(resource.primaryKey()) + " = ?",
                id
        );
    }

    private int update(String sql, List<Object> arguments) {
        return jdbcTemplate.update(sql, preparedStatement -> bind(preparedStatement, arguments));
    }

    private void bind(PreparedStatement preparedStatement, List<Object> arguments) throws SQLException {
        for (int i = 0; i < arguments.size(); i++) {
            preparedStatement.setObject(i + 1, arguments.get(i));
        }
    }

    private String selectColumns(DataResourceDefinition resource) {
        return resource.fields().stream()
                .map(field -> identifier(field.name()))
                .collect(java.util.stream.Collectors.joining(", "));
    }

    private String table(DataResourceDefinition resource) {
        return identifier("public") + "." + identifier(resource.tableName());
    }

    private String identifier(String value) {
        if (value == null || !value.matches("[a-z][a-z0-9_]*")) {
            throw new IllegalArgumentException("非法数据库标识符: " + value);
        }
        return "\"" + value + "\"";
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        return "%" + keyword.trim() + "%";
    }

    private Object normalizeValue(Object value) {
        if (value instanceof Timestamp timestamp) {
            LocalDateTime dateTime = timestamp.toLocalDateTime();
            return dateTime.toString();
        }
        return value;
    }
}
