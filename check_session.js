import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lrnzttjunsqeszycbqhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxybnp0dGp1bnNxZXN6eWNicWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMjgwMDAsImV4cCI6MTczNzgxNDQwMH0.NNZNsOH_PK3-Iip5lR0Yaw_xm6ip1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuthSession() {
  console.log('=== 1. 获取当前会话信息 ===');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.log('获取会话失败:', sessionError);
  } else {
    console.log('Session:', JSON.stringify(session, null, 2));
  }

  console.log('\n=== 2. 获取当前用户 ===');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    console.log('获取用户失败:', userError);
  } else {
    console.log('当前用户:', JSON.stringify(user, null, 2));
  }

  console.log('\n=== 3. 获取所有会话 ===');
  const { data: { sessions }, error: sessionsError } = await supabase.auth.getSessions();
  
  if (sessionsError) {
    console.log('获取所有会话失败:', sessionsError);
  } else {
    console.log('所有会话:', JSON.stringify(sessions, null, 2));
  }
}

checkAuthSession().catch(console.error);
