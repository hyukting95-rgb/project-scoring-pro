-- ============================================
-- 安全修复 scoring_configs 表的 RLS 策略
-- ============================================

-- 第一步：删除旧策略（如果存在）
DROP POLICY IF EXISTS "Admins can view all configs" ON scoring_configs;
DROP POLICY IF EXISTS "Users can CRUD their own configs" ON scoring_configs;

-- 第二步：创建新策略
-- 所有用户都可以查看默认配置
CREATE POLICY "All users can view default config" ON scoring_configs
  FOR SELECT
  USING (is_default = true);

-- 只有活跃的管理员可以修改默认配置
CREATE POLICY "Only active admins can modify default config" ON scoring_configs
  FOR ALL
  USING (
    is_default = true AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  )
  WITH CHECK (
    is_default = true AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

SELECT '策略创建完成' as status;

-- 第三步：创建一个安全定义函数来清理旧配置（绕过RLS）
CREATE OR REPLACE FUNCTION cleanup_old_configs()
RETURNS void AS $$
BEGIN
  DELETE FROM scoring_configs WHERE is_default = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 执行清理
SELECT cleanup_old_configs() as cleanup_result;

-- 删除函数（完成任务后）
DROP FUNCTION IF EXISTS cleanup_old_configs();

SELECT 'scoring_configs RLS 策略修复完成' as final_status;
