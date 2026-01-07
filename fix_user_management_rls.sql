-- ============================================
-- 修复用户管理权限 RLS 策略
-- ============================================

-- 1. 删除可能存在的旧策略
DROP POLICY IF EXISTS "Allow authenticated users to view team members" ON team_members;
DROP POLICY IF EXISTS "Only admins can update team members" ON team_members;
DROP POLICY IF EXISTS "Users can insert their own member record" ON team_members;
DROP POLICY IF EXISTS "Allow public read access" ON team_members;
DROP POLICY IF EXISTS "Allow authenticated read access" ON team_members;

-- 2. 确保 RLS 已启用
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 3. 创建正确的 RLS 策略

-- 策略1：所有认证用户可以查看团队成员（包含自己的信息）
CREATE POLICY "Allow authenticated users to view team members"
ON team_members
FOR SELECT
TO authenticated
USING (true);

-- 策略2：只有管理员可以更新团队成员状态（不能更新自己）
CREATE POLICY "Admins can update team members"
ON team_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND status = 'active'
  )
);

-- 策略3：只有管理员可以删除团队成员（不能删除自己）
CREATE POLICY "Admins can delete team members"
ON team_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND status = 'active'
  )
  AND user_id != auth.uid()  -- 不能删除自己
);

-- 4. 验证 RLS 策略
SELECT
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'team_members'
ORDER BY policyname;

-- 5. 查看当前团队成员
SELECT id, user_id, email, display_name, role, status FROM team_members ORDER BY created_at DESC;
