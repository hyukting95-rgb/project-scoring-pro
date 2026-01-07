-- 检查 personnel_records 表的所有列及其类型
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'personnel_records'
ORDER BY ordinal_position;

-- 检查 projects 表的所有列及其类型
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;
