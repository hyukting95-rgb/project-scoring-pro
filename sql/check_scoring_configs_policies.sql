-- 检查当前 scoring_configs 表的 RLS 策略
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd AS operation,
  qual AS condition
FROM pg_policies
WHERE tablename = 'scoring_configs';

-- 检查表是否启用了 RLS
SELECT 
  relname,
  relrowsecurity AS rls_enabled,
  relreplident AS repl_identity
FROM pg_class
WHERE relname = 'scoring_configs';
