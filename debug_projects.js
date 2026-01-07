import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrnzttjunsqeszycbqhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxybnp0dGp1bnNxZXN6eWNicWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMjgwMDAsImV4cCI6MTczNzgxNDQwMH0.NNZNsOH_PK3-Iip5lR0Yaw_xm6ip1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('=== 1. 检查 jt@mideertoy.com 用户 ===');
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, role, status')
    .eq('email', 'jt@mideertoy.com');
  console.log('用户数据:', JSON.stringify(users, null, 2));

  console.log('\n=== 2. 检查该用户的所有项目 ===');
  if (users && users.length > 0) {
    const userId = users[0].id;
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    console.log('项目数据:', JSON.stringify(projects, null, 2));
  }

  console.log('\n=== 3. 检查所有项目 ===');
  const { data: allProjects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('所有项目:', JSON.stringify(allProjects, null, 2));
}

checkData().catch(console.error);
