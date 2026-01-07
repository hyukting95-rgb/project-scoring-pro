-- ============================================
-- 修复备份相关问题 - 第二版
-- ============================================

-- 1. 删除旧格式的备份记录（ID 不是 UUID 格式的）
DELETE FROM public.backup_metadata
WHERE id NOT LIKE '________-____-____-____-_______________';

-- 2. 为 personnel_records 表添加缺失的 project_uid 字段
ALTER TABLE public.personnel_records ADD COLUMN IF NOT EXISTS project_uid UUID;

-- 3. 更新现有数据：为 project_uid 设置正确的值
UPDATE public.personnel_records pr
SET project_uid = p.id
FROM public.projects p
WHERE pr.project_id = p.id;

-- 4. 确认修复结果
SELECT
  'projects' as table_name,
  COUNT(*) as record_count
FROM public.projects
UNION ALL
SELECT
  'personnel_records' as table_name,
  COUNT(*) as record_count
FROM public.personnel_records
UNION ALL
SELECT
  'backup_metadata' as table_name,
  COUNT(*) as record_count
FROM public.backup_metadata;

-- 5. 检查 personnel_records 的 project_uid 是否已正确填充
SELECT
  COUNT(*) as total_records,
  COUNT(project_uid) as filled_project_uid,
  COUNT(*) - COUNT(project_uid) as missing_project_uid
FROM public.personnel_records;

-- 6. 查看现有的备份记录（应该是空的）
SELECT id, name, created_at, record_count
FROM public.backup_metadata
ORDER BY created_at DESC;
