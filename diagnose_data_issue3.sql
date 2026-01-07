-- ============================================
-- 继续诊断 - 检查项目和用户对应关系
-- ============================================

-- 8. 检查 projects 表中是否有数据
SELECT id, user_id, type, content, created_at
FROM public.projects
ORDER BY created_at DESC
LIMIT 30;

-- 9. 检查 user_id 是否匹配 auth.users 和 profiles
SELECT
  p.id as project_id,
  p.user_id,
  CASE
    WHEN a.id IS NOT NULL THEN 'auth.user 存在'
    ELSE 'auth.user 不存在'
  END as auth_status,
  CASE
    WHEN prof.id IS NOT NULL THEN 'profile 存在'
    ELSE 'profile 不存在'
  END as profile_status,
  a.email as auth_email,
  prof.email as profile_email
FROM public.projects p
LEFT JOIN auth.users a ON p.user_id = a.id
LEFT JOIN public.profiles prof ON p.user_id = prof.id
ORDER BY p.created_at DESC;

-- 10. 检查是否有孤立的项目记录（user_id 在 auth.users 中不存在）
SELECT COUNT(*) as orphan_projects
FROM public.projects p
WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = p.user_id);
