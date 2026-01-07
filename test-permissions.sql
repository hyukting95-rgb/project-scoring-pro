-- ============================================
-- 权限管理功能测试脚本
-- 在 Supabase SQL 编辑器中执行
-- ============================================

-- 1. 查看所有团队成员状态
SELECT 
  id,
  user_id,
  email,
  display_name,
  role,
  status,
  created_at,
  joined_at
FROM team_members
ORDER BY created_at DESC;

-- 2. 查看待审批用户
SELECT 
  id,
  email,
  display_name,
  created_at
FROM team_members
WHERE status = 'pending'
ORDER BY created_at DESC;

-- 3. 查看已激活用户
SELECT 
  id,
  email,
  display_name,
  role,
  status,
  joined_at
FROM team_members
WHERE status = 'active'
ORDER BY joined_at DESC;

-- 4. 检查你的管理员账号是否正确
-- 用你的管理员邮箱替换 'your-admin@example.com'
SELECT 
  id,
  email,
  display_name,
  role,
  status
FROM team_members
WHERE email = 'your-admin@example.com';

-- 5. 如果测试账号状态不对，可以手动更新状态
-- 将测试用户激活（用你的测试用户邮箱替换）
-- UPDATE team_members 
-- SET status = 'active', joined_at = NOW() 
-- WHERE email = 'testuser@test.com';
