-- 在Supabase SQL编辑器中执行以下语句来设置团队管理功能

-- 1. 创建团队成员表
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  last_active TIMESTAMP WITH TIME ZONE,
  invited_by UUID REFERENCES auth.users(id),
  
  -- 确保每个用户只能有一条记录
  UNIQUE(user_id)
);

-- 2. 创建团队邀请表
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id)
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_created_by ON team_invitations(created_by);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON team_invitations(expires_at);

-- 4. 启用RLS (Row Level Security)
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- 5. 创建RLS策略

-- 团队成员表的策略
DROP POLICY IF EXISTS "Team members can view team info" ON team_members;
DROP POLICY IF EXISTS "Users can insert themselves as members" ON team_members;
DROP POLICY IF EXISTS "Admins can update team members" ON team_members;
DROP POLICY IF EXISTS "Admins can delete team members" ON team_members;

-- 团队成员可以查看团队信息
CREATE POLICY "Team members can view team info" ON team_members
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM team_members WHERE status = 'active'
    )
  );

-- 用户可以将自己添加为成员（在接受邀请时）
CREATE POLICY "Users can insert themselves as members" ON team_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 管理员可以更新团队成员信息
CREATE POLICY "Admins can update team members" ON team_members
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE role = 'admin' AND status = 'active'
    )
  );

-- 管理员可以删除团队成员
CREATE POLICY "Admins can delete team members" ON team_members
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE role = 'admin' AND status = 'active'
    )
  );

-- 团队邀请表的策略
DROP POLICY IF EXISTS "Users can view their own invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON team_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON team_invitations;
DROP POLICY IF EXISTS "Anyone can use valid invitation tokens" ON team_invitations;

-- 用户可以查看自己创建的邀请
CREATE POLICY "Users can view their own invitations" ON team_invitations
  FOR SELECT USING (auth.uid() = created_by);

-- 管理员可以创建邀请
CREATE POLICY "Admins can create invitations" ON team_invitations
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE role = 'admin' AND status = 'active'
    )
  );

-- 用户可以更新自己创建的邀请
CREATE POLICY "Users can update their own invitations" ON team_invitations
  FOR UPDATE USING (auth.uid() = created_by);

-- 用户可以删除自己创建的邀请
CREATE POLICY "Users can delete their own invitations" ON team_invitations
  FOR DELETE USING (auth.uid() = created_by);

-- 任何人都可以使用有效的邀请令牌（但只能用于自己的邮箱）
CREATE POLICY "Anyone can use valid invitation tokens" ON team_invitations
  FOR SELECT USING (
    used_at IS NULL 
    AND expires_at > NOW() 
    AND email = auth.email()
  );

-- 6. 创建触发器函数来自动设置last_active
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为team_members表创建触发器
DROP TRIGGER IF EXISTS update_team_members_last_active ON team_members;
CREATE TRIGGER update_team_members_last_active
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_last_active();

-- 7. 创建函数来获取当前用户的团队角色
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM team_members
  WHERE user_id = auth.uid() AND status = 'active';
  
  RETURN COALESCE(user_role, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 创建函数来检查用户是否是团队成员
CREATE OR REPLACE FUNCTION is_team_member(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO member_count
  FROM team_members
  WHERE user_id = user_uuid AND status = 'active';
  
  RETURN member_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 创建函数来检查用户是否是管理员
CREATE OR REPLACE FUNCTION is_team_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM team_members
  WHERE user_id = user_uuid AND role = 'admin' AND status = 'active';
  
  RETURN admin_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 创建清理过期邀请的函数
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM team_invitations
  WHERE expires_at < NOW() OR used_at IS NOT NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. 创建自动添加当前用户为管理员的函数（用于初始设置）
CREATE OR REPLACE FUNCTION add_current_user_as_admin()
RETURNS VOID AS $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
  current_user_name TEXT;
BEGIN
  -- 获取当前用户信息
  current_user_id := auth.uid();
  current_user_email := auth.email();
  current_user_name := COALESCE(
    (auth.jwt() ->> 'user_metadata' ->> 'display_name'),
    split_part(current_user_email, '@', 1)
  );

  -- 检查用户是否已经是团队成员
  IF EXISTS (SELECT 1 FROM team_members WHERE user_id = current_user_id) THEN
    RAISE NOTICE 'User % is already a team member', current_user_email;
    RETURN;
  END IF;

  -- 添加用户为管理员
  INSERT INTO team_members (
    user_id,
    email,
    display_name,
    role,
    status,
    joined_at,
    last_active
  ) VALUES (
    current_user_id,
    current_user_email,
    current_user_name,
    'admin',
    'active',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Added user % as admin', current_user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;