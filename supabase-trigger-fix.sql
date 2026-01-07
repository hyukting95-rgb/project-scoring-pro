-- ============================================
-- 修复：重新创建触发器（先删除旧的）
-- ============================================

-- 1. 先删除旧的触发器和函数
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. 创建新函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM team_members WHERE user_id = NEW.id) THEN
    INSERT INTO team_members (user_id, email, display_name, role, status, invited_by, joined_at, last_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
      'member',
      'pending',
      NULL,
      NULL,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. 验证触发器是否存在
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 5. 更新现有数据状态
UPDATE team_members 
SET status = 'pending', joined_at = NULL 
WHERE email != '你的实际管理员邮箱@example.com';

-- 6. 查看当前所有用户
SELECT id, email, role, status FROM team_members ORDER BY created_at DESC;
