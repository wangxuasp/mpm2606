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

通过环境变量配置：

| 变量 | 必填 | 说明 |
|------|------|------|
| `DB_HOST` | 是 | 数据库主机 |
| `DB_PORT` | 是 | 数据库端口 |
| `DB_NAME` | 是 | 数据库名 |
| `DB_SCHEMA` | 否 | Schema，默认 `public` |
| `DB_USERNAME` | 是 | 数据库用户名 |
| `DB_PASSWORD` | 是 | 数据库密码 |
| `SERVER_PORT` | 否 | 后端 HTTP 端口，默认 `8081` |

本机开发可复制 `src/main/resources/application-dev.example.yml` 为
`application-dev.yml` 后填写连接信息。实际的 `application-dev.yml` 已被 Git
忽略，不会进入仓库。

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

默认端口 `8081`，健康检查：`GET /api/health`

前端开发服务器默认 `http://localhost:3000`，已配置 CORS。

## 数据接口

- `GET /api/data`：返回可管理的数据资源元数据。
- `GET /api/data/{resource}/metadata`：返回表结构、字段标签和校验信息。
- `GET /api/data/{resource}?page=0&size=20&keyword=`：分页与关键字查询。
- `GET /api/data/{resource}/{id}`：查询单条详情。
- `POST /api/data/{resource}`：新增记录。
- `PUT /api/data/{resource}/{id}`：编辑记录。
- `DELETE /api/data/{resource}/{id}`：删除记录。

当前 `resource` 仅允许 `pitem` 和 `puser`。写接口只修改金仓展示库，
不会回写 Oracle。
