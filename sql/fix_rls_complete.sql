-- ============================================
-- 清理并重建 team_members 表的 RLS 策略
-- ============================================

-- 先查看现有策略
SELECT policyname FROM pg_policies WHERE tablename = 'team_members';

-- 删除所有可能的策略
DROP POLICY IF EXISTS "Users can view own" ON team_members;
DROP POLICY IF EXISTS "Users can update own" ON team_members;
DROP POLICY IF EXISTS "Admins can view all" ON team_members;
DROP POLICY IF EXISTS "Admins can delete all" ON team_members;
DROP POLICY IF EXISTS "Admins can update all" ON team_members;

-- ============================================
-- 创建新策略
-- ============================================

-- 1. 用户只能查看和修改自己的记录
CREATE POLICY "Users can view own" ON team_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own" ON team_members
  FOR UPDATE
  USING (user_id = auth.uid());

-- 2. 管理员可以查看所有记录
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

-- 3. 管理员可以删除所有记录
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

-- 4. 管理员可以更新所有记录
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

-- 验证结果
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'team_members';
