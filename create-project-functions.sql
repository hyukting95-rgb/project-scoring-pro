-- 创建获取所有项目的函数（管理员专用）
CREATE OR REPLACE FUNCTION public.get_all_projects_for_admin()
RETURNS TABLE (
  id UUID,
  project_uid TEXT,
  type TEXT,
  content TEXT,
  entry_date TIMESTAMP WITH TIME ZONE,
  entry_time TIMESTAMP WITH TIME ZONE,
  score NUMERIC,
  responsible_person TEXT,
  status TEXT,
  scoring_parts JSONB,
  raw_selections JSONB,
  total_work_days NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.project_uid, '') AS project_uid,
    p.type,
    p.content,
    p.entry_time AS entry_date,
    p.entry_time AS entry_time,
    p.score,
    p.responsible_person,
    p.status,
    p.scoring_parts,
    p.raw_selections,
    COALESCE(p.total_work_days, 0) AS total_work_days
  FROM projects p
  ORDER BY p.entry_time DESC;
END;
$$;

-- 创建获取所有人员记录的函数（管理员专用）
CREATE OR REPLACE FUNCTION public.get_all_personnel_for_admin()
RETURNS TABLE (
  id UUID,
  name TEXT,
  project_id UUID,
  project_uid TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  total_amount NUMERIC,
  position_name TEXT,
  work_days NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.person AS name,
    pr.project_id,
    COALESCE(p.project_uid, '') AS project_uid,
    pr.created_at,
    pr.score AS total_amount,
    pr.content AS position_name,
    COALESCE(pr.work_days, 1.0) AS work_days
  FROM personnel_records pr
  LEFT JOIN projects p ON pr.project_id = p.id
  ORDER BY pr.created_at DESC;
END;
$$;

-- 创建获取当前用户项目的函数
CREATE OR REPLACE FUNCTION public.get_user_projects()
RETURNS TABLE (
  id UUID,
  project_uid TEXT,
  type TEXT,
  content TEXT,
  entry_date TIMESTAMP WITH TIME ZONE,
  entry_time TIMESTAMP WITH TIME ZONE,
  score NUMERIC,
  responsible_person TEXT,
  status TEXT,
  scoring_parts JSONB,
  raw_selections JSONB,
  total_work_days NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.project_uid, '') AS project_uid,
    p.type,
    p.content,
    p.entry_time AS entry_date,
    p.entry_time AS entry_time,
    p.score,
    p.responsible_person,
    p.status,
    p.scoring_parts,
    p.raw_selections,
    COALESCE(p.total_work_days, 0) AS total_work_days
  FROM projects p
  WHERE p.user_id = auth.uid()
  ORDER BY p.entry_time DESC;
END;
$$;

-- 创建获取当前用户人员记录的函数
CREATE OR REPLACE FUNCTION public.get_user_personnel()
RETURNS TABLE (
  id UUID,
  name TEXT,
  project_id UUID,
  project_uid TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  total_amount NUMERIC,
  position_name TEXT,
  work_days NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.person AS name,
    pr.project_id,
    COALESCE(p.project_uid, '') AS project_uid,
    pr.created_at,
    pr.score AS total_amount,
    pr.content AS position_name,
    COALESCE(pr.work_days, 1.0) AS work_days
  FROM personnel_records pr
  LEFT JOIN projects p ON pr.project_id = p.id
  WHERE pr.user_id = auth.uid()
  ORDER BY pr.created_at DESC;
END;
$$;

-- 授权调用权限
GRANT EXECUTE ON FUNCTION public.get_all_projects_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_personnel_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_projects() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_personnel() TO authenticated;

-- 验证函数创建
SELECT proname FROM pg_proc WHERE proname LIKE 'get_%projects%' OR proname LIKE 'get_%personnel%';
