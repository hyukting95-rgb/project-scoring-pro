-- ============================================
-- 权限管理数据库设置脚本（清理版）
-- 先删除已存在的策略，再重新创建
-- ============================================

-- 1. 删除已存在的策略（如果存在）
DROP POLICY IF EXISTS "Allow authenticated users to view team members" ON team_members;
DROP POLICY IF EXISTS "Only admins can update team members" ON team_members;
DROP POLICY IF EXISTS "Users can insert their own member record" ON team_members;

DROP POLICY IF EXISTS "Only admins can view invitations" ON team_invitations;
DROP POLICY IF EXISTS "Only admins can create invitations" ON team_invitations;

DROP POLICY IF EXISTS "Admins can view all projects" ON projects;
DROP POLICY IF EXISTS "Admins can update all projects" ON projects;
DROP POLICY IF EXISTS "Active users can create projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON projects;

DROP POLICY IF EXISTS "Admins can view all personnel records" ON personnel_records;
DROP POLICY IF EXISTS "Admins can update all personnel records" ON personnel_records;
DROP POLICY IF EXISTS "Active users can create personnel records" ON personnel_records;
DROP POLICY IF EXISTS "Admins can delete personnel records" ON personnel_records;

DROP POLICY IF EXISTS "Allow authenticated users to view scoring configs" ON scoring_configs;
DROP POLICY IF EXISTS "Admins can update scoring configs" ON scoring_configs;

-- 2. 重新创建团队成员表（如果不存在）
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

-- 3. 重新创建邀请令牌表（如果不存在）
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

-- 4. 创建索引
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

-- 允许所有认证用户读取团队成员信息
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

-- ============================================
-- projects 表的 RLS 策略
-- ============================================

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

CREATE POLICY "Admins can update all projects" ON projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Active users can create projects" ON projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "Admins can delete projects" ON projects
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
-- personnel_records 表的 RLS 策略
-- ============================================

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

CREATE POLICY "Admins can update all personnel records" ON personnel_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Active users can create personnel records" ON personnel_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "Admins can delete personnel records" ON personnel_records
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
-- scoring_configs 表的 RLS 策略
-- ============================================

CREATE POLICY "Allow authenticated users to view scoring configs" ON scoring_configs
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update scoring configs" ON scoring_configs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- ============================================
-- 初始化第一个管理员账号
-- ============================================

-- 将 '你的管理员邮箱@example.com' 替换为你的实际邮箱
INSERT INTO team_members (user_id, email, display_name, role, status, joined_at)
SELECT 
  auth.users.id,
  '你的管理员邮箱@example.com',
  '管理员',
  'admin',
  'active',
  NOW()
FROM auth.users
WHERE email = '你的管理员邮箱@example.com'
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  status = 'active',
  joined_at = NOW();

-- 验证结果
SELECT id, email, role, status FROM team_members;
