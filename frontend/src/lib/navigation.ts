import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  GitBranch,
  Route,
  Wrench,
  FolderOpen,
  FileText,
  Hammer,
  RefreshCw,
  CheckCircle,
  BarChart3,
  Bot,
  Link2,
  Settings,
  Shield,
} from 'lucide-react'

export type NavItem = {
  title: string
  url: string
  icon: LucideIcon
}

export const workspaceNav: NavItem[] = [
  { title: '工作台', url: '/', icon: LayoutDashboard },
  { title: '制造工艺规划器', url: '/planner', icon: GitBranch },
  { title: 'MBOM 重构', url: '/mbom', icon: GitBranch },
  { title: '工艺路线', url: '/bop', icon: Route },
  { title: '工序编制', url: '/operation', icon: Wrench },
  { title: '工艺资源库', url: '/resource', icon: FolderOpen },
  { title: '工艺文件', url: '/document', icon: FileText },
  { title: '工装管理', url: '/tooling', icon: Hammer },
  { title: '工艺更改', url: '/change', icon: RefreshCw },
  { title: '工艺审批', url: '/approval', icon: CheckCircle },
  { title: '工艺汇总', url: '/summary', icon: BarChart3 },
  { title: 'AI Copilot', url: '/copilot', icon: Bot },
]

export const footerNav: NavItem[] = [
  { title: '系统集成', url: '/integration', icon: Link2 },
  { title: '设置', url: '/settings', icon: Settings },
  { title: '系统管理', url: '/admin', icon: Shield },
]

export const workspaceNavGroups = [
  { title: '概览', items: workspaceNav.slice(0, 1) },
  { title: '制造规划', items: workspaceNav.slice(1, 5) },
  { title: '资源与文档', items: workspaceNav.slice(5, 8) },
  { title: '流程管理', items: workspaceNav.slice(8, 11) },
  { title: '智能助手', items: workspaceNav.slice(11, 12) },
]
