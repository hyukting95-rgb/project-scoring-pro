-- 获取已删除用户列表
-- 这些用户存在于 auth.users 但不在 team_members 中

CREATE OR REPLACE FUNCTION public.get_deleted_users()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'user_id', u.id,
      'email', u.email,
      'display_name', COALESCE(u.raw_user_meta_data->>'display_name', u.email),
      'created_at', u.created_at
    )
  ) INTO result
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.user_id = u.id
  );

  RETURN COALESCE(result, '[]'::json);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 恢复已删除的用户
CREATE OR REPLACE FUNCTION public.recover_user(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  auth_user RECORD;
  result JSON;
BEGIN
  -- 获取 auth.users 中的用户
  SELECT * INTO auth_user
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', '用户不存在于认证系统中');
  END IF;

  -- 检查是否已在 team_members 中
  IF EXISTS (SELECT 1 FROM team_members WHERE user_id = p_user_id) THEN
    RETURN json_build_object('success', false, 'error', '用户已存在于团队中');
  END IF;

  -- 创建团队成员记录
  INSERT INTO team_members (user_id, email, display_name, role, status)
  VALUES (
    auth_user.id,
    auth_user.email,
    COALESCE(auth_user.raw_user_meta_data->>'display_name', auth_user.email),
    'member',
    'pending'
  );

  RETURN json_build_object(
    'success', true,
    'message', '用户已恢复，请等待审核或直接激活',
    'user_id', auth_user.id,
    'email', auth_user.email
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 测试获取已删除用户
-- SELECT public.get_deleted_users();
