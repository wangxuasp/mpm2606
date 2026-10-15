# MPMS 2606

Extech MPMS（制造工艺管理系统）V11.0 — 前后端分离 monorepo，面向人大金仓 KingbaseES + Linux 部署场景。

| 目录 | 说明 |
|------|------|
| [`frontend/`](frontend/) | Next.js 前端 P0 基座（IndexedDB 演示、Mock 认证、工作台与规划器） |
| [`backend/`](backend/) | Spring Boot 后端服务（KingbaseES、REST API） |

## 本地联调

前端默认 `http://localhost:3000`，后端默认 `http://localhost:8081`。后端已配置 CORS，可与前端开发服务器联调。

```bash
# 终端 1 — 后端（需 KingbaseES 可用）
cd backend

# 先在当前终端设置数据库连接环境变量
# PowerShell 示例：
$env:DB_HOST = "localhost"
$env:DB_PORT = "54321"
$env:DB_NAME = "kingbase"
$env:DB_SCHEMA = "public"
$env:DB_USERNAME = "system"
$env:DB_PASSWORD = "<本地数据库密码>"

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

- 演示用户名：`admin`
- 演示密码：`admin`

当前登录仍是前端 Mock 会话；接入 Teamcenter 账号体系属于下一阶段任务。

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

通过环境变量配置：

| 变量 | 必填 | 说明 |
|------|------|------|
| `DB_HOST` | 是 | 数据库主机 |
| `DB_PORT` | 是 | 数据库端口 |
| `DB_NAME` | 是 | 数据库名 |
| `DB_SCHEMA` | 否 | Schema，默认 `public` |
| `DB_USERNAME` | 是 | 数据库用户名 |
| `DB_PASSWORD` | 是 | 数据库密码 |

本机开发可复制 `backend/src/main/resources/application-dev.example.yml` 为
`application-dev.yml` 后填写连接信息。实际的 `application-dev.yml` 已被 Git
忽略，只保留在开发机本地。

### JDBC 驱动

优先使用 Maven Central 上的 `cn.com.kingbase:kingbase8`。

若 Maven 无法解析驱动，请将 `KingbaseES_V008R006C008B0014PSC002_JDBC` 目录中的 jar 安装到本地仓库：

> 本地 JDBC 驱动交付目录已加入 `.gitignore`，不会提交到 GitHub。

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

默认端口 `8081`，健康检查：`GET /api/health`

数据管理接口位于 `/api/data`，当前支持 `pitem`、`puser` 的查询、详情、
新增、编辑和删除。前端工作区提供“零组件数据”和“用户数据”两个入口。

---

## GitHub 上传

首次上传前必须完成敏感信息检查、后端测试、前端构建和提交文件审计。完整流程见
[`GITHUB_UPLOAD.md`](GITHUB_UPLOAD.md)。

---

## 版权

北京艾克斯科技有限公司 · Extech MPMS V11.0
