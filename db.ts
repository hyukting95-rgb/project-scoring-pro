import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ProjectRecord, PersonnelRecord, ProjectStatus, ScoringConfig, PackageProjectType, ManualProjectType } from './types';
import { TEST_MODE, isTestMode } from './test-mode';
import * as XLSX from 'xlsx';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 在测试模式下，跳过环境变量检查
if (!isTestMode() && (!supabaseUrl || !supabaseKey)) {
  console.error('请在.env文件中配置VITE_SUPABASE_URL和VITE_SUPABASE_ANON_KEY');
}

// 初始化Supabase客户端
export const supabase: SupabaseClient = createClient(
  isTestMode() ? 'https://placeholder.supabase.co' : supabaseUrl || '',
  isTestMode() ? 'placeholder-key' : supabaseKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// 用户认证相关函数
export async function getCurrentUser() {
  if (isTestMode()) {
    return TEST_MODE.mockUser;
  }
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string, displayName?: string) {
  console.log('[signUp] 开始注册流程:', email);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || email.split('@')[0]
      }
    }
  });
  
  if (error) {
    console.error('[signUp] Supabase注册错误:', error);
    
    // 如果用户已存在，尝试恢复团队成员记录
    if (error.message?.includes('User already registered') || error.message?.includes('already been registered')) {
      console.log('[signUp] 用户已存在于 Auth 中，尝试恢复团队成员记录');
      
      // 调用数据库函数恢复用户
      const { data: recoverData, error: recoverError } = await supabase
        .rpc('recover_user_by_email', { user_email: email });
      
      if (recoverError) {
        console.error('[signUp] 调用恢复函数失败:', recoverError);
        throw new Error('账户已存在，但无法恢复团队成员资格，请联系管理员');
      }
      
      console.log('[signUp] 用户恢复结果:', recoverData);
      
      if (recoverData?.success) {
        console.log('[signUp] 团队成员记录恢复成功');
        return { 
          user: { id: recoverData.user_id, email: recoverData.email }, 
          alreadyExisted: true,
          message: recoverData.message
        };
      } else {
        throw new Error(recoverData?.error || '无法恢复账户');
      }
    }
    
    throw error;
  }

  console.log('[signUp] 用户注册成功:', data.user?.id);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function refreshSession() {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) throw error;
  return data;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });
  if (error) throw error;
}

export async function checkUserPermissions() {
  if (isTestMode()) {
    return {
      isAdmin: true,
      isActive: true,
      role: 'admin' as const,
      status: 'active' as const
    };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      isAdmin: false,
      isActive: false,
      role: 'member' as const,
      status: 'pending' as const,
      existsInTeam: false
    };
  }

  try {
    const { data, error } = await supabase
      .rpc('check_user_permission', { p_user_id: user.id });

    if (error || !data) {
      return {
        isAdmin: false,
        isActive: false,
        role: 'member' as const,
        status: 'pending' as const,
        existsInTeam: false
      };
    }

    return {
      isAdmin: data.isAdmin,
      isActive: data.isActive,
      role: data.role,
      status: data.status,
      existsInTeam: data.existsInTeam
    };
  } catch (error) {
    console.error('检查用户权限失败:', error);
    return {
      isAdmin: false,
      isActive: false,
      role: 'member' as const,
      status: 'pending' as const,
      existsInTeam: false
    };
  }
}

export async function getAllProjectsForAdmin(): Promise<ProjectRecord[]> {
  if (isTestMode()) {
    return TEST_MODE.mockData.projects;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const isAdmin = await checkUserPermissions();
  if (!isAdmin.isAdmin) {
    throw new Error('只有管理员可以查看所有项目');
  }

  const { data, error } = await supabase
    .rpc('get_all_projects_for_admin');

  if (error) throw error;

  return (data || []).map(record => ({
    id: record.id,
    projectUid: record.project_uid,
    type: record.type,
    content: record.content,
    entryTime: record.entry_date || record.entry_time,
    score: record.score,
    responsiblePerson: record.responsible_person,
    status: record.status,
    scoringParts: record.scoring_parts,
    rawSelections: record.raw_selections,
    totalWorkDays: record.total_work_days || 0
  }));
}

export async function getAllPersonnelForAdmin(): Promise<PersonnelRecord[]> {
  if (isTestMode()) {
    return TEST_MODE.mockData.personnel;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const isAdmin = await checkUserPermissions();
  if (!isAdmin.isAdmin) {
    throw new Error('只有管理员可以查看所有人员记录');
  }

  const { data, error } = await supabase
    .rpc('get_all_personnel_for_admin');

  if (error) throw error;

  return (data || []).map(record => ({
    id: record.id,
    person: record.name,
    projectId: record.project_id,
    projectUid: record.project_uid,
    entryTime: record.created_at,
    score: record.total_amount,
    content: record.position_name,
    workDays: record.work_days || 1.0
  }));
}

export async function getPendingUsers(): Promise<{ id: string; email: string; display_name: string; created_at: string }[]> {
  if (isTestMode()) {
    return [
      { id: '1', email: 'pending@example.com', display_name: '待审核用户', created_at: new Date().toISOString() }
    ];
  }

  const { data, error } = await supabase
    .rpc('get_pending_users');

  if (error) throw error;
  return data || [];
}

export async function activateUser(memberId: string): Promise<void> {
  if (isTestMode()) {
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const isAdmin = await checkUserPermissions();
  if (!isAdmin.isAdmin) {
    throw new Error('只有管理员可以激活用户');
  }

  const { error } = await supabase
    .rpc('activate_team_member', { p_id: memberId });

  if (error) throw error;
}

export async function suspendUser(memberId: string): Promise<void> {
  if (isTestMode()) {
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  console.log('[suspendUser] 当前用户:', user.id, user.email);

  const isAdmin = await checkUserPermissions();
  console.log('[suspendUser] 管理员权限检查:', isAdmin);
  if (!isAdmin.isAdmin) {
    throw new Error('只有管理员可以暂停用户');
  }

  const { data: memberArray, error: memberError } = await supabase
    .rpc('get_member_by_id', { p_id: memberId });

  console.log('[suspendUser] 目标成员:', memberArray, 'error:', memberError);

  if (memberError) {
    throw new Error(`查询成员失败: ${memberError.message}`);
  }

  const member = Array.isArray(memberArray) && memberArray.length > 0 ? memberArray[0] : null;

  if (!member || !member.id) {
    throw new Error('成员不存在');
  }

  if (member?.user_id === user.id) {
    throw new Error('不能暂停自己的账户');
  }

  console.log('[suspendUser] 准备暂停成员:', memberId);

  const { error } = await supabase
    .rpc('suspend_team_member', { p_id: memberId });

  console.log('[suspendUser] 更新结果:', error);

  if (error) throw error;
}

export async function deleteUser(memberId: string): Promise<void> {
  if (isTestMode()) {
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  console.log('[deleteUser] 当前用户:', user.id, user.email);

  const isAdmin = await checkUserPermissions();
  console.log('[deleteUser] 管理员权限检查:', isAdmin);
  if (!isAdmin.isAdmin) {
    throw new Error('只有管理员可以删除用户');
  }

  const { data: memberArray, error: memberError } = await supabase
    .rpc('get_member_by_id', { p_id: memberId });

  console.log('[deleteUser] 目标成员:', memberArray, 'error:', memberError);

  if (memberError) {
    throw new Error(`查询成员失败: ${memberError.message}`);
  }

  const member = Array.isArray(memberArray) && memberArray.length > 0 ? memberArray[0] : null;

  if (!member || !member.id) {
    throw new Error('成员不存在');
  }

  if (member?.user_id === user.id) {
    throw new Error('不能删除自己的账户');
  }

  console.log('[deleteUser] 准备删除成员:', memberId);

  const { error } = await supabase
    .rpc('delete_team_member', { p_id: memberId });

  console.log('[deleteUser] 删除结果:', error);

  if (error) throw error;
}

export async function setUserRole(memberId: string, role: 'admin' | 'member'): Promise<void> {
  if (isTestMode()) {
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const isAdmin = await checkUserPermissions();
  if (!isAdmin.isAdmin) {
    throw new Error('只有管理员可以修改用户角色');
  }

  const { data: memberArray } = await supabase
    .rpc('get_member_by_id', { p_id: memberId });

  const member = Array.isArray(memberArray) && memberArray.length > 0 ? memberArray[0] : null;

  if (member?.user_id === user.id) {
    throw new Error('不能修改自己的角色');
  }

  const { error } = await supabase
    .rpc('set_member_role', { p_id: memberId, p_role: role });

  if (error) throw error;
}

export async function getDeletedUsers() {
  if (isTestMode()) {
    return [
      { user_id: 'deleted-1', email: 'deleted1@example.com', display_name: '已删除用户1', created_at: new Date().toISOString() },
      { user_id: 'deleted-2', email: 'deleted2@example.com', display_name: '已删除用户2', created_at: new Date().toISOString() }
    ];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const isAdmin = await checkUserPermissions();
  if (!isAdmin.isAdmin) {
    throw new Error('只有管理员可以查看已删除用户');
  }

  const { data, error } = await supabase
    .rpc('get_deleted_users_list');

  if (error) throw error;
  return data || [];
}

export async function recoverUser(userId: string) {
  if (isTestMode()) {
    return { success: true, message: '用户已恢复' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const isAdmin = await checkUserPermissions();
  if (!isAdmin.isAdmin) {
    throw new Error('只有管理员可以恢复用户');
  }

  const { data, error } = await supabase
    .rpc('recover_user', { p_user_id: userId });

  if (error) throw error;
  
  if (data?.success) {
    return data;
  } else {
    throw new Error(data?.error || '恢复用户失败');
  }
}

export async function getTeamMembersForAdmin() {
  if (isTestMode()) {
    return [
      { id: '1', email: 'admin@example.com', display_name: '管理员', role: 'admin', status: 'active', joined_at: new Date().toISOString(), created_at: new Date().toISOString() },
      { id: '2', email: 'member@example.com', display_name: '普通成员', role: 'member', status: 'active', joined_at: new Date().toISOString(), created_at: new Date().toISOString() }
    ];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const isAdmin = await checkUserPermissions();
  if (!isAdmin.isAdmin) {
    throw new Error('只有管理员可以查看团队成员');
  }

  const { data, error } = await supabase
    .rpc('get_all_team_members');

  if (error) throw error;
  return data || [];
}

// 数据库操作函数

// 项目操作
export async function getAllProjects(): Promise<ProjectRecord[]> {
  if (isTestMode()) {
    return TEST_MODE.mockData.projects;
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('id, project_uid, type, content, entry_date, entry_time, score, responsible_person, status, scoring_parts, raw_selections, total_work_days')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  console.log('getAllProjects: 加载了', data?.length || 0, '个项目');
  if (data && data.length > 0) {
    console.log('示例数据 - 第一个项目:', {
      id: data[0].id,
      id格式: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data[0].id) ? 'UUID' : '非UUID',
      project_uid: data[0].project_uid
    });
  }
  
  // 转换数据格式
  return (data || []).map(record => ({
    id: record.id,
    projectUid: record.project_uid,
    type: record.type,
    content: record.content,
    entryTime: record.entry_date || record.entry_time?.split('T')[0] || '',
    score: record.score,
    responsiblePerson: record.responsible_person,
    status: record.status,
    scoringParts: record.scoring_parts,
    rawSelections: record.raw_selections,
    totalWorkDays: record.total_work_days || 0
  }));
}

export async function putProject(project: ProjectRecord): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录后再保存项目');

  // 验证 id 必须是 UUID 格式
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(project.id)) {
    console.error('无效的项目ID:', { id: project.id, projectUid: project.projectUid });
    throw new Error(`ID格式错误: ${project.id}。请尝试刷新页面或清除浏览器缓存后重试。如果问题持续，可能需要修复数据库中的旧数据。`);
  }

  // 转换数据格式以匹配数据库结构
  const projectData = {
    id: project.id,
    project_uid: project.projectUid,
    user_id: user.id,
    type: project.type,
    content: project.content,
    entry_date: project.entryTime,
    entry_time: project.entryTime,
    score: project.score,
    responsible_person: project.responsiblePerson,
    status: project.status,
    scoring_parts: project.scoringParts,
    raw_selections: project.rawSelections,
    total_work_days: project.totalWorkDays
  };

  const { error } = await supabase
    .from('projects')
    .upsert(projectData);

  if (error) throw error;
}

export async function putProjects(projects: ProjectRecord[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录后再保存项目');

  // 批量转换数据格式
  const projectsData = projects.map(project => ({
    id: project.id,
    project_uid: project.projectUid,
    user_id: user.id,
    type: project.type,
    content: project.content,
    entry_date: project.entryTime,
    entry_time: project.entryTime,
    score: project.score,
    responsible_person: project.responsiblePerson,
    status: project.status,
    scoring_parts: project.scoringParts,
    raw_selections: project.rawSelections
  }));

  const { error } = await supabase
    .from('projects')
    .upsert(projectsData);

  if (error) throw error;
}

export async function updateProjectStatus(id: string, status: ProjectStatus): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录后再更新状态');

  const { error } = await supabase
    .from('projects')
    .update({ status })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function deleteProjectWithPersonnel(projectId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录后再删除项目');

  // 先删除项目
  const { error: projectError } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', user.id);

  if (projectError) throw projectError;

  // 删除关联的人员记录
  const { error: personnelError } = await supabase
    .from('personnel_records')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', user.id);

  if (personnelError) throw personnelError;
}

export async function replaceProjectAndPersonnel(project: ProjectRecord, personnel: PersonnelRecord[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录后再保存数据');

  // 验证 id 必须是 UUID 格式
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(project.id)) {
    console.error('replaceProjectAndPersonnel: 无效的项目ID', { 
      id: project.id, 
      projectUid: project.projectUid,
      idLength: project.id?.length,
      projectUidLength: project.projectUid?.length
    });
    throw new Error(`项目ID格式无效: ${project.id} (期望UUID格式)。请刷新页面后重试。如果问题持续，请清除浏览器缓存。`);
  }

  // 验证所有人员记录的项目ID也必须是 UUID
  for (const record of personnel) {
    if (!uuidRegex.test(record.projectId)) {
      console.error('replaceProjectAndPersonnel: 无效的人员记录项目ID', {
        recordId: record.id,
        projectId: record.projectId,
        projectUid: record.projectUid
      });
      throw new Error(`人员记录项目ID格式无效: ${record.projectId}`);
    }
  }

  // 转换项目数据
  const projectData = {
    id: project.id,
    project_uid: project.projectUid,
    user_id: user.id,
    type: project.type,
    content: project.content,
    entry_date: project.entryTime,
    entry_time: project.entryTime,
    score: project.score,
    responsible_person: project.responsiblePerson,
    status: project.status,
    scoring_parts: project.scoringParts,
    raw_selections: project.rawSelections,
    total_work_days: project.totalWorkDays
  };

  // 转换人员数据
  const personnelData = personnel.map(record => ({
    id: record.id,
    user_id: user.id,
    project_id: record.projectId,
    project_uid: record.projectUid,
    person: record.person,
    entry_time: record.entryTime,
    score: record.score,
    content: record.content,
    work_days: record.workDays || 1.0
  }));

  // 使用事务操作（Supabase会自动处理）
  const { error: projectError } = await supabase
    .from('projects')
    .upsert(projectData);

  if (projectError) throw projectError;

  // 先删除该项目的人员记录，然后插入新的
  const { error: deleteError } = await supabase
    .from('personnel_records')
    .delete()
    .eq('project_id', project.id)
    .eq('user_id', user.id);

  if (deleteError) throw deleteError;

  if (personnelData.length > 0) {
    const { error: personnelError } = await supabase
      .from('personnel_records')
      .insert(personnelData);

    if (personnelError) throw personnelError;
  }
}

// 人员记录操作
export async function getAllPersonnel(): Promise<PersonnelRecord[]> {
  if (isTestMode()) {
    return TEST_MODE.mockData.personnel;
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录后再查看人员记录');

  const { data, error } = await supabase
    .from('personnel_records')
    .select('id, project_id, project_uid, person, entry_time, score, content, work_days')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  console.log('getAllPersonnel: 加载了', data?.length || 0, '条人员记录');
  if (data && data.length > 0) {
    console.log('示例数据 - 第一条人员记录:', {
      id: data[0].id,
      id格式: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data[0].id) ? 'UUID' : '非UUID',
      project_id: data[0].project_id,
      project_id格式: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data[0].project_id) ? 'UUID' : '非UUID',
      project_uid: data[0].project_uid
    });
  }
  
  // 转换数据格式以匹配原有接口
  return (data || []).map(record => ({
    id: record.id,
    person: record.person,
    projectId: record.project_id,
    projectUid: record.project_uid,
    entryTime: record.entry_time,
    score: record.score,
    content: record.content,
    workDays: record.work_days || 1.0
  }));
}

export async function putPersonnel(records: PersonnelRecord[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录后再保存人员记录');

  // 转换数据格式
  const personnelData = records.map(record => ({
    id: record.id,
    user_id: user.id,
    project_id: record.projectId,
    project_uid: record.projectUid,
    person: record.person,
    entry_time: record.entryTime,
    score: record.score,
    content: record.content,
    work_days: record.workDays || 1.0
  }));

  const { error } = await supabase
    .from('personnel_records')
    .upsert(personnelData);

  if (error) throw error;
}

// 评分配置操作
export async function getConfig(): Promise<ScoringConfig | null> {
  if (isTestMode()) {
    return {
      cmf: [
        { label: '有品类视觉指导', value: 0.5 },
        { label: '无品类视觉指导', value: 1.0 }
      ],
      cmfp: [
        { mode: 'additional', main: 1.0, support: 0.5 },
        { mode: 'none', main: 1.5, support: 0 }
      ],
      package: [
        { type: PackageProjectType.BASIC, score: 0.5 },
        { type: PackageProjectType.MICRO_INNOVATION, score: 1.0 },
        { type: PackageProjectType.INNOVATION, score: 2.0 }
      ],
      manual: [
        { type: ManualProjectType.LIGHTWEIGHT, score: 0.2 },
        { type: ManualProjectType.MEDIUM, score: 0.4 },
        { type: ManualProjectType.ORIGINAL, score: 1.0 }
      ],
      addons: [
        { id: 'light_illu', label: '轻量化插画制作', score: 0.5 },
        { id: 'medium_illu', label: '中量化插画制作', score: 1.0 },
        { id: 'high_illu', label: '高量化插画制作', score: 2.0 },
        { id: 'light_struct', label: '轻量化结构', score: 0.5 },
        { id: 'medium_struct', label: '中量化结构', score: 1.0 }
      ],
      base4: [
        { label: '+1.0', value: 1.0 },
        { label: '+1.5', value: 1.5 }
      ],
      base5: [
        { label: '+1.5', value: 1.5 },
        { label: '+2.0', value: 2.0 }
      ]
    };
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return getDefaultConfig();
  }

  try {
    const perms = await checkUserPermissions();
    const isAdmin = perms.isAdmin && perms.isActive;

    if (isAdmin) {
      let { data, error } = await supabase
        .from('scoring_configs')
        .select('*')
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) {
        const config = getDefaultConfig();
        const newConfig = {
          user_id: null as any,
          cmf: config.cmf,
          cmfp: config.cmfp,
          base4: config.base4,
          base5: config.base5,
          addons: config.addons,
          package: config.package,
          manual: config.manual,
          is_default: true
        };
        const { error: insertError } = await supabase
          .from('scoring_configs')
          .insert(newConfig);
        
        if (insertError) throw insertError;
        
        return config;
      }

      return {
        cmf: data.cmf || [],
        cmfp: data.cmfp || [],
        base4: data.base4 || [],
        base5: data.base5 || [],
        addons: data.addons || [],
        package: data.package || [],
        manual: data.manual || []
      };
    }

    const { data, error } = await supabase
      .from('scoring_configs')
      .select('*')
      .eq('is_default', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) return getDefaultConfig();

    return {
      cmf: data.cmf || [],
      cmfp: data.cmfp || [],
      base4: data.base4 || [],
      base5: data.base5 || [],
      addons: data.addons || [],
      package: data.package || [],
      manual: data.manual || []
    };
  } catch (error) {
    console.error('获取评分配置失败:', error);
    return getDefaultConfig();
  }
}

function getDefaultConfig(): ScoringConfig {
  return {
    cmf: [
      { label: '有品类视觉指导', value: 0.5 },
      { label: '无品类视觉指导', value: 1.0 }
    ],
    cmfp: [
      { mode: 'additional', main: 1.0, support: 0.5 },
      { mode: 'none', main: 1.5, support: 0 }
    ],
    package: [
      { type: PackageProjectType.BASIC, score: 0.5 },
      { type: PackageProjectType.MICRO_INNOVATION, score: 1.0 },
      { type: PackageProjectType.INNOVATION, score: 2.0 }
    ],
    manual: [
      { type: ManualProjectType.LIGHTWEIGHT, score: 0.2 },
      { type: ManualProjectType.MEDIUM, score: 0.4 },
      { type: ManualProjectType.ORIGINAL, score: 1.0 }
    ],
    addons: [
      { id: 'light_illu', label: '轻量化插画制作', score: 0.5 },
      { id: 'medium_illu', label: '中量化插画制作', score: 1.0 },
      { id: 'high_illu', label: '高量化插画制作', score: 2.0 },
      { id: 'light_struct', label: '轻量化结构', score: 0.5 },
      { id: 'medium_struct', label: '中量化结构', score: 1.0 }
    ],
    base4: [
      { label: '+1.0', value: 1.0 },
      { label: '+1.5', value: 1.5 }
    ],
    base5: [
      { label: '+1.5', value: 1.5 },
      { label: '+2.0', value: 2.0 }
    ]
  };
}

export async function saveConfig(config: ScoringConfig): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('请先登录后再保存配置');

  const perms = await checkUserPermissions();
  const isAdmin = perms.isAdmin && perms.isActive;
  
  if (!isAdmin) {
    throw new Error('只有管理员才能修改评分配置');
  }

  const configData = {
    user_id: null as any,
    cmf: config.cmf,
    cmfp: config.cmfp,
    base4: config.base4,
    base5: config.base5,
    addons: config.addons,
    package: config.package,
    manual: config.manual,
    is_default: true
  };

  const { data: existingConfig } = await supabase
    .from('scoring_configs')
    .select('id')
    .eq('is_default', true)
    .single();

  if (existingConfig) {
    const { error } = await supabase
      .from('scoring_configs')
      .update(configData)
      .eq('id', existingConfig.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('scoring_configs')
      .insert(configData);

    if (error) throw error;
  }

  const { error: deleteError } = await supabase
    .from('scoring_configs')
    .delete()
    .eq('is_default', false);

  if (deleteError) {
    console.warn('删除用户自定义配置时出错:', deleteError);
  }
}

// 实时订阅功能
export function subscribeToProjects(callback: (payload: any) => void) {
  return supabase
    .channel('projects_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'projects'
    }, callback)
    .subscribe();
}

export function subscribeToPersonnel(callback: (payload: any) => void) {
  return supabase
    .channel('personnel_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'personnel_records'
    }, callback)
    .subscribe();
}

export function subscribeToConfig(callback: (payload: any) => void) {
  return supabase
    .channel('config_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'scoring_configs'
    }, callback)
    .subscribe();
}

// 备份和恢复功能
export async function exportDB(): Promise<boolean> {
  try {
    const projects = await getAllProjects();
    const personnel = await getAllPersonnel();
    const config = await getConfig();

    const backupData = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      projects,
      personnel,
      config
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `project-scoring-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    return true;
  } catch (error) {
    console.error('导出数据失败:', error);
    return false;
  }
}

// 导出数据看板全部数据（包含工作天数统计）
export async function exportAllDataBoard(): Promise<boolean> {
  try {
    const projects = await getAllProjects();
    const personnel = await getAllPersonnel();

    // 1. 项目明细库 - 包含工作天数统计
    const projectDetailsData = projects.map(project => {
      const projectPersonnel = personnel.filter(p => p.projectId === project.id);
      return {
        '项目UID': project.projectUid || project.id,
        '项目类型': project.type,
        '项目内容': project.content,
        '主负责人': project.responsiblePerson,
        '状态': project.status,
        '录入时间': project.entryTime,
        '获得积分': project.score,
        '工作天数': project.totalWorkDays,
        '参与人员数': projectPersonnel.length,
        '明细记录': projectPersonnel.map(p => ({
          '责任人': p.person,
          '工作内容': p.content,
          '获得积分': p.score,
          '工作天数': p.workDays
        })).join('; ')
      };
    });

    // 2. 积分明细表 - 包含项目UID
    console.log('开始生成积分明细表...');
    console.log('- 项目数量:', projects.length);
    console.log('- 人员记录数量:', personnel.length);
    
    const scoreDetailsData = personnel.map(record => {
      const project = projects.find(p => p.id === record.projectId);
      
      // 调试：打印未找到项目的情况
      if (!project) {
        console.warn('未找到项目:', {
          recordProjectId: record.projectId,
          recordProjectUid: record.projectUid,
          所有项目IDs: projects.map(p => p.id).slice(0, 5)
        });
      }
      
      return {
        '项目UID': project?.projectUid || record.projectUid || record.projectId,
        '项目类型': project?.type || '',
        '项目内容': project?.content || '',
        '责任人': record.person,
        '工作内容': record.content,
        '获得积分': record.score,
        '工作天数': record.workDays,
        '录入时间': record.entryTime
      };
    });

    // 3. 人员得分表 - 包含已完成项目天数统计
    const personnelScoreData = Object.entries(
      personnel.reduce((acc, record) => {
        if (!acc[record.person]) {
          acc[record.person] = { totalScore: 0, completedProjects: 0, completedDays: 0, details: [] as any[] };
        }
        acc[record.person].totalScore += record.score;
        const project = projects.find(p => p.id === record.projectId);
        if (project?.status === '已完成') {
          acc[record.person].completedProjects += 1;
          acc[record.person].completedDays += record.workDays;
        }
        acc[record.person].details.push({
          '项目UID': project?.projectUid || record.projectUid || record.projectId,
          '工作内容': record.content,
          '获得积分': record.score,
          '工作天数': record.workDays,
          '项目状态': project?.status || ''
        });
        return acc;
      }, {} as Record<string, { totalScore: number; completedProjects: number; completedDays: number; details: any[] }>)
    ).map(([person, data]) => ({
      '责任人': person,
      '总获得积分': data.totalScore,
      '已完成项目数': data.completedProjects,
      '已完成项目天数': data.completedDays,
      '明细记录': data.details.map(d => 
        `项目UID:${d['项目UID']}, 内容:${d['工作内容']}, 积分:${d['获得积分']}, 天数:${d['工作天数']}`
      ).join('; ')
    }));

    // 创建 Excel 工作簿
    const workbook = XLSX.utils.book_new();

    // 添加项目明细库
    const projectSheet = XLSX.utils.json_to_sheet(projectDetailsData);
    XLSX.utils.book_append_sheet(workbook, projectSheet, '项目明细库');

    // 添加积分明细表
    const scoreSheet = XLSX.utils.json_to_sheet(scoreDetailsData);
    XLSX.utils.book_append_sheet(workbook, scoreSheet, '积分明细表');

    // 添加人员得分表
    const personnelSheet = XLSX.utils.json_to_sheet(personnelScoreData);
    XLSX.utils.book_append_sheet(workbook, personnelSheet, '人员得分表');

    // 导出 Excel 文件
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(excelBlob);
    link.download = `数据看板-${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    
    return true;
  } catch (error) {
    console.error('导出数据看板失败:', error);
    return false;
  }
}

export async function importDB(): Promise<boolean> {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    return new Promise((resolve) => {
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(false);
          return;
        }

        try {
          const text = await file.text();
          const backupData = JSON.parse(text);
          
          // 验证数据格式
          if (!backupData.projects || !backupData.personnel) {
            throw new Error('无效的备份文件格式');
          }

          // 导入数据
          if (backupData.projects.length > 0) {
            await putProjects(backupData.projects);
          }
          
          if (backupData.personnel.length > 0) {
            await putPersonnel(backupData.personnel);
          }
          
          if (backupData.config) {
            await saveConfig(backupData.config);
          }

          resolve(true);
        } catch (error) {
          console.error('导入数据失败:', error);
          resolve(false);
        }
      };
      
      input.click();
    });
  } catch (error) {
    console.error('导入数据失败:', error);
    return false;
  }
}

// 向后兼容的API（保持原有接口不变）
const api = (typeof window !== 'undefined' ? (window as any).api : null);

// 如果存在Electron API，则优先使用
if (api) {
  // 覆盖原有函数以支持Supabase
  (window as any).api = {
    getAllProjects,
    getAllPersonnel,
    getConfig,
    putProject,
    putProjects,
    saveConfig,
    deleteProjectWithPersonnel,
    putPersonnel,
    replaceProjectAndPersonnel,
    updateProjectStatus,
    exportDB,
    importDB,
    signIn,
    signUp,
    signOut,
    getCurrentUser,
    checkUserPermissions,
    getAllProjectsForAdmin,
    getAllPersonnelForAdmin,
    getPendingUsers,
    activateUser,
    suspendUser,
    deleteUser,
    setUserRole,
    getTeamMembersForAdmin
  };
}