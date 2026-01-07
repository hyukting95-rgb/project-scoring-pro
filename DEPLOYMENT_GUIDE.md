# 生产环境部署指南

## 📋 概述

本指南将帮助您将 D-Scoring Pro 项目部署到生产环境，使其他用户能够注册和使用系统。

---

## 🗄️ 第一步：Supabase 项目配置

### 1.1 创建 Supabase 项目（如果尚未创建）

1. 访问 [Supabase](https://supabase.com)
2. 注册/登录账户
3. 点击 "New Project"
4. 填写项目信息：
   - **Name**: project-scoring-pro（或您喜欢的名称）
   - **Database Password**: 记住此密码
   - **Region**: 选择离您用户最近的区域

### 1.2 配置数据库表结构

在 Supabase 的 **SQL Editor** 中执行以下 SQL：

```sql
-- 创建团队成员表
CREATE TABLE team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'member',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建评分配置表
CREATE TABLE scoring_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    cmf JSONB DEFAULT '[
        {"label": "有品类视觉指导", "value": 0.5},
        {"label": "无品类视觉指导", "value": 1.0}
    ]'::jsonb,
    cmfp JSONB DEFAULT '[
        {"mode": "additional", "main": 1.0, "support": 0.5},
        {"mode": "none", "main": 1.5, "support": 0}
    ]'::jsonb,
    base4 JSONB DEFAULT '[
        {"label": "+1.0", "value": 1.0},
        {"label": "+1.5", "value": 1.5}
    ]'::jsonb,
    base5 JSONB DEFAULT '[
        {"label": "+1.5", "value": 1.5},
        {"label": "+2.0", "value": 2.0}
    ]'::jsonb,
    addons JSONB DEFAULT '[
        {"id": "light_illu", "label": "轻量化插画制作", "score": 0.5},
        {"id": "medium_illu", "label": "中量化插画制作", "score": 1.0},
        {"id": "high_illu", "label": "高量化插画制作", "score": 2.0},
        {"id": "light_struct", "label": "轻量化结构", "score": 0.5},
        {"id": "medium_struct", "label": "中量化结构", "score": 1.0}
    ]'::jsonb,
    package JSONB DEFAULT '[
        {"type": "基础型包装", "score": 0.5},
        {"type": "微创新型包装", "score": 1.0},
        {"type": "创新型包装", "score": 2.0}
    ]'::jsonb,
    manual JSONB DEFAULT '[
        {"type": "轻量化说明书内容制作", "score": 0.2},
        {"type": "中量化说明书内容制作", "score": 0.4},
        {"type": "原创性说明书内容制作", "score": 1.0}
    ]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建项目记录表
CREATE TABLE projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_uid TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL,
    content JSONB,
    entry_date DATE,
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    score DECIMAL(10,2) DEFAULT 0,
    responsible_person TEXT,
    status TEXT DEFAULT 'active',
    scoring_parts JSONB,
    raw_selections JSONB,
    total_work_days DECIMAL(10,1) DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建人员记录表
CREATE TABLE personnel_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    project_id UUID REFERENCES projects(id),
    project_uid TEXT NOT NULL,
    person TEXT NOT NULL,
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    score DECIMAL(10,2) DEFAULT 0,
    content TEXT,
    work_days DECIMAL(10,1) DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建邀请记录表
CREATE TABLE invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email)
);

-- 创建索引
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_project_uid ON projects(project_uid);
CREATE INDEX idx_personnel_project_id ON personnel_records(project_id);
CREATE INDEX idx_personnel_user_id ON personnel_records(user_id);
CREATE INDEX idx_team_members_email ON team_members(email);
```

### 1.3 创建数据库函数

```sql
-- 用户恢复函数
CREATE OR REPLACE FUNCTION recover_user_by_email(user_email TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    INSERT INTO team_members (email, display_name, role, status)
    SELECT email, raw_user_meta_data->>'display_name', 'member', 'active'
    FROM auth.users
    WHERE email = user_email
    ON CONFLICT (email) DO UPDATE SET
        status = 'active',
        updated_at = NOW();
    
    SELECT json_build_object(
        'success', true,
        'user_id', (SELECT id FROM auth.users WHERE email = user_email),
        'email', user_email,
        'message', '用户恢复成功'
    ) INTO result;
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取所有人员记录（管理员用）
CREATE OR REPLACE FUNCTION get_all_personnel_for_admin()
RETURNS TABLE (
    id UUID,
    name TEXT,
    project_id UUID,
    project_uid TEXT,
    total_amount DECIMAL,
    position_name TEXT,
    work_days DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.id,
        pr.person AS name,
        pr.project_id,
        pr.project_uid,
        pr.score AS total_amount,
        pr.content AS position_name,
        pr.work_days,
        pr.created_at
    FROM personnel_records pr
    ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取待审核用户
CREATE OR REPLACE FUNCTION get_pending_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.id,
        tm.email,
        tm.display_name,
        tm.created_at
    FROM team_members tm
    WHERE tm.status = 'pending'
    ORDER BY tm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 管理员更新用户状态
CREATE OR REPLACE FUNCTION update_user_status(user_email TEXT, new_status TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    UPDATE team_members 
    SET status = new_status, updated_at = NOW()
    WHERE email = user_email;
    
    SELECT json_build_object(
        'success', true,
        'message', '用户状态更新成功'
    ) INTO result;
    
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.4 配置 Row Level Security (RLS)

```sql
-- 启用 RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- team_members 策略
CREATE POLICY "Users can view own data" ON team_members
    FOR SELECT USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = team_members.email));

CREATE POLICY "Admins can view all members" ON team_members
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM team_members WHERE email = auth.uid()::TEXT AND role = 'admin')
    );

CREATE POLICY "Admins can update members" ON team_members
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM team_members WHERE email = auth.uid()::TEXT AND role = 'admin')
    );

-- projects 策略（用户只能查看和操作自己的项目）
CREATE POLICY "Users can manage own projects" ON projects
    FOR ALL USING (auth.uid() = user_id);

-- personnel_records 策略
CREATE POLICY "Users can manage own personnel" ON personnel_records
    FOR ALL USING (auth.uid() = user_id);

-- scoring_configs 策略
CREATE POLICY "Users can manage own configs" ON scoring_configs
    FOR ALL USING (auth.uid() = user_id OR is_default = true);

-- invitations 策略
CREATE POLICY "Users can view own invitations" ON invitations
    FOR SELECT USING (auth.uid() = invited_by);

CREATE POLICY "Admins can manage all invitations" ON invitations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM team_members WHERE email = auth.uid()::TEXT AND role = 'admin')
    );
```

### 1.5 获取 API 密钥

1. 进入 Supabase **Project Settings** → **API**
2. 复制 **Project URL** (格式: `https://xxxxx.supabase.co`)
3. 复制 **anon public** 密钥

---

## 🖥️ 第二步：部署前端

### 方案一：Vercel（推荐，最简单）

1. **准备代码**
   ```bash
   cd d:\project\project-scoring-pro
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **推送代码到 GitHub**
   - 创建 GitHub 仓库
   - 推送代码

3. **部署到 Vercel**
   - 访问 [Vercel](https://vercel.com)
   - 用 GitHub 登录
   - 点击 "Add New Project"
   - 选择您的仓库
   - 在 **Environment Variables** 中添加：
     - `VITE_SUPABASE_URL`: 您的 Supabase URL
     - `VITE_SUPABASE_ANON_KEY`: 您的 anon 密钥
   - 点击 **Deploy**

### 方案二：Netlify

1. 访问 [Netlify](https://netlify.com)
2. 用 GitHub 登录
3. 点击 "Add new site" → "Import an existing project"
4. 选择 GitHub 仓库
5. 在 **Environment Variables** 中添加相同的变量
6. 构建命令: `npm run build`
7. 发布目录: `dist`
8. 点击 **Deploy site**

### 方案三：自建服务器

```bash
# 构建生产版本
cd d:\project\project-scoring-pro
npm run build

# 构建产物在 dist 目录
# 使用 Nginx 或其他 Web 服务器托管
```

Nginx 配置示例：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/project-scoring-pro/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 开启 Gzip 压缩
    gzip on;
    gzip_types text/plain application/javascript text/css;
}
```

---

## 🔐 第三步：配置域名和 SSL

### 使用 Vercel/Netlify
1. 进入项目设置 → **Domains**
2. 添加您的自定义域名
3. 按提示配置 DNS 记录

### 自建服务器
使用 Let's Encrypt 免费证书：
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com
```

---

## 📱 第四步：用户使用指南

### 注册流程
1. 用户访问部署好的网站
2. 点击"注册"按钮
3. 输入邮箱和密码
4. 等待管理员批准（初始用户默认激活）

### 管理员操作
1. 首次注册后自动成为管理员
2. 登录后进入"用户管理"页面
3. 可以：
   - 查看待审核用户
   - 批准/拒绝新用户
   - 设置用户角色（管理员/成员）
   - 停用用户

---

## 🔧 第五步：常用维护命令

```bash
# 开发环境
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview

# 安装依赖
npm install

# 更新依赖
npm update
```

---

## 📊 第六步：备份与恢复

### Supabase 自动备份
- Supabase 免费计划提供 7 天自动备份
- Pro 计划提供 14 天备份
- 可在 Supabase Dashboard → Settings → Backups 查看

### 手动备份
```bash
# 使用 pg_dump 备份数据库
pg_dump "postgresql://user:password@host:5432/dbname" > backup.sql
```

---

## 🆘 常见问题

### Q: 用户注册后无法登录？
A: 检查 Supabase 的 **Authentication** → **Providers** → **Email** 是否启用

### Q: RLS 策略阻止访问？
A: 在 Supabase SQL Editor 中检查策略是否正确创建

### Q: 部署后样式丢失？
A: 确保 `VITE_APP_ENV=production` 设置正确

### Q: 如何更新部署？
A: 推送新代码到 GitHub，Vercel/Netlify 会自动重新部署

---

## 📞 获取帮助

如有问题，请检查：
1. Supabase 项目是否正常运行
2. 环境变量是否正确配置
3. 浏览器控制台错误信息
4. Vercel/Netlify 部署日志
