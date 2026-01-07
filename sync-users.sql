-- ============================================
-- 修复：自动同步新用户到 team_members
-- ============================================

-- 1. 先删除旧触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. 禁用 RLS，临时允许插入
ALTER TABLE team_members ALTER COLUMN status DROP DEFAULT;
ALTER TABLE team_members ALTER COLUMN status SET DATA TYPE TEXT;
ALTER TABLE team_members ALTER COLUMN status SET DEFAULT 'pending';

-- 3. 创建一个简单的触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO team_members (user_id, email, display_name, role, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
        'member',
        'pending'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. 手动插入当前未同步的用户
INSERT INTO team_members (user_id, email, display_name, role, status)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'display_name', au.email),
    'member',
    'pending'
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.user_id = au.id
);

-- 6. 验证结果
SELECT id, email, role, status FROM team_members ORDER BY created_at DESC;
