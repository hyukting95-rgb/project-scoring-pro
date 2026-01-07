-- ================================================
-- 工作天数功能数据库迁移
-- 执行时间: 2026-01-06
-- ================================================

-- 1. 为 projects 表添加项目总天数字段
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS total_work_days NUMERIC(10,2) DEFAULT 0;

-- 2. 为 personnel_records 表添加工作天数字段
ALTER TABLE public.personnel_records ADD COLUMN IF NOT EXISTS work_days NUMERIC(10,2) DEFAULT 0;

-- 3. 为 personnel_records 表添加关联的项目UID字段
ALTER TABLE public.personnel_records ADD COLUMN IF NOT EXISTS project_uid UUID;

-- 更新现有数据：为 project_uid 设置正确的值
UPDATE public.personnel_records pr
SET project_uid = p.id
FROM public.projects p
WHERE pr.project_id = p.id;

-- 确保 project_uid 不为空（对于新插入的记录）
ALTER TABLE public.personnel_records ALTER COLUMN project_uid SET NOT NULL;

-- 4. 创建工作天数统计视图

-- 视图1：项目总天数统计
CREATE OR REPLACE VIEW public.project_work_days_summary AS
SELECT
  p.id AS project_id,
  p.type,
  p.content,
  p.responsible_person,
  p.status,
  p.entry_time,
  p.score,
  COALESCE(SUM(pr.work_days), 0) AS total_work_days,
  COUNT(pr.id) AS personnel_count
FROM public.projects p
LEFT JOIN public.personnel_records pr ON p.id = pr.project_id
GROUP BY p.id, p.type, p.content, p.responsible_person, p.status, p.entry_time, p.score;

-- 视图2：责任人-项目内容明细天数统计
CREATE OR REPLACE VIEW public.personnel_work_days_detail AS
SELECT
  pr.id AS personnel_id,
  pr.project_uid,
  pr.person,
  pr.content,
  pr.work_days,
  pr.entry_time,
  pr.score,
  p.type AS project_type,
  p.status AS project_status
FROM public.personnel_records pr
LEFT JOIN public.projects p ON pr.project_uid = p.id;

-- 视图3：责任人已完成项目天数统计
CREATE OR REPLACE VIEW public.personnel_completed_work_days AS
SELECT
  pr.person,
  COALESCE(SUM(pr.work_days), 0) AS completed_work_days,
  COALESCE(SUM(pr.score), 0) AS total_score,
  COUNT(DISTINCT pr.project_uid) AS completed_projects_count
FROM public.personnel_records pr
INNER JOIN public.projects p ON pr.project_uid = p.id
WHERE p.status = '已完成'
GROUP BY pr.person;

-- 5. 更新索引
CREATE INDEX IF NOT EXISTS idx_projects_total_work_days ON public.projects(total_work_days);
CREATE INDEX IF NOT EXISTS idx_personnel_work_days ON public.personnel_records(work_days);
CREATE INDEX IF NOT EXISTS idx_personnel_project_uid ON public.personnel_records(project_uid);

-- 6. 更新现有人员记录的 work_days 字段（如果有score，可以根据score计算）
-- 默认设置为 1 天，用户可以手动修改
UPDATE public.personnel_records
SET work_days = 1.0
WHERE work_days = 0 OR work_days IS NULL;

-- 7. 为实时功能添加新字段
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.personnel_records;

-- 8. 添加注释
COMMENT ON COLUMN public.projects.total_work_days IS '项目总工作天数';
COMMENT ON COLUMN public.personnel_records.work_days IS '单条人员记录的工作天数';
COMMENT ON COLUMN public.personnel_records.project_uid IS '关联的项目UID，用于查询统计';

-- 9. 创建触发器自动计算项目总天数
CREATE OR REPLACE FUNCTION public.calculate_project_total_days()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.projects
  SET total_work_days = (
    SELECT COALESCE(SUM(work_days), 0)
    FROM public.personnel_records
    WHERE project_id = NEW.project_id OR project_uid = NEW.project_id
  )
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_project_days ON public.personnel_records;
CREATE TRIGGER calculate_project_days
AFTER INSERT OR UPDATE OF work_days, project_id ON public.personnel_records
FOR EACH ROW
EXECUTE PROCEDURE public.calculate_project_total_days();

SELECT '工作天数功能迁移完成!' AS status;
