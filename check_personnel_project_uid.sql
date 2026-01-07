-- 检查 personnel_records 表中的 project_uid 值
SELECT 
    pr.id,
    pr.project_id,
    pr.project_uid,
    p.project_uid as projects_project_uid
FROM public.personnel_records pr
LEFT JOIN public.projects p ON pr.project_id = p.id
LIMIT 20;
