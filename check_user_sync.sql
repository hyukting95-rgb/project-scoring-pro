-- ============================================
-- 检查 profiles 和 auth.users 的对应关系
-- ============================================

-- 检查 auth.users 和 public.profiles 的对应关系
SELECT
  a.id as auth_user_id,
  a.email as auth_email,
  a.created_at as auth_created,
  p.id as profile_id,
  p.email as profile_email,
  p.role as profile_role,
  CASE WHEN p.id IS NOT NULL THEN '已同步' ELSE '未同步' END as sync_status
FROM auth.users a
LEFT JOIN public.profiles p ON a.id = p.id
ORDER BY a.created_at DESC;

-- 检查是否有 auth.users 但没有 profiles 的情况
SELECT
  a.id,
  a.email,
  a.created_at
FROM auth.users a
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = a.id);

-- 检查所有用户的数据情况
SELECT
  a.id,
  a.email,
  COALESCE(p.role, '无角色') as role,
  (SELECT COUNT(*) FROM public.projects WHERE user_id = a.id) as project_count
FROM auth.users a
LEFT JOIN public.profiles p ON a.id = p.id
ORDER BY a.created_at DESC;
