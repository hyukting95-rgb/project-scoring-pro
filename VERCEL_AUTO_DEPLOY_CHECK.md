# 检查Vercel自动部署状态

## 1. 检查项目与GitHub的连接状态

### 步骤1：登录Vercel

访问 [Vercel官网](https://vercel.com/)，使用GitHub账户登录。

### 步骤2：进入项目设置

1. 在Vercel仪表盘，点击左侧"Projects"找到你的项目
2. 点击项目名称进入项目详情页
3. 点击顶部"Settings"标签
4. 在左侧导航栏点击"Git"

### 步骤3：查看Git连接状态

在"Git"设置页面，你应该能看到：
- ✅ **Git Repository**：显示已连接的GitHub仓库URL
- ✅ **Connected Branch**：显示自动部署的分支（通常是main）
- ✅ **Auto-Deploy**：如果已开启，会显示"Enabled"状态

如果看到这些信息，说明项目已经成功连接到GitHub，并且自动部署功能已开启。

## 2. 查看自动部署历史

### 步骤1：进入部署历史页面

1. 在项目详情页，点击顶部"Deployments"标签
2. 这里会显示所有的部署记录

### 步骤2：识别自动部署

自动部署的记录通常有以下特征：
- **Source**列显示"Git"
- **Trigger**列显示"Push"
- **Message**列显示对应的Git提交信息

## 3. 验证自动部署是否正常工作

### 方法1：查看最近的部署记录

1. 检查部署历史中最新的几条记录
2. 确认它们是否与你最近的Git提交时间匹配
3. 点击任意一条部署记录，查看详情

### 方法2：手动测试自动部署

1. 在本地修改一个小文件（如README.md添加一个空格）
2. 提交并推送到GitHub：
   ```bash
   git add .
   git commit -m "测试自动部署"
   git push origin main
   ```
3. 返回Vercel部署历史页面
4. 等待1-2分钟，应该能看到一条新的部署记录正在进行
5. 部署完成后，访问应用验证变更已生效

## 4. 常见问题排查

### 问题1：看不到自动部署记录

- 检查GitHub仓库是否有新的提交
- 检查Vercel项目的Git连接是否正常
- 查看项目的"Deployments"页面是否有任何错误信息

### 问题2：自动部署失败

1. 点击失败的部署记录查看详情
2. 检查"Build Log"找出失败原因
3. 常见失败原因：
   - 依赖安装失败（网络问题或版本冲突）
   - 构建命令错误
   - 环境变量缺失
   - 代码错误导致构建失败

### 问题3：Git提交后没有触发自动部署

1. 检查Vercel项目设置中的"Git"页面，确认"Auto-Deploy"已启用
2. 检查GitHub仓库的Webhook设置：
   - 访问GitHub仓库 → "Settings" → "Webhooks"
   - 查找Vercel相关的Webhook，确认状态为"Active"
   - 如果Webhook有失败记录，点击"Redeliver"重新触发

## 5. 其他有用的Vercel功能

### 分支预览

Vercel自动为每个Git分支创建预览环境：
1. 创建一个新分支：`git checkout -b feature-test`
2. 推送分支：`git push origin feature-test`
3. 在Vercel部署历史中会看到新分支的预览部署
4. 点击部署记录查看预览链接

### 自定义域名

如果使用自定义域名：
1. 在项目"Settings" → "Domains"中配置
2. 自动部署会同时更新自定义域名和预览域名

### 部署通知

设置部署通知：
1. 在项目"Settings" → "Notifications"中配置
2. 可以接收邮件、Slack等通知，了解部署状态

---

通过以上步骤，你可以轻松检查Vercel项目的自动部署状态，并确保它正常工作。如果遇到任何问题，可以查看Vercel的[官方文档](https://vercel.com/docs/concepts/deployments/overview)或联系Vercel支持。