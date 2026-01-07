-- ============================================
-- 修复 personnel_records 表缺失字段
-- ============================================

-- 1. 添加缺失的 work_days 字段
ALTER TABLE public.personnel_records ADD COLUMN IF NOT EXISTS work_days NUMERIC(5,2) DEFAULT 1.0;

-- 2. 确认字段已添加
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'personnel_records'
ORDER BY ordinal_position;

-- 3. 检查现有的 RPC 函数是否存在
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%backup%' OR routine_name LIKE '%get_all%';

-- 4. 创建备份专用的 RPC 函数（如果不存在）
CREATE OR REPLACE FUNCTION get_all_projects_for_backup()
RETURNS SETOF projects AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.projects;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_all_personnel_for_backup()
RETURNS SETOF personnel_records AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.personnel_records;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_all_configs_for_backup()
RETURNS SETOF scoring_configs AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.scoring_configs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 确认 RPC 函数已创建
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'get_all_%_for_backup';
