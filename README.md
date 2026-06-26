# MPMS 2606

Extech MPMS（制造工艺管理系统）V11.0 — 前后端分离 monorepo，面向人大金仓 KingbaseES + Linux 部署场景。

| 目录 | 说明 |
|------|------|
| [`frontend/`](frontend/) | Next.js 前端 P0 基座（IndexedDB 演示、Mock 认证、工作台与规划器） |
| [`backend/`](backend/) | Spring Boot 后端服务（KingbaseES、REST API） |

## 本地联调

前端默认 `http://localhost:3000`，后端默认 `http://localhost:8080`。后端已配置 CORS，可与前端开发服务器联调。

```bash
# 终端 1 — 后端（需 KingbaseES 可用）
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# 终端 2 — 前端
cd frontend
pnpm install
pnpm dev
```

---

## 前端

> 完整文档：[frontend/README.md](frontend/README.md)

Extech MPMS（制造工艺管理系统）V11.0 P0 基座 — 基于 Next.js App Router 的可运行空壳，包含 IndexedDB 演示数据、Mock 认证、工作台概览、只读 EBOM 规划器与 JSON 数据管理。

### 技术栈

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- Dexie.js (IndexedDB) + TanStack Query
- Zustand + Zod + React Hook Form

### 快速开始

```bash
cd frontend
pnpm install
pnpm dev
```

浏览器访问 [http://localhost:3000](http://localhost:3000)。

生产构建：

```bash
pnpm build
pnpm start
```

### 登录

- 用户名：`admin`
- 密码：`admin`

### P0 功能清单

- [x] Mock 登录与会话（localStorage）
- [x] 工作台侧栏 12 个模块入口 + 设置 + 系统管理
- [x] 工作台首页概览卡片（EBOM / 协同 / 字典 / 版本）
- [x] 制造工艺规划器 — 只读 EBOM 树 + 节点属性面板
- [x] 设置页 — JSON 导出 / 导入 / 重置种子 / 表记录数
- [x] 字典管理 — 只读 50 条字典（Tabs 筛选）
- [x] API：`GET /api/health`、`GET /api/3d/jt?nodeId=xxx`
- [x] IndexedDB 种子数据持久化（刷新后数据仍在）

### 规格文档

- 设计规格：[frontend/docs/superpowers/specs/2026-06-23-mpms-p0-foundation-design.md](frontend/docs/superpowers/specs/2026-06-23-mpms-p0-foundation-design.md)
- 实施计划：[frontend/docs/superpowers/plans/2026-06-23-mpms-p0-foundation.md](frontend/docs/superpowers/plans/2026-06-23-mpms-p0-foundation.md)

---

## 后端

> 完整文档：[backend/README.md](backend/README.md)

Extech MPMS 后端服务，技术栈详见 [backend/reqirements.md](backend/reqirements.md)。

### 技术栈

- Spring Boot 4.0.5
- JDK 21
- 人大金仓 KingbaseES V8
- HikariCP 连接池

### 前置条件

- JDK 21
- Maven 3.9+
- 可访问的 KingbaseES 实例

### 数据库配置

通过环境变量或 `application-dev.yml` 配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DB_HOST` | `localhost` | 数据库主机 |
| `DB_PORT` | `54321` | 端口 |
| `DB_NAME` | `mpms` | 库名 |
| `DB_SCHEMA` | `public` | Schema |
| `DB_USERNAME` | `system` | 用户名 |
| `DB_PASSWORD` | 空 | 密码 |

### JDBC 驱动

优先使用 Maven Central 上的 `cn.com.kingbase:kingbase8`。

若 Maven 无法解析驱动，请将 `KingbaseES_V008R006C008B0014PSC002_JDBC` 目录中的 jar 安装到本地仓库：

```bash
cd backend
mvn install:install-file ^
  -Dfile=KingbaseES_V008R006C008B0014PSC002_JDBC\kingbase8-8.6.0.jar ^
  -DgroupId=cn.com.kingbase ^
  -DartifactId=kingbase8 ^
  -Dversion=8.6.0 ^
  -Dpackaging=jar
```

然后在 `pom.xml` 中将 `kingbase.jdbc.version` 改为对应版本。

### 运行

```bash
cd backend

# 编译
mvn clean package

# 开发模式（需数据库可用）
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# 或运行 jar
java -jar target/mpms-backend-11.0.0-p0.jar --spring.profiles.active=dev
```

默认端口 `8080`，健康检查：`GET /api/health`

---

## 版权

北京艾克斯科技有限公司 · Extech MPMS V11.0
