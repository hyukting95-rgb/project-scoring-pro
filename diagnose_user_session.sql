-- 诊断用户权限问题
-- 运行此脚本查看 team_members 表中的所有用户

-- 1. 查看所有团队成员
SELECT 
    id,
    user_id,
    email,
    role,
    status,
    created_at
FROM team_members
ORDER BY created_at DESC;

-- 2. 检查特定用户是否存在
-- 替换下面的 user_id 为实际用户的 ID
SELECT 
    id,
    user_id,
    email,
    role,
    status
FROM team_members
WHERE user_id = '9b8b055d-0b2e-4a15-8f72-137c7e7e57df';

-- 3. 查看当前认证用户（在 Supabase Dashboard SQL 编辑器中执行）
-- 这会显示当前会话信息
SELECT 
    current_setting('request.jwt.claim.sub', true) as user_id,
    current_setting('request.jwt.claim.email', true) as email;
