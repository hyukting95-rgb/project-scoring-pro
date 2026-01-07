# Supabase 账户注册与项目设置指南

## 🎯 目标
为项目评分系统创建多用户共享数据库，支持5人团队协作。

## 📝 注册步骤

### 1. 访问 Supabase
- 打开浏览器，访问：https://supabase.com/
- 点击右上角的 "Start your project" 按钮

### 2. 创建账户
**推荐方式**：使用 GitHub 账户登录
- 点击 "Continue with GitHub"
- 如果没有 GitHub 账户，先注册 GitHub（免费）
- 授权 Supabase 访问您的 GitHub 账户

**备选方式**：邮箱注册
- 点击 "Sign up with email"
- 输入邮箱地址和密码
- 验证邮箱

### 3. 创建组织
- 系统会要求创建组织（Organization）
- 输入组织名称：`project-scoring-team` 或您喜欢的名称
- 选择 "Personal" 计划（免费）

### 4. 创建项目
填写以下信息：
- **Project name**: `project-scoring-system`
- **Database Password**: 设置一个强密码（**重要：请记录下来**）
  - 建议格式：包含大小写字母、数字、特殊字符
  - 示例：`MyTeam2024!`
- **Region**: 选择 `Singapore (Southeast Asia)` 或最近的地区
- **Pricing Plan**: 选择 **Free**（500MB数据库，完全免费）

### 5. 等待项目创建
- 项目创建通常需要 2-3 分钟
- 创建完成后会自动跳转到项目仪表板

## 🔑 获取必要的配置信息

### 1. 项目 URL
在项目仪表板中：
- 左侧菜单 → Settings → API
- 复制 "Project URL"
- 格式类似：`https://abcdefgh.supabase.co`

### 2. API 密钥
在 Settings → API 页面：
- **anon public**: 复制这个密钥（前端使用）
- **service_role**: 复制这个密钥（后端使用，**安全保存**）

## ⚠️ 安全提醒
- 绝不要将 `service_role` 密钥提交到代码仓库
- 可以将 `anon public` 密钥提交到公开仓库（它是公开的）
- 将 `service_role` 密钥添加到环境变量中

## 📊 免费计划包含
- 500MB 数据库存储
- 50,000 月活跃用户
- 50MB 文件存储
- 实时数据同步
- 用户认证
- 自动备份
- Row Level Security (RLS)

## 🚀 下一步
注册完成后，请提供：
1. Project URL
2. anon public key
3. service_role key

我将使用这些信息配置您的多用户系统。