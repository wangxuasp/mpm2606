# MPMS Backend

Extech MPMS 后端服务，技术栈见 `reqirements.md`。

## 技术栈

- Spring Boot 4.0.5
- JDK 21
- 人大金仓 KingbaseES V8
- HikariCP 连接池

## 前置条件

- JDK 21
- Maven 3.9+
- 可访问的 KingbaseES 实例

## 数据库配置

通过环境变量或 `application-dev.yml` 配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DB_HOST` | `localhost` | 数据库主机 |
| `DB_PORT` | `54321` | 端口 |
| `DB_NAME` | `mpms` | 库名 |
| `DB_SCHEMA` | `public` | Schema |
| `DB_USERNAME` | `system` | 用户名 |
| `DB_PASSWORD` | 空 | 密码 |

## JDBC 驱动

优先使用 Maven Central 上的 `cn.com.kingbase:kingbase8`。

若 Maven 无法解析驱动，请将 `KingbaseES_V008R006C008B0014PSC002_JDBC` 目录中的 jar 安装到本地仓库：

```bash
mvn install:install-file ^
  -Dfile=KingbaseES_V008R006C008B0014PSC002_JDBC\kingbase8-8.6.0.jar ^
  -DgroupId=cn.com.kingbase ^
  -DartifactId=kingbase8 ^
  -Dversion=8.6.0 ^
  -Dpackaging=jar
```

然后在 `pom.xml` 中将 `kingbase.jdbc.version` 改为对应版本。

## 运行

```bash
# 编译
mvn clean package

# 开发模式（需数据库可用）
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# 或运行 jar
java -jar target/mpms-backend-11.0.0-p0.jar --spring.profiles.active=dev
```

默认端口 `8080`，健康检查：`GET /api/health`

前端开发服务器默认 `http://localhost:3000`，已配置 CORS。
