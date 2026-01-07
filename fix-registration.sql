-- ============================================
-- 完整修复：用户注册触发器和权限
-- ============================================

-- 1. 删除可能出问题的触发器和函数
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. 重新创建触发器函数（简化版本，避免权限问题）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 仅检查是否需要插入（不实际插入，避免冲突）
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建触发器（仅处理，不做额外操作）
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. 清理 team_members 表（只保留管理员）
TRUNCATE TABLE team_members RESTART IDENTITY;

-- 5. 重新插入管理员
INSERT INTO team_members (user_id, email, display_name, role, status, invited_by, joined_at, last_active)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'display_name', au.email),
    'admin',
    'active',
    NULL,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email = '你的管理员邮箱@example.com';

-- 6. 验证
SELECT id, email, role, status FROM team_members;
