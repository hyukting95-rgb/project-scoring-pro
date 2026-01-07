-- ============================================
-- 修复备份相关问题
-- ============================================

-- 1. 为 personnel_records 表添加缺失的 project_uid 字段
ALTER TABLE public.personnel_records ADD COLUMN IF NOT EXISTS project_uid UUID;

-- 2. 更新现有数据：为 project_uid 设置正确的值
UPDATE public.personnel_records pr
SET project_uid = p.id
FROM public.projects p
WHERE pr.project_id = p.id;

-- 3. 确保 project_uid 不为空（对于已有关联项目的记录）
ALTER TABLE public.personnel_records ALTER COLUMN project_uid SET NOT NULL;

-- 4. 清理无效的备份记录（created_by 不是有效 UUID 的记录）
-- 删除 created_by 为空或无效格式的备份记录
DELETE FROM public.backup_metadata
WHERE created_by IS NULL;

-- 5. 确认修复结果
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

-- 6. 检查 personnel_records 的 project_uid 是否已正确填充
SELECT
  COUNT(*) as total_records,
  COUNT(project_uid) as filled_project_uid,
  COUNT(*) - COUNT(project_uid) as missing_project_uid
FROM public.personnel_records;

-- 7. 查看现有的备份记录
SELECT id, name, created_at, created_by, record_count
FROM public.backup_metadata
ORDER BY created_at DESC
LIMIT 10;
