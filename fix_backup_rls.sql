-- ============================================
-- 修复备份功能的 RLS 策略
-- 确保管理员可以访问所有数据进行备份
-- ============================================

-- 1. 删除旧的 RLS 策略
ALTER TABLE public.projects DROP POLICY IF EXISTS "Admins can view all projects for backup";
ALTER TABLE public.personnel_records DROP POLICY IF EXISTS "Admins can view all personnel for backup";
ALTER TABLE public.scoring_configs DROP POLICY IF EXISTS "Admins can view all configs for backup";

-- 2. 添加专门用于备份的 RLS 策略 - 允许管理员访问所有数据
-- projects 表
CREATE POLICY "Admins can view all projects for backup" ON public.projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
      AND team_members.status = 'active'
    )
  );

-- personnel_records 表
CREATE POLICY "Admins can view all personnel for backup" ON public.personnel_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
      AND team_members.status = 'active'
    )
  );

-- scoring_configs 表
CREATE POLICY "Admins can view all configs for backup" ON public.scoring_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
      AND team_members.status = 'active'
    )
  );

-- 3. 验证策略是否创建成功
SELECT 
  'projects' as table_name,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'projects' AND policyname LIKE '%backup%') as backup_policies
UNION ALL
SELECT 
  'personnel_records',
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'personnel_records' AND policyname LIKE '%backup%')
UNION ALL
SELECT 
  'scoring_configs',
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'scoring_configs' AND policyname LIKE '%backup%');

-- 4. 显示所有表的 RLS 策略
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
