# Extech MPMS 界面美化设计规格

> 文档编号：MBD-MES-UI-SPEC-01  
> 版本：V1.0  
> 日期：2026-06-24  
> 依据：`自研工艺管理系统开发设计方案.md` V0.1  
> 系统名称：Extech MPMS 制造工艺管理系统 V11.0  
> 版权所有：北京艾克斯科技有限公司

---

## 1. 概述

### 1.1 目标

为 Extech MPMS 建立**深空工业风**视觉体系：重写全局设计令牌、重构登录页（实景制造背景图 + 毛玻璃登录卡）、轻度统一工作台 Shell（侧栏/顶栏），并接入明/暗主题切换（默认深色）。业务模块页面布局与交互不在本期改动范围内。

### 1.2 已确认决策

| 决策项 | 选择 |
| --- | --- |
| 范围 | 登录页 + 全局设计令牌 + Shell 轻度统一；业务页不动 |
| 视觉基调 | 深空工业风：深蓝/墨黑底 + 电光青（cyan）强调色 |
| 实现方案 | 方案一：令牌驱动 + 登录全屏沉浸 |
| 登录背景 | 实景制造图（半导体/洁净室/精密制造） |
| 图片来源 | 从 Unsplash / Pexels 选取免版权图，放入 `public/images/` |
| 主题模式 | `next-themes` 明/暗切换，默认 dark，`enableSystem={false}` |
| 登录页主题 | 固定深色沉浸风格，不受全局主题切换影响 |

### 1.3 成功标准

- [ ] 登录页全屏背景图可见，桌面端卡片右对齐、移动端居中，表单清晰可读
- [ ] 系统默认深色主题，顶栏可切换浅色，刷新后偏好保持（localStorage `mpms-theme`）
- [ ] 侧栏品牌区、激活态 accent、顶栏主题按钮与工作台视觉统一
- [ ] 业务页面无布局回归，`pnpm build` 通过，无 ThemeProvider hydration 警告
- [ ] 登录逻辑（mock-auth、session、表单校验）行为不变

### 1.4 明确不做

- 规划器、BOP、工艺卡、表格等核心业务页面 UI 改造
- 新增 webfont 或替换 Geist 字体
- 侧栏/顶栏结构性重构（导航数据、路由不变）
- 公司 Logo 矢量资产（无素材时以文字品牌区替代）
- 登录页主题切换（切换按钮仅在工作台顶栏）

---

## 2. 全局设计令牌

### 2.1 色彩（oklch，覆盖 `globals.css`）

**深色主题（`.dark`，默认）**

| 令牌 | 色值方向 | 用途 |
| --- | --- | --- |
| `background` | `#0B1120` 量级深海军蓝 | 页面底色 |
| `foreground` | 浅蓝灰 `#E2E8F0` | 主文字 |
| `primary` | 电光青 cyan-500 `#06B6D4` | 按钮、链接、焦点 |
| `primary-foreground` | 深底白字 | primary 上文字 |
| `card` | 比 background 略亮 | 卡片背景 |
| `muted` / `muted-foreground` | 蓝灰 40% / 60% | 次要文字 |
| `border` | 10% 透明度、带蓝调白 | 分隔线 |
| `ring` | cyan 焦点环 | focus 态 |
| `sidebar` | 比 background 更深 | 侧栏底色 |
| `sidebar-primary` | 青蓝高亮 | 侧栏强调 |
| `destructive` | 保持现有 shadcn 红 | 错误态 |

**浅色主题（`:root` 当 `class` 不含 `dark` 时）**

| 令牌 | 色值方向 | 用途 |
| --- | --- | --- |
| `background` | 冷灰白 `#F4F6FA` | 页面底色 |
| `foreground` | 深 slate `#1E293B` | 主文字 |
| `primary` | 工业蓝 `#1D4ED8` | 按钮、链接 |
| `sidebar` | 略深于 background 的灰蓝 | 侧栏底色 |
| `border` | 冷灰 `#E2E8F0` | 分隔线 |

**图表色**：`chart-1` ~ `chart-5` 按青 → 蓝 → indigo 渐变排列，供后续图表使用。

### 2.2 其他令牌

- **圆角**：保持 `--radius: 0.5rem`，不加大圆角
- **字体**：继续使用 Geist Sans（`--font-geist-sans`）与 Geist Mono
- **原则**：仅修改 CSS 变量，不改 shadcn 组件源码；业务页通过变量自动继承

---

## 3. 登录页设计

### 3.1 布局

```
┌─────────────────────────────────────────────┐
│  [全屏实景背景图 object-cover]                │
│  [渐变遮罩: 左→右 90%→40% 不透明深蓝]          │
│                                             │
│              ┌──────────────────┐           │
│              │  系统名称 + V11.0  │  ← 毛玻璃卡 │
│              │  用户名 / 密码      │     右对齐   │
│              │  [登录按钮 cyan]    │   (lg 以上)  │
│              └──────────────────┘           │
│  © 2026 北京艾克斯科技有限公司                  │
└─────────────────────────────────────────────┘
```

### 3.2 实现要点

| 元素 | 规格 |
| --- | --- |
| 背景图 | `public/images/login-bg.webp`（优先 WebP，备选 `.jpg`），Next.js `Image` + `fill` + `object-cover`，`priority` |
| 遮罩 | 桌面：`bg-gradient-to-r from-[#0B1120]/90 via-[#0B1120]/70 to-[#0B1120]/40`；移动：均匀 `bg-[#0B1120]/75` |
| 登录卡 | `backdrop-blur-md` + `bg-white/5` + `border border-cyan-500/20` + 轻微 shadow |
| 卡片位置 | `lg` 及以上右对齐（`justify-end pr-16`）；小屏居中 |
| 登录按钮 | `primary` 色（cyan），hover 略提亮 |
| 版权 | 页面底部固定，半透明白字 |
| 逻辑 | 不改 `validateCredentials`、`createSession`、react-hook-form 校验流程 |

### 3.3 背景图选取标准

- 主题：半导体洁净室、精密制造、光刻/工业设备等等实景
- 来源：Unsplash 或 Pexels，确认免版权商用许可
- 分辨率：≥ 1920×1080，压缩后 ≤ 500KB（WebP quality ~80）
- 文件名：`public/images/login-bg.webp`

---

## 4. Shell 轻度统一

### 4.1 AppSidebar

- **品牌区**（已有标题区增强）：显示「MPMS」简称 + 副标题「制造工艺管理系统」，底部 1px 青蓝 accent 线（`border-cyan-500/30`）
- **导航激活态**：在现有 `bg-sidebar-accent` 基础上，增加左侧 2px cyan 竖条（`border-l-2 border-primary`）
- **MobileSidebar**：Sheet 内品牌区与桌面侧栏一致
- 导航数据、`footerNav`、路由逻辑不变

### 4.2 AppHeader

- 在用户头像菜单前增加 **ThemeToggle** 组件（Sun / Moon 图标）
- 顶栏底边保持 `border-b`，可选极 subtle 顶部 cyan 渐变（1px，透明度 ≤ 20%）
- 登出、型号显示逻辑不变

### 4.3 ThemeToggle 组件

- 路径：`src/components/theme/theme-toggle.tsx`
- 依赖：`next-themes` + lucide-react（Sun, Moon）
- 行为：点击切换 `light` / `dark`；mounted 前渲染占位避免 hydration mismatch

### 4.4 Admin Layout

- 与工作台共用 `AppSidebar` / `AppHeader`，自动继承，无需单独改动

---

## 5. 主题基础设施

### 5.1 ThemeProvider 配置

在 `AppProviders` 中包裹：

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="dark"
  enableSystem={false}
  storageKey="mpms-theme"
>
```

### 5.2 Root Layout

- `<html>` 添加 `suppressHydrationWarning`（next-themes 要求）
- 保持现有 Geist 字体变量

### 5.3 登录页与主题隔离

- 登录页不读取/不渲染 ThemeToggle
- 登录页样式硬编码深色沉浸（不依赖 `.dark` class），确保无论用户上次偏好如何，登录体验一致

---

## 6. 文件变更清单

| 文件 | 动作 |
| --- | --- |
| `src/app/globals.css` | 重写 `:root` 与 `.dark` 色板 |
| `public/images/login-bg.webp` | 新增登录背景图 |
| `src/app/(auth)/login/page.tsx` | 登录 UI 重构（背景 + 毛玻璃卡） |
| `src/components/providers/app-providers.tsx` | 接入 ThemeProvider |
| `src/app/layout.tsx` | `suppressHydrationWarning` |
| `src/components/layout/app-header.tsx` | 添加 ThemeToggle |
| `src/components/layout/app-sidebar.tsx` | 品牌区 accent + 激活态竖条 |
| `src/components/theme/theme-toggle.tsx` | 新增 |

**不改动**：业务页面、mock-auth、session、导航配置、Dexie 层。

---

## 7. 风险与约束

1. **背景图加载**：大图可能影响 LCP；使用 WebP + `priority` + 适当压缩缓解
2. **AG Grid 等第三方组件**：仅继承 CSS 变量，深色下表格对比度需在实现后目视确认，本期不专门改 AG Grid 主题
3. **Hydration**：ThemeToggle 必须 `mounted` 守卫；html 需 `suppressHydrationWarning`
4. **静态导出**：若后续 `output: 'export'`，`next/image` 需配置 `unoptimized` 或使用 `<img>`；当前标准 Next.js 部署无此问题

---

## 8. 验收检查表

| # | 检查项 | 通过 |
| --- | --- | --- |
| 1 | 登录页背景图全屏显示，遮罩下表单可读 | ☐ |
| 2 | 桌面右对齐 / 移动居中布局正确 | ☐ |
| 3 | `admin/admin` 登录流程正常 | ☐ |
| 4 | 默认进入深色工作台 | ☐ |
| 5 | 顶栏切换浅色后刷新仍保持 | ☐ |
| 6 | 侧栏激活项有 cyan 竖条 | ☐ |
| 7 | 侧栏/顶栏/mobile sheet 品牌区一致 | ☐ |
| 8 | 任意业务页导航无布局破坏 | ☐ |
| 9 | `pnpm build` 零错误 | ☐ |

---

*本规格为界面美化首期（范围 A）的设计依据。业务模块深度 UI 改造留待后续迭代。*
