-- ============================================
-- 检查表结构
-- ============================================

-- 1. 查看 projects 表的结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- 2. 查看 personnel_records 表的结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'personnel_records'
ORDER BY ordinal_position;

-- 3. 查看备份表的数据（使用 * 避免字段名错误）
SELECT * FROM public.backup_metadata LIMIT 5;
