-- ============================================
-- 检查数据库中的实际数据
-- ============================================

-- 1. 检查所有主要表的数据量
SELECT 'projects' as table_name, COUNT(*) as record_count FROM public.projects
UNION ALL
SELECT 'personnel_records' as table_name, COUNT(*) as record_count FROM public.personnel_records
UNION ALL
SELECT 'scoring_configs' as table_name, COUNT(*) as record_count FROM public.scoring_configs
UNION ALL
SELECT 'team_members' as table_name, COUNT(*) as record_count FROM public.team_members;

-- 2. 查看 projects 表的实际数据
SELECT id, name, created_at, user_id, status
FROM public.projects
ORDER BY created_at DESC
LIMIT 20;

-- 3. 查看 personnel_records 表的实际数据（应该为空）
SELECT id, name, project_id, created_at
FROM public.personnel_records
ORDER BY created_at DESC
LIMIT 20;

-- 4. 查看备份表中是否还有记录
SELECT id, name, created_at, record_count
FROM public.backup_metadata
ORDER BY created_at DESC;
