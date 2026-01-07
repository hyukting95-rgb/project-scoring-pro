-- ============================================
-- 诊断用户资料和项目数据问题
-- ============================================

-- 1. 检查当前登录用户是否能被正确识别
SELECT 
  auth.uid() as current_user_id,
  (SELECT COUNT(*) FROM public.profiles WHERE id = auth.uid()) as profile_exists,
  (SELECT COUNT(*) FROM public.projects WHERE user_id = auth.uid()) as user_projects,
  (SELECT COUNT(*) FROM public.projects) as all_projects;

-- 2. 检查所有用户的资料情况
SELECT 
  p.id,
  p.email,
  p.role,
  p.created_at,
  (SELECT COUNT(*) FROM public.projects WHERE user_id = p.id) as project_count
FROM public.profiles p
ORDER BY p.created_at DESC
LIMIT 20;

-- 3. 检查所有项目记录
SELECT id, user_id, type, content, created_at
FROM public.projects
ORDER BY created_at DESC
LIMIT 20;

-- 4. 检查 auth.users 和 profiles 的对应关系
SELECT 
  a.id as auth_user_id,
  a.email as auth_email,
  p.id as profile_id,
  p.role as profile_role
FROM auth.users a
LEFT JOIN public.profiles p ON a.id = p.id
WHERE a.id IN (SELECT DISTINCT user_id FROM public.projects)
ORDER BY a.created_at DESC;
