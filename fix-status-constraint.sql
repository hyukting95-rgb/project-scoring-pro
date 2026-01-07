-- 修复 team_members 表的 status CHECK 约束
-- 允许 'deleted' 状态用于用户恢复功能

-- 1. 先查看现有的 CHECK 约束
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname LIKE '%team_members%status%';

-- 2. 删除现有的不正确的约束
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_status_check;

-- 3. 创建新的约束，允许所有状态值
ALTER TABLE team_members ADD CONSTRAINT team_members_status_check 
CHECK (status IN ('active', 'pending', 'suspended', 'deleted'));

-- 4. 验证约束已创建
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'team_members_status_check';

-- 5. 确保数据一致性 - 检查是否有无效数据
SELECT id, email, status FROM team_members WHERE status NOT IN ('active', 'pending', 'suspended', 'deleted');
