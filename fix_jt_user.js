import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrnzttjunsqeszycbqhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxybnp0dGp1bnNxZXN6eWNicWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMjgwMDAsImV4cCI6MTczNzgxNDQwMH0.NNZNsOH_PK3-Iip5lR0Yaw_xm6ip1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixUser() {
  console.log('=== 1. 检查 auth.users 中的 jt@mideertoy.com ===');
  
  // 先检查 profiles 表
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'jt@mideertoy.com');
  console.log('Profiles 中的用户:', JSON.stringify(existingProfile, null, 2));

  // 由于无法直接查询 auth.users，我们尝试根据已知的用户行为来判断
  // 假设用户可以从应用登录，说明 auth.users 中应该有该用户
  
  // 尝试插入或更新用户 profile
  console.log('\n=== 2. 同步用户到 profiles 表 ===');
  
  // 先检查当前登录用户（通过 getUser）
  const { data: { user } } = await supabase.auth.getUser();
  console.log('当前登录用户:', JSON.stringify(user, null, 2));
  
  if (user) {
    // 用户已登录，确保其在 profiles 表中
    const { data: profile, error } = await supabase
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
    
    if (error) {
      console.log('插入失败:', error);
    } else {
      console.log('成功插入/更新 profile:', JSON.stringify(profile, null, 2));
    }
  } else {
    console.log('未检测到登录用户，需要先登录');
  }
}

checkAndFixUser().catch(console.error);
