-- 检查当前 team_members 表的所有 RLS 策略
SELECT 
  policyname,
  tablename,
  cmd,
  qual,
  roles
FROM pg_policies
WHERE tablename = 'team_members';

-- 如果有多个 "Admins can view all" 策略，查看详情
SELECT oid, polname, polqual, polroles FROM pg_policy WHERE polname LIKE '%admin%view%';
