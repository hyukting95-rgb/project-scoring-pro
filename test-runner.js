import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { generateId, generateProjectUid } from './shared-utils.js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('错误: 缺少 Supabase 环境变量');
  console.log('请设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROJECT_UID_REGEX = /^P[A-Z0-9]{4}$/;

console.log('='.repeat(60));
console.log('项目评分系统 - 自动化测试');
console.log('='.repeat(60));
console.log();

let testsPassed = 0;
let testsFailed = 0;
let warnings = [];

function test(name, condition, errorMsg = '') {
  if (condition) {
    console.log(`✓ ${name}`);
    testsPassed++;
  } else {
    console.log(`✗ ${name}`);
    if (errorMsg) console.log(`  错误: ${errorMsg}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('1. 测试 ID 生成函数');
  console.log('-'.repeat(40));
  
  // Test generateId
  for (let i = 0; i < 5; i++) {
    const id = generateId();
    test(`generateId() 生成有效的UUID`, UUID_REGEX.test(id), `生成: ${id}`);
  }
  
  // Test generateProjectUid
  for (let i = 0; i < 5; i++) {
    const uid = generateProjectUid();
    test(`generateProjectUid() 生成有效的projectUid`, PROJECT_UID_REGEX.test(uid), `生成: ${uid}`);
  }
  console.log();

  console.log('2. 测试数据库连接');
  console.log('-'.repeat(40));
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    test('用户认证', false, authError.message);
    console.log('\n注意: 需要登录才能进行完整测试');
  } else {
    test('用户认证', !!user, user ? `用户ID: ${user.id}` : '未登录');
    if (user) {
      console.log(`  当前用户: ${user.email || '未知'}`);
    }
  }
  console.log();

  if (!user) {
    console.log('跳过数据库测试（需要登录）');
    printSummary();
    return;
  }

  console.log('3. 测试数据库表结构');
  console.log('-'.repeat(40));
  
  // Check projects table
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, project_uid')
    .limit(10);
  
  test('projects 表可访问', !projectsError, projectsError?.message);
  console.log(`  项目数量: ${projects?.length || 0}`);
  console.log();

  console.log('4. 测试数据完整性');
  console.log('-'.repeat(40));
  
  if (projects && projects.length > 0) {
    let invalidIdCount = 0;
    let invalidUidCount = 0;
    
    for (const project of projects) {
      // Check id is UUID
      if (!UUID_REGEX.test(project.id)) {
        invalidIdCount++;
        warnings.push(`项目 ${project.project_uid || project.id}: id 不是有效的UUID (当前值: ${project.id})`);
      }
      
      // Check project_uid format (if not null)
      if (project.project_uid && !PROJECT_UID_REGEX.test(project.project_uid)) {
        invalidUidCount++;
        warnings.push(`项目 ${project.id}: project_uid 格式不正确 (当前值: ${project.project_uid})`);
      }
    }
    
    test(`所有项目的 id 都是UUID`, invalidIdCount === 0, `发现 ${invalidIdCount} 个非UUID格式的id`);
    test(`所有项目的 project_uid 格式正确`, invalidUidCount === 0, `发现 ${invalidUidCount} 个格式不正确的project_uid`);
    
    if (invalidIdCount > 0) {
      console.log('\n损坏的数据详情:');
      warnings.filter(w => w.includes('id 不是有效的UUID')).forEach(w => console.log(`  - ${w}`));
    }
  } else {
    console.log('  没有项目数据可检查');
  }
  console.log();

  console.log('5. 测试人员记录表');
  console.log('-'.repeat(40));
  
  const { data: personnel, error: personnelError } = await supabase
    .from('personnel_records')
    .select('id, project_id, person')
    .limit(10);
  
  test('personnel_records 表可访问', !personnelError, personnelError?.message);
  console.log(`  人员记录数量: ${personnel?.length || 0}`);
  
  if (personnel && personnel.length > 0) {
    let invalidProjectIdCount = 0;
    
    for (const record of personnel) {
      if (!UUID_REGEX.test(record.project_id)) {
        invalidProjectIdCount++;
        warnings.push(`人员记录 ${record.id}: project_id 不是有效的UUID (当前值: ${record.project_id})`);
      }
    }
    
    test(`所有人员记录的 project_id 都是UUID`, invalidProjectIdCount === 0, `发现 ${invalidProjectIdCount} 个非UUID格式的project_id`);
    
    if (invalidProjectIdCount > 0) {
      console.log('\n损坏的数据详情:');
      warnings.filter(w => w.includes('project_id 不是有效的UUID')).forEach(w => console.log(`  - ${w}`));
    }
  }
  console.log();

  console.log('6. 测试 CRUD 操作');
  console.log('-'.repeat(40));
  
  // Create a test project
  const testProjectId = generateId();
  const testProjectUid = generateProjectUid();
  const testProject = {
    id: testProjectId,
    project_uid: testProjectUid,
    user_id: user.id,
    type: '测试项目',
    content: '自动化测试创建的项目',
    entry_time: new Date().toISOString(),
    score: 1.0,
    responsible_person: '测试人员',
    status: '进行中',
    scoring_parts: [{ label: '基础分', value: 1.0 }],
    raw_selections: {},
    total_work_days: 1
  };
  
  const { error: createError } = await supabase
    .from('projects')
    .insert(testProject);
  
  test('创建项目', !createError, createError?.message);
  
  if (!createError) {
    console.log(`  创建的项目: ${testProjectUid} (${testProjectId})`);
    
    // Read back
    const { data: readProject, error: readError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', testProjectId)
      .single();
    
    test('读取项目', !readError && !!readProject, readError?.message);
    
    if (readProject) {
      test('项目ID一致', readProject.id === testProjectId);
      test('项目UID一致', readProject.project_uid === testProjectUid);
    }
    
    // Clean up - delete test project
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', testProjectId);
    
    test('删除项目', !deleteError, deleteError?.message);
  }
  console.log();

  printSummary();
}

function printSummary() {
  console.log('='.repeat(60));
  console.log('测试总结');
  console.log('='.repeat(60));
  console.log(`通过: ${testsPassed}`);
  console.log(`失败: ${testsFailed}`);
  console.log();
  
  if (warnings.length > 0) {
    console.log('警告:');
    warnings.forEach(w => console.log(`  - ${w}`));
    console.log();
  }
  
  if (testsFailed > 0) {
    console.log('建议操作:');
    console.log('  1. 如果有数据完整性错误，请运行 fix_project_ids_migration.sql 修复数据');
    console.log('  2. 如果有认证错误，请先登录应用');
    console.log();
  }
  
  if (warnings.length > 0 || testsFailed > 0) {
    console.log('要运行数据库修复，请执行以下SQL:');
    console.log('  1. 打开 Supabase SQL 编辑器');
    console.log('  2. 运行 fix_project_ids_migration.sql 中的修复函数');
    console.log();
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});
