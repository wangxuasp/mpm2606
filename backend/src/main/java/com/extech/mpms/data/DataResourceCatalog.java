package com.extech.mpms.data;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.extech.mpms.data.DataFieldType.DATE_TIME;
import static com.extech.mpms.data.DataFieldType.DECIMAL;
import static com.extech.mpms.data.DataFieldType.STRING;

@Component
public class DataResourceCatalog {

    private static final String PITEM = "pitem";
    private static final String PUSER = "puser";

    private final Map<String, DataResourceDefinition> resources;

    public DataResourceCatalog() {
        resources = new LinkedHashMap<>();
        resources.put(PITEM, pitem());
        resources.put(PUSER, puser());
    }

    public Optional<DataResourceDefinition> find(String key) {
        if (key == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(resources.get(key.toLowerCase()));
    }

    public List<DataResourceDefinition> all() {
        return List.copyOf(resources.values());
    }

    private static DataResourceDefinition pitem() {
        return new DataResourceDefinition(
                PITEM,
                "pitem",
                "零组件数据",
                "Teamcenter 零组件主数据，当前允许在金仓展示库中独立维护。",
                "puid",
                List.of(
                        field("puid", "PUID（主键）", STRING, 60, true, true, true),
                        field("pitem_id", "零组件 ID", STRING, 512, true, true, false),
                        field("vla_772_2", "VLA_772_2", DECIMAL, 0, true, true, false),
                        field("pfnd0originallocationcode", "原始位置编码", STRING, 128, false, true, false),
                        field("vla_772_8", "VLA_772_8", DECIMAL, 0, true, false, false),
                        field("rpreferred_global_altu", "首选全局替代件 U", STRING, 60, false, false, false),
                        field("rpreferred_global_altc", "首选全局替代件 C", DECIMAL, 0, false, false, false),
                        field("rconfiguration_object_tagu", "配置对象 TAG U", STRING, 60, true, false, false),
                        field("rconfiguration_object_tagc", "配置对象 TAG C", DECIMAL, 0, true, false, false),
                        field("ruom_tagu", "计量单位 TAG U", STRING, 60, true, false, false),
                        field("ruom_tagc", "计量单位 TAG C", DECIMAL, 0, true, false, false),
                        field("phas_variant_module", "变型模块标记", DECIMAL, 0, false, false, false),
                        field("pfnd0is_monolithic", "整体件标记", DECIMAL, 0, false, false, false),
                        field("pis_vi", "VI 标记", DECIMAL, 0, false, false, false),
                        field("pis_configuration_item", "配置项标记", DECIMAL, 0, false, true, false)
                )
        );
    }

    private static DataResourceDefinition puser() {
        return new DataResourceDefinition(
                PUSER,
                "puser",
                "用户数据",
                "Teamcenter 用户主数据，当前允许在金仓展示库中独立维护。",
                "puid",
                List.of(
                        field("puid", "PUID（主键）", STRING, 60, true, true, true),
                        field("pos_username", "用户名", STRING, 128, true, true, false),
                        field("pip_clearance", "IP 保密级别", STRING, 512, false, true, false),
                        field("pgeography", "地理区域", STRING, 8, false, true, false),
                        field("pnationality", "国籍", STRING, 8, false, true, false),
                        field("pgov_clearance", "政府保密级别", STRING, 512, false, true, false),
                        field("vla_860_13", "VLA_860_13", DECIMAL, 0, true, false, false),
                        field("vla_860_14", "VLA_860_14", DECIMAL, 0, true, false, false),
                        field("vla_860_17", "VLA_860_17", DECIMAL, 0, true, false, false),
                        field("rnewstuff_folderu", "新建文件夹 U", STRING, 60, true, false, false),
                        field("rnewstuff_folderc", "新建文件夹 C", DECIMAL, 0, true, false, false),
                        field("rpersonu", "人员 U", STRING, 60, true, false, false),
                        field("rpersonc", "人员 C", DECIMAL, 0, true, false, false),
                        field("rlocal_volumeu", "本地卷 U", STRING, 60, false, false, false),
                        field("rlocal_volumec", "本地卷 C", DECIMAL, 0, false, false, false),
                        field("rvolumeu", "默认卷 U", STRING, 60, false, false, false),
                        field("rvolumec", "默认卷 C", DECIMAL, 0, false, false, false),
                        field("rmailboxu", "邮箱 U", STRING, 60, true, false, false),
                        field("rmailboxc", "邮箱 C", DECIMAL, 0, true, false, false),
                        field("rfnd0custom_user_profileu", "自定义用户档案 U", STRING, 60, false, false, false),
                        field("rfnd0custom_user_profilec", "自定义用户档案 C", DECIMAL, 0, false, false, false),
                        field("rfnd0home_siteu", "归属站点 U", STRING, 60, false, false, false),
                        field("rfnd0home_sitec", "归属站点 C", DECIMAL, 0, false, false, false),
                        field("rhome_folderu", "主文件夹 U", STRING, 60, true, false, false),
                        field("rhome_folderc", "主文件夹 C", DECIMAL, 0, true, false, false),
                        field("pttc_date", "TTC 日期", DATE_TIME, 0, false, false, false)
                )
        );
    }

    private static DataFieldDefinition field(
            String name,
            String label,
            DataFieldType type,
            int maxLength,
            boolean required,
            boolean listVisible,
            boolean primaryKey
    ) {
        return new DataFieldDefinition(name, label, type, maxLength, required, listVisible, primaryKey);
    }
}
