-- ================================================
-- 添加 project_uid 序号递增字段
-- 执行时间: 2026-01-06
-- ================================================

-- 1. 创建项目UID序号计数器表
CREATE TABLE IF NOT EXISTS public.project_uid_counter (
  id TEXT PRIMARY KEY DEFAULT 'project_uid_seq',
  current_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 初始化计数器（如果没有记录）
INSERT INTO public.project_uid_counter (id, current_value, updated_at)
VALUES ('project_uid_seq', 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. 为 projects 表添加 project_uid 字段
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_uid TEXT UNIQUE;

-- 4. 为 projects 表添加新的 entry_date 字段
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS entry_date DATE;

-- 5. 为 personnel_records 表添加 entry_date 字段
ALTER TABLE public.personnel_records ADD COLUMN IF NOT EXISTS entry_date DATE;

-- 6. 更新现有数据的 entry_date 字段
UPDATE public.projects SET entry_date = created_at::DATE WHERE entry_date IS NULL;
UPDATE public.personnel_records SET entry_date = created_at::DATE WHERE entry_date IS NULL;

-- 7. 为现有数据生成 project_uid（从0001开始递增）
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 0;
  new_uid TEXT;
BEGIN
  FOR rec IN SELECT id, created_at FROM public.projects ORDER BY created_at ASC LOOP
    counter := counter + 1;
    new_uid := 'P' || LPAD(counter::TEXT, 4, '0');
    UPDATE public.projects SET project_uid = new_uid WHERE id = rec.id;
  END LOOP;
  
  -- 更新计数器
  UPDATE public.project_uid_counter SET current_value = counter, updated_at = NOW();
END $$;

-- 8. 设置 project_uid 不为空
ALTER TABLE public.projects ALTER COLUMN project_uid SET NOT NULL;

-- 9. 创建索引
CREATE INDEX IF NOT EXISTS idx_projects_project_uid ON public.projects(project_uid);
CREATE INDEX IF NOT EXISTS idx_personnel_project_uid ON public.personnel_records(project_uid);
CREATE INDEX IF NOT EXISTS idx_projects_entry_date ON public.projects(entry_date);
CREATE INDEX IF NOT EXISTS idx_personnel_entry_date ON public.personnel_records(entry_date);

-- 10. 添加注释
COMMENT ON COLUMN public.projects.project_uid IS '人类可读的项目UID，格式为P+4位数字（如P0001）';
COMMENT ON COLUMN public.projects.entry_date IS '项目录入日期，格式为yyyy-mm-dd';
COMMENT ON COLUMN public.personnel_records.entry_date IS '人员记录录入日期，格式为yyyy-mm-dd';

-- 11. 为 personnel_records 表的 project_uid 字段添加外键约束
ALTER TABLE public.personnel_records 
  DROP CONSTRAINT IF EXISTS personnel_records_project_uid_fkey;
ALTER TABLE public.personnel_records 
  ADD CONSTRAINT personnel_records_project_uid_fkey 
  FOREIGN KEY (project_uid) REFERENCES public.projects(id) ON DELETE CASCADE;

SELECT '数据库迁移完成!' AS status;
