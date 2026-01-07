-- 检查 jt@mideertoy.com 用户的所有项目
SELECT id, user_id, type, content, status, created_at FROM public.projects p
WHERE p.user_id IN (SELECT id FROM auth.users WHERE email = 'jt@mideertoy.com')
ORDER BY created_at DESC;
