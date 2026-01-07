-- ============================================
-- 创建备份专用查询函数（绕过 RLS）
-- ============================================

-- 1. 创建查询所有项目的函数
CREATE OR REPLACE FUNCTION get_all_projects_for_backup()
RETURNS SETOF projects AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.projects;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 创建查询所有人员记录的函数
CREATE OR REPLACE FUNCTION get_all_personnel_for_backup()
RETURNS SETOF personnel_records AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.personnel_records;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建查询所有配置记录的函数
CREATE OR REPLACE FUNCTION get_all_configs_for_backup()
RETURNS SETOF scoring_configs AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.scoring_configs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 验证函数创建成功
SELECT 
  'get_all_projects_for_backup' as function_name,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'get_all_projects_for_backup') as exists
UNION ALL
SELECT 
  'get_all_personnel_for_backup',
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'get_all_personnel_for_backup')
UNION ALL
SELECT 
  'get_all_configs_for_backup',
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'get_all_configs_for_backup');

-- 5. 测试函数是否能正确返回数据
-- SELECT COUNT(*) FROM get_all_projects_for_backup();
-- SELECT COUNT(*) FROM get_all_personnel_for_backup();
-- SELECT COUNT(*) FROM get_all_configs_for_backup();
