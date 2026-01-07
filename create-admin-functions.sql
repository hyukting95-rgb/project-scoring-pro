-- 创建管理功能专用的数据库函数
-- 解决用户管理页面的 RLS 问题

-- 1. 获取待审核用户列表
CREATE OR REPLACE FUNCTION public.get_pending_users()
RETURNS TABLE (id UUID, email TEXT, display_name TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT tm.id, tm.email, tm.display_name, tm.created_at
  FROM team_members tm
  WHERE tm.status = 'pending'
  ORDER BY tm.created_at DESC;
END;
$$;

-- 2. 获取所有团队成员
CREATE OR REPLACE FUNCTION public.get_all_team_members()
RETURNS TABLE (id UUID, email TEXT, display_name TEXT, role TEXT, status TEXT, joined_at TIMESTAMPTZ, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT tm.id, tm.email, tm.display_name, tm.role, tm.status, tm.joined_at, tm.created_at
  FROM team_members tm
  WHERE tm.status != 'deleted'
  ORDER BY tm.created_at DESC;
END;
$$;

-- 3. 获取已删除用户列表
CREATE OR REPLACE FUNCTION public.get_deleted_users_list()
RETURNS TABLE (user_id UUID, email TEXT, display_name TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT tm.user_id, tm.email, tm.display_name, tm.created_at
  FROM team_members tm
  WHERE tm.status = 'deleted'
  ORDER BY tm.created_at DESC;
END;
$$;

-- 授权调用权限
GRANT EXECUTE ON FUNCTION public.get_pending_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_team_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_deleted_users_list() TO authenticated;

-- 验证函数创建
SELECT proname FROM pg_proc WHERE proname LIKE 'get_%';
