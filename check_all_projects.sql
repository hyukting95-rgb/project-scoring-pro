-- 检查所有项目
SELECT COUNT(*) as total FROM public.projects;
SELECT id, user_id, type, content, status, created_at FROM public.projects ORDER BY created_at DESC LIMIT 5;
