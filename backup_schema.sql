-- 创建备份元数据表
CREATE TABLE IF NOT EXISTS backup_metadata (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  size BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('auto', 'manual')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'in_progress')),
  record_count JSONB NOT NULL DEFAULT '{"projects": 0, "personnel": 0, "configs": 0}',
  storage_path TEXT NOT NULL,
  
  -- 确保每个用户只能看到自己的备份
  CONSTRAINT backup_ownership CHECK (created_by = auth.uid())
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_backup_metadata_created_by ON backup_metadata(created_by);
CREATE INDEX IF NOT EXISTS idx_backup_metadata_created_at ON backup_metadata(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_metadata_type ON backup_metadata(type);

-- 启用RLS (Row Level Security)
ALTER TABLE backup_metadata ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 用户只能查看自己创建的备份
CREATE POLICY "Users can view own backups" ON backup_metadata
  FOR SELECT USING (auth.uid() = created_by);

-- 用户只能插入自己创建的备份
CREATE POLICY "Users can insert own backups" ON backup_metadata
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 用户只能更新自己创建的备份
CREATE POLICY "Users can update own backups" ON backup_metadata
  FOR UPDATE USING (auth.uid() = created_by);

-- 用户只能删除自己创建的备份
CREATE POLICY "Users can delete own backups" ON backup_metadata
  FOR DELETE USING (auth.uid() = created_by);

-- 创建更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为现有表添加updated_at字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'updated_at') THEN
        ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personnel_records' AND column_name = 'updated_at') THEN
        ALTER TABLE personnel_records ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scoring_configs' AND column_name = 'updated_at') THEN
        ALTER TABLE scoring_configs ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 创建触发器自动更新updated_at字段
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personnel_records_updated_at BEFORE UPDATE ON personnel_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scoring_configs_updated_at BEFORE UPDATE ON scoring_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建清理旧备份的函数
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS void AS $$
DECLARE
  backup_record RECORD;
  auto_backups_to_delete INTEGER;
  manual_backups_to_delete INTEGER;
BEGIN
  -- 删除超出限制的自动备份（保留4个）
  WITH backups_to_keep AS (
    SELECT id 
    FROM backup_metadata 
    WHERE type = 'auto' AND created_by = auth.uid()
    ORDER BY created_at DESC 
    LIMIT 4
  )
  DELETE FROM backup_metadata 
  WHERE type = 'auto' 
    AND created_by = auth.uid()
    AND id NOT IN (SELECT id FROM backups_to_keep);

  -- 删除超出限制的手动备份（保留20个）
  WITH backups_to_keep AS (
    SELECT id 
    FROM backup_metadata 
    WHERE type = 'manual' AND created_by = auth.uid()
    ORDER BY created_at DESC 
    LIMIT 20
  )
  DELETE FROM backup_metadata 
  WHERE type = 'manual' 
    AND created_by = auth.uid()
    AND id NOT IN (SELECT id FROM backups_to_keep);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建获取备份统计信息的函数
CREATE OR REPLACE FUNCTION get_backup_stats(user_uuid UUID DEFAULT auth.uid())
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_backups', COUNT(*),
    'auto_backups', COUNT(*) FILTER (WHERE type = 'auto'),
    'manual_backups', COUNT(*) FILTER (WHERE type = 'manual'),
    'total_size', COALESCE(SUM(size), 0),
    'latest_backup', MAX(created_at),
    'oldest_backup', MIN(created_at)
  ) INTO result
  FROM backup_metadata 
  WHERE created_by = user_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;