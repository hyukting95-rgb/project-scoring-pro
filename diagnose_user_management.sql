-- ============================================
-- 用户管理权限诊断脚本
-- ============================================

-- 1. 检查当前用户是否为管理员
SELECT 
    auth.uid() as current_user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email,
    (SELECT role FROM team_members WHERE user_id = auth.uid()) as current_role,
    (SELECT status FROM team_members WHERE user_id = auth.uid()) as current_status;

-- 2. 查看 team_members 表的所有数据
SELECT id, user_id, email, display_name, role, status FROM team_members ORDER BY created_at DESC;

-- 3. 检查 RLS 策略
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'team_members';

-- 4. 测试当前用户是否有权限更新 team_members
-- 这个查询模拟更新操作，实际不执行
DO $$
DECLARE
    can_update BOOLEAN;
BEGIN
    -- 尝试检查是否有更新权限
    SELECT EXISTS (
        SELECT 1 FROM team_members
        WHERE user_id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    ) INTO can_update;
    
    RAISE NOTICE '当前用户是否可以更新team_members: %', can_update;
END $$;

-- 5. 检查是否有任何用户被暂停
SELECT id, email, status, role FROM team_members WHERE status = 'suspended';
