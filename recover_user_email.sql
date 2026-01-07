-- 恢复已删除用户的团队成员资格
-- 运行此 SQL 后，被删除的用户将出现在"待审核"列表中

-- 1. 创建恢复用户的函数
CREATE OR REPLACE FUNCTION public.recover_user_by_email(user_email TEXT)
RETURNS JSON AS $$
DECLARE
  auth_user RECORD;
  result JSON;
BEGIN
  -- 查找 auth.users 中的用户
  SELECT * INTO auth_user 
  FROM auth.users 
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', '用户不存在于认证系统中'
    );
  END IF;
  
  -- 检查是否已在 team_members 中
  IF EXISTS (SELECT 1 FROM team_members WHERE user_id = auth_user.id) THEN
    RETURN json_build_object(
      'success', false,
      'error', '用户已存在于团队成员表中',
      'status', (SELECT status FROM team_members WHERE user_id = auth_user.id)
    );
  END IF;
  
  -- 创建团队成员记录（状态为 pending）
  INSERT INTO team_members (
    user_id, 
    email, 
    display_name, 
    role, 
    status
  )
  VALUES (
    auth_user.id,
    auth_user.email,
    COALESCE(auth_user.raw_user_meta_data->>'display_name', auth_user.email),
    'member',
    'pending'
  );
  
  RETURN json_build_object(
    'success', true,
    'message', '用户已恢复，请通知管理员审核',
    'user_id', auth_user.id,
    'email', auth_user.email
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 授予匿名调用权限（使用 anon 角色）
-- 这个函数可以用 anon key 调用

-- 3. 测试恢复 office@mideertoy.com
SELECT public.recover_user_by_email('office@mideertoy.com');

-- 4. 查看恢复后的结果
SELECT id, email, role, status, created_at FROM team_members WHERE email = 'office@mideertoy.com';
