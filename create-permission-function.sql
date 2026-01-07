-- 创建安全的用户权限检查函数
-- 解决 RLS 策略递归评估问题
-- 修复：deleted 状态的用户也被视为无效用户

-- 1. 创建函数检查用户权限（绕过 RLS）
CREATE OR REPLACE FUNCTION public.check_user_permission(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_team_member RECORD;
BEGIN
  -- 查找用户记录
  SELECT * INTO v_team_member
  FROM team_members
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    v_result := json_build_object(
      'isAdmin', false,
      'isActive', false,
      'role', 'member',
      'status', 'pending',
      'existsInTeam', false
    );
  ELSE
    v_result := json_build_object(
      'isAdmin', (v_team_member.role = 'admin' AND v_team_member.status = 'active'),
      'isActive', (v_team_member.status = 'active' OR v_team_member.status = 'suspended'),
      'role', v_team_member.role,
      'status', v_team_member.status,
      'existsInTeam', (v_team_member.status != 'deleted')
    );
  END IF;
  
  RETURN v_result;
END;
$$;

-- 2. 授权 anon 用户调用此函数
GRANT EXECUTE ON FUNCTION public.check_user_permission(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_permission(UUID) TO authenticated;

-- 3. 验证函数创建成功
SELECT proname, prosrc FROM pg_proc WHERE proname = 'check_user_permission';
