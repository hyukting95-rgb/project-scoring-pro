-- ============================================
-- 恢复 scoring_configs 表的原始访问权限
-- 移除权限隔离，让所有用户都可以修改配置
-- ============================================

-- 第一步：删除之前创建的restrictive策略
DROP POLICY IF EXISTS "Only active admins can modify default config" ON scoring_configs;

-- 第二步：创建新策略 - 所有用户都可以查看和修改默认配置
-- 这样恢复了原始功能：所有用户都可以调整分数设置
CREATE POLICY "All users can manage default config" ON scoring_configs
  FOR ALL
  USING (is_default = true)
  WITH CHECK (is_default = true);

SELECT 'scoring_configs 访问权限已恢复 - 所有用户现在都可以修改配置' as status;

-- 验证当前策略
SELECT 
  polname AS policy_name,
  polcmd AS allowed_operations,
  CASE WHEN polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS policy_type
FROM pg_policy
WHERE polrelid = 'scoring_configs'::regclass;
