-- 1. 先找到 jt@mideertoy.com 用户的 ID
SELECT
  au.id,
  au.email,
  au.created_at,
  (SELECT role FROM public.profiles WHERE id = au.id) as profile_role,
  (SELECT status FROM public.profiles WHERE id = au.id) as profile_status
FROM auth.users au
WHERE au.email = 'jt@mideertoy.com';

-- 2. 检查这个用户的所有项目
SELECT
  id,
  user_id,
  type,
  content,
  status,
  created_at,
  entry_time
FROM public.projects
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'jt@mideertoy.com')
ORDER BY created_at DESC;

-- 3. 检查所有项目（看是否真的插入了）
SELECT COUNT(*) as total_projects FROM public.projects;
SELECT * FROM public.projects ORDER BY created_at DESC LIMIT 5;
