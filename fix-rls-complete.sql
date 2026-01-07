-- 彻底清理并重建 team_members 表的 RLS 策略
-- 解决 500 Internal Server Error

-- 1. 删除所有现有策略
DROP POLICY IF EXISTS "Allow authenticated users to view team members" ON team_members;
DROP POLICY IF EXISTS "Admins can view all" ON team_members;
DROP POLICY IF EXISTS "Users can view own record" ON team_members;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON team_members;

-- 2. 确保表是安全的
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 3. 创建严格的新策略

-- 策略1: 用户只能查看自己的记录
CREATE POLICY "Users can view own record" ON team_members
  FOR SELECT
  USING (user_id = auth.uid());

-- 策略2: 只有状态为 active 的 admin 才能查看所有记录
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

-- 4. 验证策略已创建
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'team_members';
