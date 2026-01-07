-- ============================================
-- 继续诊断数据问题
-- ============================================

-- 5. 检查所有项目记录的 user_id
SELECT id, user_id, type, content, created_at
FROM public.projects
ORDER BY created_at DESC
LIMIT 20;

-- 6. 检查 auth.users 中是否有项目 user_id 对应的用户
SELECT 
  p.id as project_id,
  p.user_id,
  p.type,
  p.created_at,
  a.id as auth_user_exists,
  a.email as auth_email,
  prof.id as profile_exists
FROM public.projects p
LEFT JOIN auth.users a ON p.user_id = a.id
LEFT JOIN public.profiles prof ON p.user_id = prof.id
ORDER BY p.created_at DESC
LIMIT 20;

-- 7. 检查 auth.users 中的所有用户
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
