import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrnzttjunsqeszycbqhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxybnp0dGp1bnNxZXN6eWNicWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMjgwMDAsImV4cCI6MTczNzgxNDQwMH0.NNZNsOH_PK3-Iip5lR0Yaw_xm6ip1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseAndFix() {
  console.log('=== 1. 检查当前登录用户 ===');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.log('获取用户失败:', userError);
    return;
  }
  console.log('当前用户:', JSON.stringify(user, null, 2));

  if (!user) {
    console.log('用户未登录！');
    return;
  }

  console.log('\n=== 2. 检查 profiles 表中是否有该用户 ===');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  console.log('Profile 数据:', JSON.stringify(profile, null, 2));
  if (profileError) {
    console.log('Profile 错误:', profileError);
  }

  console.log('\n=== 3. 直接插入/更新用户 profile (需要管理员权限) ===');
  const { data: upsertedProfile, error: upsertError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      role: 'admin',  // jt@mideertoy.com 是管理员
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (upsertError) {
    console.log('Upsert 失败:', upsertError);
  } else {
    console.log('成功创建/更新 profile:', JSON.stringify(upsertedProfile, null, 2));
  }

  console.log('\n=== 4. 再次尝试查询项目 ===');
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log('项目数据:', JSON.stringify(projects, null, 2));
  if (projectError) {
    console.log('查询项目错误:', projectError);
  }

  console.log('\n=== 5. 尝试插入一个测试项目 ===');
  const testProject = {
    id: '11111111-1111-1111-1111-111111111111',
    user_id: user.id,
    type: 'manual',
    content: '测试项目 - 诊断用',
    entry_time: new Date().toISOString(),
    score: 100,
    responsible_person: '测试负责人',
    status: '已完成',
    scoring_parts: [],
    raw_selections: {},
    total_work_days: 1.0
  };
  
  const { error: insertError } = await supabase
    .from('projects')
    .upsert(testProject);
  
  if (insertError) {
    console.log('插入测试项目失败:', insertError);
  } else {
    console.log('插入测试项目成功！');
  }

  console.log('\n=== 6. 查询验证 ===');
  const { data: verifyProjects, error: verifyError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', '11111111-1111-1111-1111-111111111111');
  
  console.log('验证查询结果:', JSON.stringify(verifyProjects, null, 2));
}

diagnoseAndFix().catch(console.error);
