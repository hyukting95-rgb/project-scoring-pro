# Vercel 手动部署步骤

## 1. 准备工作

确保您已经：
- 拥有一个 Vercel 账户
- 已经解决了以下功能问题：
  - ✅ 系统界面显示不稳定问题（通过重置所有表单状态变量解决）
  - ✅ 数据隔离功能问题（通过创建 Supabase RPC 函数解决）
  - ✅ 数据看板加载问题（通过修复 useEffect 依赖解决）

## 2. 获取构建包

在当前项目目录下，我已经为您创建了构建包：
- 文件名：`project-scoring-pro-build.zip`
- 位置：`d:\project\project-scoring-pro\project-scoring-pro-build.zip`

这个构建包包含了所有修复后的前端代码构建文件。

## 3. 手动部署到 Vercel

### 步骤 1：登录 Vercel

1. 打开 Vercel 网站：[https://vercel.com/](https://vercel.com/)
2. 登录您的 Vercel 账户

### 步骤 2：创建新项目

1. 点击右上角的 "New Project" 按钮
2. 在 "Import Project" 页面中，选择 "Import Git Repository" 或 "Drag and Drop"

### 步骤 3：上传构建包

1. 如果选择 "Drag and Drop"：
   - 直接将 `project-scoring-pro-build.zip` 文件拖放到指定区域
   - 或者点击 "Select files" 选择构建包

2. 如果选择 "Import Git Repository"：
   - 确保您已经将修复后的代码推送到 GitHub 仓库
   - 如果网络问题导致推送失败，请尝试以下方法：
     ```bash
     # 配置 Git 使用 HTTPS 代理（如果需要）
     git config --global http.proxy http://proxy.example.com:8080
     git config --global https.proxy http://proxy.example.com:8080
     
     # 或者使用 SSH 连接（如果已配置 SSH 密钥）
     git remote set-url origin git@github.com:hyukting95-rgb/project-scoring-pro.git
     git push origin main
     ```
   - 然后在 Vercel 中选择您的仓库进行导入

### 步骤 4：配置项目

1. 项目名称：保持默认或自定义
2. 构建命令：不需要（因为我们使用的是预构建的静态文件）
3. 输出目录：不需要（因为构建包已经包含了完整的输出）
4. 环境变量：
   - 如果您的项目需要环境变量（如 Supabase URL 和 Anon Key），请在此处添加
   - 例如：
     - `VITE_SUPABASE_URL`: 您的 Supabase 项目 URL
     - `VITE_SUPABASE_ANON_KEY`: 您的 Supabase Anon Key

### 步骤 5：部署项目

1. 点击 "Deploy" 按钮开始部署
2. 等待部署完成（通常需要几分钟）
3. 部署成功后，Vercel 会提供一个 URL，您可以通过该 URL 访问您的应用

## 4. 验证部署结果

部署完成后，请验证以下功能是否正常工作：

1. **项目录入界面**：刷新多次后，所有按钮和功能是否完整显示
2. **数据隔离功能**：
   - 使用管理员账户登录，检查是否能看到所有用户新增的数据
   - 使用普通用户账户登录，检查是否只能看到自己新增的数据
3. **数据看板加载**：
   - 登录系统后，检查数据看板是否能自动加载所有现有数据
   - 不需要新增项目就能看到历史数据

## 5. 后续维护

- 如果您对代码进行了新的修改，需要重新构建并部署：
  ```bash
  npm run build  # 重新构建项目
  powershell Compress-Archive -Path .\dist\* -DestinationPath .\project-scoring-pro-build.zip  # 重新创建构建包
  ```
- 然后重复上述手动部署步骤

## 6. 解决常见问题

### 问题：部署后功能不完整
解决：清除浏览器缓存后重新访问

### 问题：数据无法加载
解决：检查环境变量是否正确配置，特别是 Supabase 相关的 URL 和 Key

### 问题：权限问题
解决：确保 Supabase 中的 RLS 规则和 RPC 函数配置正确

---

如果您在部署过程中遇到任何问题，请随时联系我获取帮助。