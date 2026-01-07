-- ============================================
-- Storage Bucket RLS 策略 - backups bucket
-- ============================================

-- 启用 RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Allow authenticated users to upload backups" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete backups" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to backups" ON storage.objects;

-- 方案1: 允许认证用户对 backups bucket 做任何操作（最简单）
-- 由于备份文件存储路径中包含用户ID，且我们在 backup_metadata 表中跟踪所有者
-- 所以这里只需要允许认证用户上传/删除文件即可

CREATE POLICY "Allow authenticated users to upload backups" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'backups' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Allow authenticated users to manage backups" ON storage.objects
    FOR ALL
    USING (
        bucket_id = 'backups' AND
        auth.role() = 'authenticated'
    );

-- 验证策略
SELECT 
    name,
    (SELECT name FROM auth.users WHERE id = owner) as owner_name,
    created_at
FROM storage.objects 
WHERE bucket_id = 'backups'
LIMIT 10;
