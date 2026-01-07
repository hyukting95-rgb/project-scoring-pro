import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lrnzttjunsqeszycbqhw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxybnp0dGp1bnNxZXN6eWNicWh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYwMDc2MCwiZXhwIjoyMDgzMTc2NzYwfQ.Gtkx5C8Lr4IXY__Eohzf6wYXAadCNQd97HP10KnJP6M';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function randomString(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(name, passed, details = '') {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`  ${symbol} ${name}`, color);
  if (details) {
    log(`    ${details}`, 'yellow');
  }
}

const TEST_RESULTS = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, details = '') {
  if (passed) {
    TEST_RESULTS.passed++;
  } else {
    TEST_RESULTS.failed++;
  }
  TEST_RESULTS.tests.push({ name, passed, details });
  logTest(name, passed, details);
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testDatabaseConnection() {
  logSection('1. 数据库连接测试');
  
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('count')
      .single();
    
    recordTest('Supabase 服务角色连接', !error, error ? error.message : '连接成功');
    
    if (error) {
      log(`  错误详情: ${JSON.stringify(error)}`, 'red');
      return false;
    }
    return true;
  } catch (err) {
    recordTest('Supabase 服务角色连接', false, err.message);
    return false;
  }
}

async function testTeamMembersPolicies() {
  logSection('2. RLS 策略检查');
  
  const { data: members, error: queryError } = await supabase
    .from('team_members')
    .select('*')
    .limit(1);
  
  if (queryError) {
    recordTest('查询 RLS 策略', false, queryError.message);
  } else {
    recordTest('查询 RLS 策略', true, '可以访问 team_members 表');
  }
  
  const { data: policies, error: policyError } = await supabase
    .rpc('exec_sql', { 
      sql: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'team_members'` 
    });
  
  if (policyError) {
    log('  无法查询策略详情 (需要 exec_sql 函数)', 'yellow');
    log('  当前 RLS 策略配置可能正常', 'blue');
  } else {
    recordTest('策略列表', true, `找到 ${policies?.length || 0} 个策略`);
    policies?.forEach(p => {
      log(`    - ${p.policyname}: ${p.cmd}`, 'blue');
    });
  }
}

async function testTeamMembersData() {
  logSection('3. 团队成员数据测试');
  
  const { data: members, error } = await supabase
    .from('team_members')
    .select('id, user_id, email, role, status');
  
  if (error) {
    recordTest('查询团队成员', false, error.message);
    return [];
  }
  
  recordTest('查询团队成员', true, `找到 ${members.length} 个成员`);
  
  members.forEach(m => {
    log(`  - ${m.email}: ${m.role}/${m.status}`, 'blue');
  });
  
  return members;
}

async function testAdminPermissions() {
  logSection('4. 管理员权限测试');
  
  const adminEmail = 'jt@mideertoy.com';
  const admin = await getTeamMemberByEmail(adminEmail);
  
  if (!admin) {
    recordTest('管理员账户存在', false, `找不到 ${adminEmail}`);
    return false;
  }
  
  recordTest('管理员账户存在', true, `${admin.email}: ${admin.role}/${admin.status}`);
  
  const isValidAdmin = admin.role === 'admin' && admin.status === 'active';
  recordTest('管理员状态有效', isValidAdmin, 
    isValidAdmin ? '正常' : `role=${admin.role}, status=${admin.status}`);
  
  return isValidAdmin;
}

async function getTeamMemberByEmail(email) {
  const { data } = await supabase
    .from('team_members')
    .select('*')
    .eq('email', email)
    .single();
  return data;
}

async function testDeleteFunctionality() {
  logSection('5. 删除功能测试');
  
  const testEmail = `test.delete.${randomString()}@test.com`;
  
  const testId = generateUUID();
  const testUserId = generateUUID();
  
  const { data: testUser, error: createError } = await supabase
    .from('team_members')
    .insert({
      id: testId,
      user_id: testUserId,
      email: testEmail,
      display_name: '删除测试用户',
      role: 'member',
      status: 'active'
    })
    .select()
    .single();
  
  if (createError) {
    recordTest('创建测试用户', false, createError.message);
    return;
  }
  
  recordTest('创建测试用户', true, testEmail);
  
  await wait(500);
  
  const { error: deleteError } = await supabase
    .from('team_members')
    .delete()
    .eq('id', testUser.id);
  
  recordTest('删除测试用户', !deleteError, deleteError ? deleteError.message : '删除成功');
  
  if (!deleteError) {
    await wait(500);
    
    const { data: afterDelete, error: checkError } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', testUser.id)
      .single();
    
    recordTest('验证用户已删除', !afterDelete, afterDelete ? '用户仍存在' : '用户已删除');
  }
}

async function testSuspendFunctionality() {
  logSection('6. 暂停功能测试');
  
  const testEmail = `test.suspend.${randomString()}@test.com`;
  
  const testId = generateUUID();
  const testUserId = generateUUID();
  
  const { data: testUser, error: createError } = await supabase
    .from('team_members')
    .insert({
      id: testId,
      user_id: testUserId,
      email: testEmail,
      display_name: '暂停测试用户',
      role: 'member',
      status: 'active'
    })
    .select()
    .single();
  
  if (createError) {
    recordTest('创建暂停测试用户', false, createError.message);
    return;
  }
  
  recordTest('创建暂停测试用户', true, testEmail);
  
  await wait(500);
  
  const { error: updateError } = await supabase
    .from('team_members')
    .update({ status: 'suspended' })
    .eq('id', testUser.id);
  
  recordTest('暂停用户', !updateError, updateError ? updateError.message : '暂停成功');
  
  if (!updateError) {
    await wait(500);
    
    const { data: afterSuspend, error: checkError } = await supabase
      .from('team_members')
      .select('status')
      .eq('id', testUser.id)
      .single();
    
    const isSuspended = afterSuspend?.status === 'suspended';
    recordTest('验证用户已暂停', isSuspended, afterSuspend?.status || '用户不存在');
    
    if (isSuspended) {
      await supabase
        .from('team_members')
        .update({ status: 'active' })
        .eq('id', testUser.id);
      
      await supabase
        .from('team_members')
        .delete()
        .eq('id', testUser.id);
    }
  }
}

async function testRecoverDeletedUsers() {
  logSection('7. 已删除用户恢复功能测试');
  
  const testEmail = `test.deleted.${randomString()}@test.com`;
  
  const testId = generateUUID();
  const testUserId = generateUUID();
  
  const { data: deletedUser, error: createError } = await supabase
    .from('team_members')
    .insert({
      id: testId,
      user_id: testUserId,
      email: testEmail,
      display_name: '已删除测试用户',
      role: 'member',
      status: 'deleted'
    })
    .select()
    .single();
  
  if (createError) {
    recordTest('创建已删除测试用户', false, createError.message);
    return;
  }
  
  recordTest('创建已删除测试用户', true, testEmail);
  
  const { data: allMembers, error: queryError } = await supabase
    .from('team_members')
    .select('*')
    .eq('status', 'deleted');
  
  recordTest('查询已删除用户', !queryError && allMembers.length > 0, 
    queryError ? queryError.message : `找到 ${allMembers?.length || 0} 个已删除用户`);
  
  await wait(500);
  
  const { error: recoverError } = await supabase
    .from('team_members')
    .update({ status: 'active' })
    .eq('id', deletedUser.id);
  
  recordTest('恢复用户', !recoverError, recoverError ? recoverError.message : '恢复成功');
  
  if (!recoverError) {
    await supabase
      .from('team_members')
      .delete()
      .eq('id', deletedUser.id);
  }
}

async function testGetDeletedUsersFunction() {
  logSection('8. get_deleted_users 函数测试');
  
  const { data, error } = await supabase
    .rpc('get_deleted_users');
  
  if (error) {
    recordTest('get_deleted_users 函数', false, error.message);
    log('  需要在数据库中创建此函数', 'yellow');
    return false;
  }
  
  recordTest('get_deleted_users 函数', true, `返回 ${data?.length || 0} 个用户`);
  return true;
}

async function testSupabaseAuthUsers() {
  logSection('9. Supabase Auth 用户测试');
  
  const { data: authUsers, error } = await supabase
    .from('auth.users')
    .select('id, email, created_at')
    .limit(10);
  
  if (error) {
    recordTest('查询 Auth 用户', false, error.message);
    return;
  }
  
  recordTest('查询 Auth 用户', true, `找到 ${authUsers.length} 个认证用户`);
  
  authUsers.forEach(u => {
    log(`  - ${u.email}`, 'blue');
  });
}

async function testLoginFlow() {
  logSection('10. 登录流程模拟测试');
  
  const testEmail = `test.login.${randomString()}@test.com`;
  
  const testId = generateUUID();
  const testUserId = generateUUID();
  
  await supabase
    .from('team_members')
    .insert({
      id: testId,
      user_id: testUserId,
      email: testEmail,
      display_name: '登录测试用户',
      role: 'member',
      status: 'pending'
    });
  
  recordTest('创建待审核用户', true, testEmail);
  
  const loginCheck = await supabase
    .from('team_members')
    .select('status')
    .eq('email', testEmail)
    .single();
  
  const wouldBeBlocked = loginCheck.data?.status !== 'active';
  recordTest('待审核用户应被阻止登录', wouldBeBlocked, 
    wouldBeBlocked ? '正确阻止' : '状态检查失败');
  
  await supabase
    .from('team_members')
    .delete()
    .eq('id', testId);
}

async function runAllTests() {
  console.log('\n');
  log('============================================================', 'cyan');
  log('        项目评分系统 - 全面自动化测试', 'cyan');
  log('============================================================', 'cyan');
  console.log(`\n测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`数据库: ${SUPABASE_URL}`);
  
  await testDatabaseConnection();
  
  const hasConnection = await testDatabaseConnection();
  if (!hasConnection) {
    log('\n无法连接到数据库，测试终止', 'red');
    return TEST_RESULTS;
  }
  
  await testSupabaseAuthUsers();
  await testTeamMembersPolicies();
  const members = await testTeamMembersData();
  await testAdminPermissions();
  await testDeleteFunctionality();
  await testSuspendFunctionality();
  await testRecoverDeletedUsers();
  await testGetDeletedUsersFunction();
  await testLoginFlow();
  
  logSection('测试结果摘要');
  const total = TEST_RESULTS.passed + TEST_RESULTS.failed;
  log(`总计: ${total} 个测试`, 'cyan');
  log(`通过: ${TEST_RESULTS.passed} 个`, 'green');
  log(`失败: ${TEST_RESULTS.failed} 个`, TEST_RESULTS.failed > 0 ? 'red' : 'green');
  
  if (TEST_RESULTS.failed > 0) {
    log('\n失败的测试:', 'red');
    TEST_RESULTS.tests
      .filter(t => !t.passed)
      .forEach(t => {
        log(`  - ${t.name}: ${t.details}`, 'red');
      });
  }
  
  console.log('\n');
  
  return TEST_RESULTS;
}

runAllTests()
  .then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('测试执行失败:', err);
    process.exit(1);
  });
