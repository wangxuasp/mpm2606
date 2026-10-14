# GitHub 上传检查清单

本文档定义本项目从本地仓库提交到 GitHub 前必须完成的检查。当前只初始化本地
仓库，不执行推送。

## 一、账号与仓库关系

- 当前本机 GitHub SSH 身份已验证为 `thepurshadow`。
- 目标上游仓库：`https://github.com/wangxuasp/mpm2606`。
- 如果没有该仓库的写权限，先 Fork 到 `thepurshadow/mpm2606`。
- `origin` 指向自己的 Fork，`upstream` 指向上游仓库：

```powershell
git remote add origin git@github.com:thepurshadow/mpm2606.git
git remote add upstream https://github.com/wangxuasp/mpm2606.git
git remote -v
```

只使用 SSH 推送，不在仓库、终端历史或聊天中保存 GitHub 密码和个人访问令牌。

## 二、上传前固定检查

每次准备提交或推送前执行：

```powershell
git status --short
git diff --check
git diff --cached --stat
git diff --cached
```

重点确认：

- JDBC 驱动目录、`target/`、`node_modules/`、`.next/`、日志和压缩包未被暂存。
- 真实的数据库主机、端口、账号和密码只存在于被忽略的本地 `application-dev.yml`。
- 不包含 SSH 私钥、证书、令牌、客户资料、数据库备份或交付介质。
- 不包含与本机绑定的路径、用户名或其他开发环境信息。

可用以下命令快速确认关键目录已被忽略：

```powershell
git check-ignore -v backend/KingbaseES_V008R006C008B0014PSC002_JDBC
git check-ignore -v backend/src/main/resources/application-dev.yml
git check-ignore -v frontend/node_modules frontend/.next backend/target
```

## 三、提交前验证

后端：

```powershell
cd backend
mvn test
```

前端：

```powershell
cd frontend
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

验证失败时不得提交或推送；先修复问题，再重新执行全部检查。

## 四、首次本地提交

```powershell
git add .
git status --short
git diff --cached --stat
git commit -m "chore: initialize localization platform repository"
```

提交后再次执行 `git status --short`，确认工作区干净或剩余内容仅为有意保留的
本地文件。

## 五、首次推送

首次推送前必须获得用户确认，并先确认 Fork 地址和默认分支：

```powershell
git branch --show-current
git remote -v
git push -u origin main
```

推送后检查 GitHub 页面中的文件清单，特别确认上述敏感内容均不存在。后续同步
上游或提交其他分支前，仍须重复本文件第二、三节的检查。
