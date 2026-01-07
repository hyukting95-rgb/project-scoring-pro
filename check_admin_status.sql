-- 检查当前用户是否为管理员
SELECT 
  auth.uid() as current_user_id,
  (SELECT role FROM team_members WHERE user_id = auth.uid()) as user_role,
  (SELECT status FROM team_members WHERE user_id = auth.uid()) as user_status,
  (SELECT COUNT(*) FROM team_members WHERE user_id = auth.uid()) as record_exists;

-- 检查 team_members 表中是否有你的记录
SELECT * FROM team_members WHERE user_id = auth.uid();

-- 检查 team_members 表的所有记录
SELECT id, user_id, email, role, status, created_at FROM team_members ORDER BY created_at DESC;
