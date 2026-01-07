-- 重新注册用户到 team_members 表
-- 这个函数处理用户已存在于 Auth 但不在 team_members 中的情况

-- 1. 首先检查用户是否存在于 Auth 中
-- 2. 如果存在且不在 team_members 中，则创建记录

CREATE OR REPLACE FUNCTION public.recover_user_registration(user_email TEXT)
RETURNS JSON AS $$
DECLARE
  auth_user RECORD;
  result JSON;
BEGIN
  -- 使用 auth.uid() 获取当前登录用户（应该是管理员）
  
  -- 查找 auth.users 中的用户
  SELECT * INTO auth_user 
  FROM auth.users 
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', '用户不存在于认证系统中'
    );
  END IF;
  
  -- 检查是否已在 team_members 中
  IF EXISTS (SELECT 1 FROM team_members WHERE user_id = auth_user.id) THEN
    RETURN json_build_object(
      'success', false,
      'message', '用户已存在于团队中',
      'user_id', auth_user.id
    );
  END IF;
  
  -- 创建团队成员记录
  INSERT INTO team_members (
    user_id, 
    email, 
    display_name, 
    role, 
    status,
    invited_by,
    joined_at,
    last_active
  )
  VALUES (
    auth_user.id,
    auth_user.email,
    COALESCE(auth_user.raw_user_meta_data->>'display_name', auth_user.email),
    'member',
    'pending',
    auth.uid(),  -- 当前管理员的 ID
    NULL,
    NULL
  );
  
  SELECT json_build_object(
    'success', true,
    'message', '用户恢复成功，请等待管理员审核',
    'user_id', auth_user.id,
    'email', auth_user.email
  ) INTO result;
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 测试函数
-- SELECT public.recover_user_registration('office@mideertoy.com');
