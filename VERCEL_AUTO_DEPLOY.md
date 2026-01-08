# Vercel自动部署指南

## 1. Vercel自动部署原理

Vercel采用基于Git的自动部署机制，当你将代码推送到GitHub仓库时，Vercel会自动检测变更并触发部署流程：

1. **代码推送** → 2. **Vercel检测到变更** → 3. **自动构建** → 4. **部署到Vercel服务器** → 5. **生成预览链接**

## 2. 前提条件

- ✅ 项目代码已推送到GitHub仓库
- ✅ GitHub仓库：`https://github.com/hyukting95-rgb/project-scoring-pro`
- ✅ Vercel账户（使用GitHub账户登录即可）

## 3. 配置Vercel自动部署

### 步骤1：登录Vercel

访问 [Vercel官网](https://vercel.com/)，点击右上角"Sign In"，使用GitHub账户登录。

### 步骤2：导入GitHub仓库

1. 登录后，点击右上角"Add New" → "Project"
2. 在"Import Git Repository"页面，选择"GitHub"
3. 搜索你的仓库名称 `project-scoring-pro`，点击"Import"

### 步骤3：配置部署选项

1. **Project Name**：保持默认或修改为你喜欢的名称
2. **Framework Preset**：选择 "Vite"（因为项目使用Vite构建）
3. **Root Directory**：保持默认（即项目根目录）
4. **Build and Output Settings**：
   - Build Command：`npm run build`
   - Output Directory：`dist`
   - Install Command：`npm install`
5. **Environment Variables**：如果项目需要环境变量（如Supabase配置），点击"Add"添加
   - 例如：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`

### 步骤4：完成导入

点击"Deploy"按钮，Vercel将开始第一次自动部署。

## 4. 验证自动部署

### 首次部署完成

1. 部署完成后，你将看到"Deployment Complete"页面
2. 点击"Visit"按钮可以访问已部署的应用
3. 应用的域名格式为：`[project-name]-[random-string].vercel.app`

### 测试自动部署

1. 本地修改代码（例如修改App.tsx中的一个文本）
2. 提交并推送到GitHub：
   ```bash
   git add .
   git commit -m "测试自动部署"
   git push origin main
   ```
3. 登录Vercel，查看项目部署历史，应该会看到新的部署正在进行
4. 部署完成后，访问应用验证变更已生效

## 5. 自动部署的优势

- **零配置**：大部分框架（包括Vite）无需额外配置即可自动部署
- **实时预览**：每次推送代码都会生成预览链接
- **分支部署**：支持为每个Git分支创建独立的预览环境
- **自动HTTPS**：所有Vercel部署的应用自动配置HTTPS
- **全球CDN**：应用部署在Vercel的全球CDN上，访问速度快

## 6. 管理部署

### 查看部署历史

1. 登录Vercel
2. 点击左侧"Projects"，选择你的项目
3. 点击"Deployments"标签查看所有部署历史

### 回滚部署

1. 在部署历史中找到需要回滚的版本
2. 点击该版本右侧的"..."按钮
3. 选择"Redeploy"即可回滚到该版本

### 自定义域名

如果需要使用自定义域名：
1. 点击项目页面的"Settings"标签
2. 选择"Domains"
3. 点击"Add"添加自定义域名，按照提示完成DNS配置

## 7. 常见问题

### 部署失败

- 检查GitHub仓库是否有正确的构建脚本（`npm run build`）
- 检查Vercel项目配置中的环境变量是否正确
- 查看部署日志（在Vercel项目的"Deployments"页面点击具体部署查看日志）

### 环境变量问题

- 确保所有必要的环境变量都已在Vercel项目设置中配置
- 对于Vite项目，环境变量名称必须以`VITE_`开头

### 构建时间过长

- 优化项目依赖，移除不必要的包
- 检查是否有无限循环或性能问题

## 8. 总结

Vercel的自动部署是一个简单而强大的功能，只需一次配置，即可实现代码推送后自动构建和部署。这大大提高了开发效率，让你可以专注于代码开发，而不必担心部署问题。

如果你已经按照之前的步骤将代码推送到GitHub，那么只需要完成上述Vercel配置步骤，就可以享受自动部署的便利了！

---

**注意：** 如果你之前已经在Vercel上部署过该项目，那么自动部署应该已经生效，无需重新配置。每次推送代码到GitHub后，Vercel都会自动触发新的部署。