-- 查看 auth.users 中存在但 team_members 中不存在的用户
-- 这些用户虽然还能登录，但无法使用系统功能

SELECT 
    au.id as user_id,
    au.email,
    au.created_at as auth_created_at,
    tm.id as member_id,
    tm.status as member_status,
    CASE 
        WHEN tm.id IS NULL THEN '幽灵用户（已删除）'
        ELSE '正常用户'
    END as account_status
FROM auth.users au
LEFT JOIN team_members tm ON au.id = tm.user_id
ORDER BY au.created_at DESC;

-- 统计
SELECT 
    COUNT(*) as total_auth_users,
    COUNT(tm.id) as users_in_team,
    COUNT(*) - COUNT(tm.id) as orphaned_users
FROM auth.users au
LEFT JOIN team_members tm ON au.id = tm.user_id;
