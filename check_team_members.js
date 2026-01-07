import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrnzttjunsqeszycbqhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxybnp0dGp1bnNxZXN6eWNicWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMjgwMDAsImV4cCI6MTczNzgxNDQwMH0.NNZNsOH_PK3-Iip5lR0Yaw_xm6ip1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeamMembers() {
  console.log('=== 检查 team_members 表 ===');
  
  const { data: teamMembers, error } = await supabase
    .from('team_members')
    .select('*');

  if (error) {
    console.log('查询失败:', error);
    return;
  }

  console.log('team_members 所有记录:');
  console.log(JSON.stringify(teamMembers, null, 2));

  console.log('\n=== 检查 jt@mideertoy.com 是否在 team_members 中 ===');
  const { data: jtMember } = await supabase
    .from('team_members')
    .select('*')
    .eq('user_id', '63d2ffa5-b7eb-4d5f-8354-271b578937d6');

  console.log('jt@mideertoy.com 的 team_members 记录:', JSON.stringify(jtMember, null, 2));
}

checkTeamMembers().catch(console.error);
