-- 创建用户管理操作函数
-- 解决 RLS 递归问题

-- 1. 通过 ID 获取成员信息
CREATE OR REPLACE FUNCTION public.get_member_by_id(p_id UUID)
RETURNS TABLE (id UUID, user_id UUID, email TEXT, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT tm.id, tm.user_id, tm.email, tm.status
  FROM team_members tm
  WHERE tm.id = p_id;
END;
$$;

-- 2. 删除用户（更新状态为 deleted，保留记录）
CREATE OR REPLACE FUNCTION public.delete_team_member(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_success BOOLEAN := false;
BEGIN
  UPDATE team_members
  SET status = 'deleted'
  WHERE id = p_id;
  
  GET DIAGNOSTICS v_success = ROW_COUNT;
  RETURN v_success > 0;
END;
$$;

-- 3. 暂停用户
CREATE OR REPLACE FUNCTION public.suspend_team_member(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_success BOOLEAN := false;
BEGIN
  UPDATE team_members
  SET status = 'suspended'
  WHERE id = p_id;
  
  GET DIAGNOSTICS v_success = ROW_COUNT;
  RETURN v_success > 0;
END;
$$;

-- 4. 激活用户
CREATE OR REPLACE FUNCTION public.activate_team_member(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_success BOOLEAN := false;
BEGIN
  UPDATE team_members
  SET status = 'active', joined_at = NOW()
  WHERE id = p_id;
  
  GET DIAGNOSTICS v_success = ROW_COUNT;
  RETURN v_success > 0;
END;
$$;

-- 5. 设置用户角色
CREATE OR REPLACE FUNCTION public.set_member_role(p_id UUID, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_success BOOLEAN := false;
BEGIN
  UPDATE team_members
  SET role = p_role
  WHERE id = p_id;
  
  GET DIAGNOSTICS v_success = ROW_COUNT;
  RETURN v_success > 0;
END;
$$;

-- 授权
GRANT EXECUTE ON FUNCTION public.get_member_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_team_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_team_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_team_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_role(UUID, TEXT) TO authenticated;

-- 验证
SELECT proname FROM pg_proc WHERE proname LIKE '%team_member%' OR proname = 'get_member_by_id';
