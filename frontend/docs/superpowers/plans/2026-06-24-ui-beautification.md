# Extech MPMS 界面美化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply deep-space industrial visual theme — global CSS tokens, immersive login page with manufacturing photo background, and lightly refreshed Shell (sidebar/header) with dark/light theme toggle.

**Architecture:** Override shadcn CSS variables in `globals.css` for light/dark palettes; wire `next-themes` ThemeProvider (default dark); login page uses fixed dark immersive layout independent of theme toggle; Shell components consume existing `--sidebar-*` tokens with accent styling only.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui, next-themes, lucide-react, pnpm

**Spec:** `docs/superpowers/specs/2026-06-24-ui-beautification-design.md`

**Note:** 规格未要求自动化 UI 测试；每 Task 以 `pnpm build` + 手动冒烟步骤代替 TDD。

---

## File Map

| 路径 | 职责 |
| --- | --- |
| `src/app/globals.css` | 工业风明/暗色板（oklch CSS 变量） |
| `src/components/theme/theme-provider.tsx` | next-themes 薄封装 |
| `src/components/theme/theme-toggle.tsx` | 顶栏 Sun/Moon 切换按钮 |
| `src/components/providers/app-providers.tsx` | 包裹 ThemeProvider |
| `src/app/layout.tsx` | `suppressHydrationWarning` + `lang="zh-CN"` |
| `src/components/layout/app-header.tsx` | 插入 ThemeToggle |
| `src/components/layout/app-sidebar.tsx` | 品牌区 accent + 激活态竖条 |
| `public/images/login-bg.jpg` | Unsplash 免版权制造实景背景 |
| `src/app/(auth)/login/page.tsx` | 全屏背景 + 毛玻璃登录卡 |

---

### Task 1: 全局设计令牌

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: 替换 `:root` 与 `.dark` 色板**

将 `src/app/globals.css` 中 `:root { ... }` 与 `.dark { ... }` 两个块**完整替换**为：

```css
:root {
  --background: oklch(0.97 0.008 260);
  --foreground: oklch(0.28 0.03 260);
  --card: oklch(0.99 0.005 260);
  --card-foreground: oklch(0.28 0.03 260);
  --popover: oklch(0.99 0.005 260);
  --popover-foreground: oklch(0.28 0.03 260);
  --primary: oklch(0.45 0.18 264);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.94 0.01 260);
  --secondary-foreground: oklch(0.28 0.03 260);
  --muted: oklch(0.94 0.01 260);
  --muted-foreground: oklch(0.52 0.03 260);
  --accent: oklch(0.92 0.02 260);
  --accent-foreground: oklch(0.28 0.03 260);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.88 0.015 260);
  --input: oklch(0.88 0.015 260);
  --ring: oklch(0.45 0.18 264);
  --chart-1: oklch(0.72 0.14 195);
  --chart-2: oklch(0.58 0.16 240);
  --chart-3: oklch(0.50 0.18 264);
  --chart-4: oklch(0.42 0.16 280);
  --chart-5: oklch(0.35 0.12 260);
  --radius: 0.5rem;
  --sidebar: oklch(0.95 0.012 260);
  --sidebar-foreground: oklch(0.28 0.03 260);
  --sidebar-primary: oklch(0.45 0.18 264);
  --sidebar-primary-foreground: oklch(0.99 0 0);
  --sidebar-accent: oklch(0.92 0.025 260);
  --sidebar-accent-foreground: oklch(0.28 0.03 260);
  --sidebar-border: oklch(0.88 0.015 260);
  --sidebar-ring: oklch(0.45 0.18 264);
}

.dark {
  --background: oklch(0.14 0.03 260);
  --foreground: oklch(0.93 0.01 240);
  --card: oklch(0.18 0.035 260);
  --card-foreground: oklch(0.93 0.01 240);
  --popover: oklch(0.18 0.035 260);
  --popover-foreground: oklch(0.93 0.01 240);
  --primary: oklch(0.75 0.14 195);
  --primary-foreground: oklch(0.14 0.03 260);
  --secondary: oklch(0.22 0.035 260);
  --secondary-foreground: oklch(0.93 0.01 240);
  --muted: oklch(0.22 0.035 260);
  --muted-foreground: oklch(0.65 0.03 240);
  --accent: oklch(0.24 0.04 260);
  --accent-foreground: oklch(0.93 0.01 240);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.75 0.14 195);
  --chart-1: oklch(0.75 0.14 195);
  --chart-2: oklch(0.62 0.16 230);
  --chart-3: oklch(0.52 0.18 264);
  --chart-4: oklch(0.45 0.16 280);
  --chart-5: oklch(0.38 0.12 260);
  --sidebar: oklch(0.12 0.035 260);
  --sidebar-foreground: oklch(0.93 0.01 240);
  --sidebar-primary: oklch(0.75 0.14 195);
  --sidebar-primary-foreground: oklch(0.14 0.03 260);
  --sidebar-accent: oklch(0.20 0.04 260);
  --sidebar-accent-foreground: oklch(0.93 0.01 240);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.75 0.14 195);
}
```

- [ ] **Step 2: 验证编译**

```powershell
cd "c:\My Projects\Codes\mpm2606\frontend"
pnpm build
```

Expected: BUILD SUCCESS，无 CSS 相关 error。

- [ ] **Step 3: Commit**

```powershell
git add src/app/globals.css
git commit -m "style: apply industrial light/dark design tokens"
```

---

### Task 2: 主题基础设施

**Files:**
- Create: `src/components/theme/theme-provider.tsx`
- Modify: `src/components/providers/app-providers.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: 创建 ThemeProvider 封装**

创建 `src/components/theme/theme-provider.tsx`：

```tsx
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

- [ ] **Step 2: 在 AppProviders 中接入**

将 `src/components/providers/app-providers.tsx` 完整替换为：

```tsx
'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ensureSeeded } from '@/lib/db/seed'

const queryClient = new QueryClient()

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((e) => setError(e instanceof Error ? e.message : '数据库初始化失败'))
  }, [])

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-destructive">本地数据库初始化失败：{error}</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">正在初始化...</p>
      </div>
    )
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="mpms-theme"
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 3: 更新 Root Layout**

修改 `src/app/layout.tsx` 的 `<html>` 标签：

```tsx
<html
  lang="zh-CN"
  suppressHydrationWarning
  className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
>
```

- [ ] **Step 4: 验证编译**

```powershell
pnpm build
```

Expected: BUILD SUCCESS。

- [ ] **Step 5: 手动冒烟 — 默认深色**

```powershell
pnpm dev
```

打开 `http://localhost:3000/login`，浏览器 DevTools → Elements → 确认 `<html class="... dark">` 存在（登录后进入工作台同样应有 `dark` class）。

- [ ] **Step 6: Commit**

```powershell
git add src/components/theme/theme-provider.tsx src/components/providers/app-providers.tsx src/app/layout.tsx
git commit -m "feat: wire next-themes with dark default"
```

---

### Task 3: ThemeToggle + AppHeader

**Files:**
- Create: `src/components/theme/theme-toggle.tsx`
- Modify: `src/components/layout/app-header.tsx`

- [ ] **Step 1: 创建 ThemeToggle**

创建 `src/components/theme/theme-toggle.tsx`：

```tsx
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="relative size-8" disabled />
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative size-8"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">切换主题</span>
    </Button>
  )
}
```

- [ ] **Step 2: 插入 AppHeader**

在 `src/components/layout/app-header.tsx` 顶部增加 import：

```tsx
import { ThemeToggle } from '@/components/theme/theme-toggle'
```

将 `<header>` 内、`<DropdownMenu>` 之前插入：

```tsx
<ThemeToggle />
```

完整 header 右侧区域应为：

```tsx
<div className="flex items-center gap-1">
  <ThemeToggle />
  <DropdownMenu>
    ...
  </DropdownMenu>
</div>
```

同时将 header 的 className 改为：

```tsx
<header className="relative flex h-14 items-center gap-3 border-b border-border/50 px-4 md:px-6">
  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
  ...
</header>
```

- [ ] **Step 3: 手动冒烟 — 主题切换**

```powershell
pnpm dev
```

1. 登录 `admin/admin` 进入工作台
2. 点击顶栏 Sun/Moon 按钮 → 页面切换浅色
3. 刷新页面 → 仍为浅色
4. 再次点击 → 恢复深色
5. Console 无 hydration mismatch 警告

- [ ] **Step 4: Commit**

```powershell
git add src/components/theme/theme-toggle.tsx src/components/layout/app-header.tsx
git commit -m "feat: add theme toggle to app header"
```

---

### Task 4: Shell 侧栏轻度统一

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: 提取 SidebarBrand 组件**

在 `src/components/layout/app-sidebar.tsx` 的 `SidebarNav` 函数**之前**添加：

```tsx
function SidebarBrand() {
  return (
    <div className="border-b border-cyan-500/30 px-4 py-4">
      <p className="text-base font-bold tracking-wide text-primary">MPMS</p>
      <p className="text-xs text-muted-foreground">Extech 制造工艺管理系统 V11.0</p>
    </div>
  )
}

const navLinkClass = (active: boolean) =>
  cn(
    'flex items-center gap-2 rounded-md border-l-2 py-1.5 pl-2 pr-2 text-sm transition-colors',
    active
      ? 'border-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground'
      : 'border-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
  )
```

- [ ] **Step 2: 应用 navLinkClass 到所有 Link**

将 `SidebarNav` 内 workspace 导航 Link 的 `className={cn(...)}` 替换为 `className={navLinkClass(active)}`（两处：workspace items 与 footerNav items）。

- [ ] **Step 3: 替换 AppSidebar 品牌区**

将 `AppSidebar` 中：

```tsx
<div className="border-b px-4 py-4">
  <p className="text-sm font-semibold">Extech MPMS V11.0</p>
  <p className="text-xs text-muted-foreground">制造工艺管理系统</p>
</div>
```

替换为 `<SidebarBrand />`。

- [ ] **Step 4: 替换 MobileSidebar 品牌区**

将 `SheetHeader` 块替换为：

```tsx
<SidebarBrand />
```

并删除原 `SheetHeader` / `SheetTitle` import 若不再使用（`SheetHeader` 和 `SheetTitle` 可从 import 中移除）。

- [ ] **Step 5: 手动冒烟**

登录后检查：
- 侧栏顶部显示「MPMS」+ 青蓝底边
- 当前路由对应导航项有左侧 cyan 竖条
- 移动端 Sheet 品牌区与桌面一致

- [ ] **Step 6: Commit**

```powershell
git add src/components/layout/app-sidebar.tsx
git commit -m "style: refresh sidebar branding and active nav accent"
```

---

### Task 5: 登录背景图

**Files:**
- Create: `public/images/login-bg.jpg`

- [ ] **Step 1: 创建目录并下载图片**

```powershell
cd "c:\My Projects\Codes\mpm2606\frontend"
New-Item -ItemType Directory -Force -Path "public/images"
Invoke-WebRequest -Uri "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1920&q=80" -OutFile "public/images/login-bg.jpg"
```

图片来源：Unsplash（精密制造/工程师实景，Unsplash License 免版权）。

- [ ] **Step 2: 确认文件大小**

```powershell
(Get-Item "public/images/login-bg.jpg").Length / 1KB
```

Expected: 文件存在且 > 100 KB（通常 200–600 KB）。

- [ ] **Step 3: Commit**

```powershell
git add public/images/login-bg.jpg
git commit -m "assets: add login background manufacturing photo"
```

---

### Task 6: 登录页重构

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: 完整替换登录页**

将 `src/app/(auth)/login/page.tsx` **完整替换**为：

```tsx
'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { validateCredentials } from '@/lib/auth/mock-auth'
import { createSession, isAuthenticated } from '@/lib/auth/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>()

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/')
    }
  }, [router])

  const onSubmit = (data: LoginForm) => {
    const parsed = loginSchema.safeParse(data)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if (field === 'username' || field === 'password') {
          setError(field, { message: issue.message })
        }
      }
      return
    }

    if (!validateCredentials(parsed.data.username, parsed.data.password)) {
      setError('password', { message: '用户名或密码错误' })
      return
    }
    createSession()
    router.replace('/')
  }

  return (
    <div className="relative flex min-h-screen flex-col text-white">
      <Image
        src="/images/login-bg.jpg"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[#0B1120]/75 lg:bg-gradient-to-r lg:from-[#0B1120]/90 lg:via-[#0B1120]/70 lg:to-[#0B1120]/40" />

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10 lg:items-end lg:pr-16">
        <div className="w-full max-w-sm rounded-xl border border-cyan-500/20 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6 text-center">
            <p className="text-xs font-medium tracking-widest text-cyan-400/80 uppercase">
              Extech MPMS
            </p>
            <h1 className="mt-2 text-xl font-bold">制造工艺管理系统</h1>
            <p className="mt-1 text-sm text-white/60">V11.0</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username" className="text-white/80">
                用户名
              </Label>
              <Input
                id="username"
                autoComplete="username"
                className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                {...register('username')}
              />
              {errors.username && (
                <p className="text-sm text-red-400">{errors.username.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-white/80">
                密码
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="mt-2 w-full">
              登录
            </Button>
          </form>
        </div>
      </div>

      <footer className="relative px-4 pb-6 text-center text-xs text-white/50">
        © 2026 北京艾克斯科技有限公司 版权所有
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: 手动冒烟 — 登录页**

```powershell
pnpm dev
```

访问 `/login`，确认：
- 背景图全屏可见
- 桌面端卡片偏右，移动端居中
- 表单文字清晰可读
- `admin/admin` 登录成功跳转工作台
- 错误密码显示红色提示
- 登录页**无**主题切换按钮

- [ ] **Step 3: Commit**

```powershell
git add src/app/(auth)/login/page.tsx
git commit -m "feat: immersive industrial login page with photo background"
```

---

### Task 7: 最终验收

**Files:** 无新增

- [ ] **Step 1: 生产构建**

```powershell
pnpm build
```

Expected: BUILD SUCCESS，零 error。

- [ ] **Step 2: 规格验收检查表**

| # | 检查项 | 操作 |
| --- | --- | --- |
| 1 | 登录背景 + 表单可读 | 访问 `/login` |
| 2 | 响应式布局 | 缩放浏览器到 mobile 宽度 |
| 3 | 登录流程 | `admin/admin` |
| 4 | 默认深色 | 首次登录后 html 有 `dark` |
| 5 | 主题持久化 | 切浅色 → 刷新 → 仍浅色 |
| 6 | 侧栏 accent | 点击不同模块看激活竖条 |
| 7 | 业务页无回归 | 浏览 `/`、`/mbom`、`/bop` 各 1 次 |
| 8 | Console 干净 | 无 hydration warning |

- [ ] **Step 3: 最终 Commit（若有遗漏文件）**

```powershell
git status
# 若有未提交改动
git add -A
git commit -m "chore: ui beautification final polish"
```

---

## Spec Coverage（自检）

| 规格章节 | 对应 Task |
| --- | --- |
| §2 全局设计令牌 | Task 1 |
| §3 登录页 | Task 5 + Task 6 |
| §4 Shell 统一 | Task 3 + Task 4 |
| §5 主题基础设施 | Task 2 + Task 3 |
| §6 文件变更清单 | Task 1–6 全覆盖 |
| §8 验收检查表 | Task 7 |
