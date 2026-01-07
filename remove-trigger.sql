-- 完全移除触发器，让注册恢复正常
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 验证触发器已移除
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 查看当前用户
SELECT id, email FROM auth.users ORDER BY created_at DESC;
SELECT id, email, status FROM team_members ORDER BY created_at DESC;
