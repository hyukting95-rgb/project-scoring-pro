-- ============================================
-- 检查 profiles 表的详细情况
-- ============================================

-- 检查所有 profiles 记录的详细信息
SELECT
  p.id,
  p.email,
  p.role,
  p.created_at,
  (SELECT COUNT(*) FROM public.projects WHERE user_id = p.id) as project_count
FROM public.profiles p
ORDER BY p.created_at DESC;

-- 检查是否有 role 为 NULL 或无效值的情况
SELECT id, email, role, created_at
FROM public.profiles
WHERE role IS NULL
   OR role NOT IN ('admin', 'user');

-- 更新角色为 NULL 的用户为 'user'
UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL OR role NOT IN ('admin', 'user');

-- 确认更新结果
SELECT id, email, role FROM public.profiles;
