-- 彻底清理并重建所有策略

-- 先删除所有策略（不检查是否存在）
ALTER TABLE team_members DROP POLICY IF EXISTS "Users can view own";
ALTER TABLE team_members DROP POLICY IF EXISTS "Users can update own";
ALTER TABLE team_members DROP POLICY IF EXISTS "Admins can view all";
ALTER TABLE team_members DROP POLICY IF EXISTS "Admins can delete all";
ALTER TABLE team_members DROP POLICY IF EXISTS "Admins can update all";

-- 重建策略

-- 1. 用户只能查看自己的记录
CREATE POLICY "Users can view own" ON team_members
  FOR SELECT
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

-- 验证
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'team_members';
