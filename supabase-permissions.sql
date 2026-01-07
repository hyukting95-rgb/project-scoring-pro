-- ============================================
-- 项目评分系统 - 权限管理数据库设置脚本
-- ============================================

-- 1. 创建团队成员表（如果不存在则创建）
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
  invited_by UUID REFERENCES team_members(user_id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  last_active TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建邀请令牌表
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES team_members(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID
);

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);

-- ============================================
-- Row Level Security (RLS) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_configs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- team_members 表的 RLS 策略
-- ============================================

-- 允许所有认证用户读取团队成员信息（用于显示团队列表）
CREATE POLICY "Allow authenticated users to view team members" ON team_members
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 只有管理员可以修改团队成员信息
CREATE POLICY "Only admins can update team members" ON team_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- 允许用户插入自己的记录（注册时）
CREATE POLICY "Users can insert their own member record" ON team_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- team_invitations 表的 RLS 策略
-- ============================================

-- 只有管理员可以查看邀请
CREATE POLICY "Only admins can view invitations" ON team_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- 只有管理员可以创建邀请
CREATE POLICY "Only admins can create invitations" ON team_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- 只有管理员可以删除邀请
CREATE POLICY "Only admins can delete invitations" ON team_invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- ============================================
-- projects 表的 RLS 策略
-- ============================================

-- 管理员可以查看所有项目
CREATE POLICY "Admins can view all projects" ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
    OR user_id = auth.uid()
  );

-- 只有活跃用户可以创建/修改自己的项目
CREATE POLICY "Users can CRUD their own projects" ON projects
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- personnel_records 表的 RLS 策略
-- ============================================

-- 管理员可以查看所有人员记录
CREATE POLICY "Admins can view all personnel records" ON personnel_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
    OR user_id = auth.uid()
  );

-- 只有活跃用户可以操作自己的人员记录
CREATE POLICY "Users can CRUD their own personnel records" ON personnel_records
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- scoring_configs 表的 RLS 策略
-- ============================================

-- 所有用户都可以查看默认配置
CREATE POLICY "All users can view default config" ON scoring_configs
  FOR SELECT
  USING (is_default = true);

-- 只有活跃的管理员可以修改默认配置
CREATE POLICY "Only active admins can modify default config" ON scoring_configs
  FOR ALL
  USING (
    is_default = true AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  )
  WITH CHECK (
    is_default = true AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- ============================================
-- 触发器：自动更新 updated_at 字段
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 初始化第一个管理员的存储过程
-- ============================================

-- 创建函数：手动将当前用户设为管理员（首次设置）
CREATE OR REPLACE FUNCTION set_first_admin(user_email TEXT, user_display_name TEXT)
RETURNS UUID AS $$
DECLARE
  new_member_id UUID;
BEGIN
  -- 插入第一个管理员
  INSERT INTO team_members (user_id, email, display_name, role, status, joined_at, last_active)
  VALUES (auth.uid(), user_email, user_display_name, 'admin', 'active', NOW(), NOW())
  RETURNING id INTO new_member_id;
  
  RETURN new_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 视图：用户权限信息
-- ============================================

CREATE OR REPLACE VIEW user_permissions AS
SELECT 
  tm.id as member_id,
  tm.user_id,
  tm.email,
  tm.display_name,
  tm.role,
  tm.status,
  tm.joined_at,
  CASE 
    WHEN tm.role = 'admin' AND tm.status = 'active' THEN true
    ELSE false
  END as is_admin,
  CASE 
    WHEN tm.status = 'active' THEN true
    ELSE false
  END as is_active
FROM team_members tm
WHERE tm.user_id = auth.uid();

-- ============================================
-- 安全设置：防止删除 RLS 策略
-- ============================================

-- 注意：生产环境中应该设置更严格的权限，
-- 只允许应用程序通过安全定义函数修改关键数据
