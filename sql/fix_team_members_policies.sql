-- ============================================
-- 修复团队成员表的 RLS 策略
-- ============================================

-- 首先删除现有策略
DROP POLICY IF EXISTS "Users can view own" ON team_members;
DROP POLICY IF EXISTS "Users can update own" ON team_members;
DROP POLICY IF EXISTS "Allow authenticated users to view team members" ON team_members;
DROP POLICY IF EXISTS "Admins can view all" ON team_members;

-- ============================================
-- 1. 用户只能查看和修改自己的记录
-- ============================================
CREATE POLICY "Users can view own" ON team_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own" ON team_members
  FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- 2. 管理员可以查看所有记录
-- ============================================
CREATE POLICY "Admins can view all" ON team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- ============================================
-- 3. 管理员可以删除和更新所有记录
-- ============================================
CREATE POLICY "Admins can delete all" ON team_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
      AND status = 'active'
    )
  );

CREATE POLICY "Admins can update all" ON team_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
      AND status = 'active'
    )
  );
