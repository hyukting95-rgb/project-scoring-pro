-- ================================================
-- 项目评分系统数据库表结构
-- 执行时间: 2026-01-05
-- ================================================

-- 1. 用户资料表 (扩展 Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 项目表 (扩展原有ProjectRecord)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  score NUMERIC(10,2) DEFAULT 0,
  responsible_person TEXT NOT NULL,
  status TEXT CHECK (status IN ('进行中', '已完成')) DEFAULT '进行中',
  scoring_parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_selections JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 人员表 (扩展原有PersonnelRecord)
CREATE TABLE IF NOT EXISTS public.personnel_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  person TEXT NOT NULL,
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  score NUMERIC(10,2) DEFAULT 0,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 评分配置表 (扩展原有ScoringConfig)
CREATE TABLE IF NOT EXISTS public.scoring_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  cmf JSONB NOT NULL DEFAULT '[]'::jsonb,
  cmfp JSONB NOT NULL DEFAULT '[]'::jsonb,
  base4 JSONB NOT NULL DEFAULT '[]'::jsonb,
  base5 JSONB NOT NULL DEFAULT '[]'::jsonb,
  addons JSONB NOT NULL DEFAULT '[]'::jsonb,
  package JSONB NOT NULL DEFAULT '[]'::jsonb,
  manual JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用行级安全
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_configs ENABLE ROW LEVEL SECURITY;

-- 创建用户资料自动创建函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 自动创建用户资料触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 行级安全策略
DROP POLICY IF EXISTS "用户只能访问自己的项目" ON public.projects;
CREATE POLICY "用户只能访问自己的项目" ON public.projects
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户只能访问自己的人员记录" ON public.personnel_records;
CREATE POLICY "用户只能访问自己的人员记录" ON public.personnel_records
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户只能访问自己的评分配置" ON public.scoring_configs;
CREATE POLICY "用户只能访问自己的评分配置" ON public.scoring_configs
  FOR ALL USING (auth.uid() = user_id);

-- 管理员可以访问所有数据
DROP POLICY IF EXISTS "管理员可以访问所有项目" ON public.projects;
CREATE POLICY "管理员可以访问所有项目" ON public.projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "管理员可以访问所有人员记录" ON public.personnel_records;
CREATE POLICY "管理员可以访问所有人员记录" ON public.personnel_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "管理员可以访问所有评分配置" ON public.scoring_configs;
CREATE POLICY "管理员可以访问所有评分配置" ON public.scoring_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_entry_time ON public.projects(entry_time);

CREATE INDEX IF NOT EXISTS idx_personnel_user_id ON public.personnel_records(user_id);
CREATE INDEX IF NOT EXISTS idx_personnel_project_id ON public.personnel_records(project_id);

CREATE INDEX IF NOT EXISTS idx_scoring_configs_user_id ON public.scoring_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_scoring_configs_is_default ON public.scoring_configs(is_default);

-- 启用实时功能
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.personnel_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scoring_configs;

-- 触发器自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS personnel_records_updated_at ON public.personnel_records;
CREATE TRIGGER personnel_records_updated_at BEFORE UPDATE ON public.personnel_records
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS scoring_configs_updated_at ON public.scoring_configs;
CREATE TRIGGER scoring_configs_updated_at BEFORE UPDATE ON public.scoring_configs
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 插入默认评分配置
INSERT INTO public.scoring_configs (
  user_id, 
  cmf, 
  cmfp, 
  base4, 
  base5, 
  addons, 
  package, 
  manual,
  is_default
) VALUES (
  NULL,
  '[{"label": "CMF标准配置", "value": 10}]',
  '[{"mode": "模式A", "main": 8, "support": 4}]',
  '[{"label": "4系基础", "value": 15}]',
  '[{"label": "5系基础", "value": 20}]',
  '[{"id": "addon1", "label": "附加选项A", "score": 5}]',
  '[{"type": "基础型包装", "score": 10}]',
  '[{"type": "轻量化说明书内容制作", "score": 8}]',
  TRUE
) ON CONFLICT DO NOTHING;