import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrnzttjunsqeszycbqhw.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxybnp0dGp1bnNxZXN6eWNicWh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzIyODAwMCwiZXhwIjoxNzM3ODE0NDAwfQ.6x9_1q2w3e4r5t6y7u8i9o0p1a2s3d4f5g6h7j8k9l0';

const supabase = createClient(supabaseUrl, serviceKey);

async function checkProjects() {
  console.log('=== 使用 service_role 检查 projects 表（绕过 RLS） ===\n');

  // 1. 检查所有项目
  const { data: allProjects, error: allError } = await supabase
    .from('projects')
    .select('id, user_id, type, content, created_at')
    .order('created_at', { ascending: false });

  if (allError) {
    console.log('查询所有项目失败:', allError);
  } else {
    console.log(`总共有 ${allProjects?.length || 0} 个项目:`);
    console.log(JSON.stringify(allProjects, null, 2));
  }

  // 2. 检查 jt@mideertoy.com 的项目
  console.log('\n=== jt@mideertoy.com 的项目 ===');
  const jtUserId = '63d2ffa5-b7eb-4d5f-8354-271b578937d6';
  
  const { data: jtProjects, error: jtError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', jtUserId);

  if (jtError) {
    console.log('查询失败:', jtError);
  } else {
    console.log(`jt@mideertoy.com 有 ${jtProjects?.length || 0} 个项目:`);
    console.log(JSON.stringify(jtProjects, null, 2));
  }

  // 3. 检查项目表结构
  console.log('\n=== projects 表结构 ===');
  const { data: columns } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_schema', 'public')
    .eq('table_name', 'projects')
    .order('ordinal_position');

  console.log(JSON.stringify(columns, null, 2));
}

checkProjects().catch(console.error);
