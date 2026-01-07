-- ============================================
-- 数据备份功能数据库设置
-- ============================================

-- 1. 删除旧表（如果存在）
DROP TABLE IF EXISTS backup_metadata CASCADE;

-- 2. 创建备份元数据表
CREATE TABLE backup_metadata (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('auto', 'manual')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'in_progress')),
    record_count JSONB DEFAULT '{"projects": 0, "personnel": 0, "configs": 0}',
    storage_path TEXT NOT NULL
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_backup_metadata_created_by ON backup_metadata(created_by);
CREATE INDEX IF NOT EXISTS idx_backup_metadata_created_at ON backup_metadata(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_metadata_type ON backup_metadata(type);

-- 4. 添加 RLS 策略 - 用户只能看到自己创建的备份
ALTER TABLE backup_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own backups" ON backup_metadata;
CREATE POLICY "Users can view own backups" ON backup_metadata
    FOR SELECT
    USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can insert own backups" ON backup_metadata;
CREATE POLICY "Users can insert own backups" ON backup_metadata
    FOR INSERT
    WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete own backups" ON backup_metadata;
CREATE POLICY "Users can delete own backups" ON backup_metadata
    FOR DELETE
    USING (created_by = auth.uid());

-- 5. 验证表创建成功
SELECT 'backup_metadata 表创建成功，当前记录数: ' || COUNT(*) as result FROM backup_metadata;
