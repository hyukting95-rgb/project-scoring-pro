-- ================================================
-- 修复项目ID格式问题的SQL脚本（修正版）
-- 运行时间: 2026-01-07
-- ================================================

-- 首先查看问题数据（将UUID转为text后再比较）
SELECT 
  id::text as id, 
  project_uid, 
  type, 
  content 
FROM public.projects 
WHERE id::text NOT LIKE '________-____-____-____-____________'
   OR LENGTH(id::text) != 36;

-- ================================================
-- 修复函数 - 自动修复所有损坏的数据
-- ================================================

CREATE OR REPLACE FUNCTION fix_project_ids()
RETURNS TABLE (
  old_id TEXT,
  new_id UUID,
  project_uid TEXT,
  fixed BOOLEAN
) AS $$
DECLARE
    bad_project RECORD;
    old_id TEXT;
    new_id UUID;
    affected_count INTEGER;
BEGIN
    FOR bad_project IN 
        SELECT id, project_uid FROM public.projects 
        WHERE id::text NOT LIKE '________-____-____-____-____________'
           OR LENGTH(id::text) != 36
    LOOP
        old_id := bad_project.id::text;
        new_id := gen_random_uuid();
        
        -- 更新 personnel_records 表中的 project_id 引用
        UPDATE public.personnel_records 
        SET project_id = new_id 
        WHERE project_id::text = old_id;
        
        GET DIAGNOSTICS affected_count = ROW_COUNT;
        
        -- 更新项目的 id
        UPDATE public.projects 
        SET id = new_id 
        WHERE id::text = old_id;
        
        RAISE NOTICE '修复项目: old_id=%, new_id=%, affected_records=%', old_id, new_id, affected_count;
        
        RETURN NEXT ROW (old_id, new_id, bad_project.project_uid, affected_count > 0);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 执行修复（取消注释以下行以运行）
-- ================================================

-- SELECT '开始修复...' AS status;
-- SELECT * FROM fix_project_ids();
-- SELECT '修复完成！' AS status;

-- ================================================
-- 验证修复结果
-- ================================================

-- 检查是否还有非UUID格式的ID
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ 所有项目ID都是有效的UUID'
    ELSE '✗ 发现 ' || COUNT(*) || ' 个非UUID格式的ID'
  END AS check_result,
  COUNT(*) as invalid_count
FROM public.projects 
WHERE id::text NOT LIKE '________-____-____-____-____________'
   OR LENGTH(id::text) != 36;

-- 查看修复后的数据样例
SELECT id::text, project_uid, type, content 
FROM public.projects 
ORDER BY created_at DESC 
LIMIT 5;
