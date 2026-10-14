package com.extech.mpms.data;

import java.util.List;
import java.util.Map;

public record DataPage(
        List<Map<String, Object>> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
