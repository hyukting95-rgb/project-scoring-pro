-- 修复项目ID格式问题的迁移脚本
-- 运行时间: 2026-01-06
-- 问题: 某些项目的 id 字段包含 projectUid 值而非 UUID

-- 1. 首先查看所有非UUID格式的项目ID
SELECT id, project_uid, type, content 
FROM public.projects 
WHERE id::text NOT LIKE '________-____-____-____-____________' 
   OR id IS NULL;

-- 2. 创建临时函数来生成新UUID
CREATE OR REPLACE FUNCTION fix_project_ids()
RETURNS void AS $$
DECLARE
    bad_project RECORD;
    old_id TEXT;
    new_id UUID;
    affected_personnel RECORD;
BEGIN
    -- 遍历所有有问题的项目
    FOR bad_project IN 
        SELECT id, project_uid FROM public.projects 
        WHERE id::text NOT LIKE '________-____-____-____-____________'
           OR id IS NULL
    LOOP
        old_id := bad_project.id;
        new_id := gen_random_uuid();
        
        RAISE NOTICE '修复项目: old_id=%, project_uid=%, new_id=%', old_id, bad_project.project_uid, new_id;
        
        -- 更新 personnel_records 表中的 project_id 引用
        FOR affected_personnel IN 
            SELECT id FROM public.personnel_records WHERE project_id::text = old_id
        LOOP
            UPDATE public.personnel_records 
            SET project_id = new_id 
            WHERE id = affected_personnel.id;
            RAISE NOTICE '  更新人员记录: personnel_id=%', affected_personnel.id;
        END LOOP;
        
        -- 更新项目的 id
        UPDATE public.projects 
        SET id = new_id 
        WHERE id::text = old_id;
        
    END LOOP;
    
    RAISE NOTICE '项目ID修复完成！';
END;
$$ LANGUAGE plpgsql;

-- 3. 执行修复
-- SELECT fix_project_ids();

-- 4. 验证修复结果
-- SELECT id, project_uid, type FROM public.projects WHERE id::text NOT LIKE '________-____-____-____-____________';

-- 5. 如果不想使用函数，也可以直接执行以下SQL修复特定项目：
-- 假设 PSPVR 是有问题的ID，替换为你的实际值
/*
-- 注意：以下SQL需要根据实际数据调整

-- 生成新UUID
-- 在 Supabase SQL编辑器中执行：SELECT gen_random_uuid() 来获取新UUID

-- 假设 new_uuid 是生成的新UUID，old_id 是有问题的ID
-- UPDATE public.personnel_records SET project_id = 'new_uuid-actual-uuid-here' WHERE project_id::text = 'PSPVR';
-- UPDATE public.projects SET id = 'new_uuid-actual-uuid-here' WHERE id::text = 'PSPVR';
*/

-- 6. 再次检查应该没有非UUID格式的ID了
-- SELECT '检查完成: ' || COUNT(*)::text || ' 个非UUID格式的ID' AS result
-- FROM public.projects 
-- WHERE id::text NOT LIKE '________-____-____-____-____________' 
--    OR id IS NULL;
