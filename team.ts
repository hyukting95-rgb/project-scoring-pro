import { supabase } from './db';

// 团队成员数据类型定义
export interface TeamMember {
  id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'member';
  status: 'active' | 'pending' | 'suspended';
  invited_at: string;
  joined_at: string | null;
  last_active: string | null;
  invited_by: string;
}

// 邀请令牌类型定义
export interface InvitationToken {
  id: string;
  token: string;
  email: string;
  role: 'admin' | 'member';
  expires_at: string;
  created_at: string;
  created_by: string;
  used_at: string | null;
  used_by: string | null;
}

// 团队统计信息
export interface TeamStats {
  total_members: number;
  active_members: number;
  pending_members: number;
  admins: number;
  recent_activity: string;
}

// 邀请配置
const INVITATION_CONFIG = {
  token_expiry_hours: 72, // 邀请链接72小时有效
  max_pending_invitations: 10, // 最多10个待处理的邀请
  admin_limit: 2, // 最多2个管理员
};

// 生成邀请令牌
export async function generateInvitationToken(
  email: string, 
  role: 'admin' | 'member' = 'member'
): Promise<InvitationToken> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  // 检查权限：只有管理员可以邀请管理员
  if (role === 'admin') {
    const isAdmin = await checkUserIsAdmin(user.id);
    if (!isAdmin) {
      throw new Error('只有管理员可以邀请其他管理员');
    }
  }

  // 检查邀请限制
  const pendingCount = await getPendingInvitationsCount(user.id);
  if (pendingCount >= INVITATION_CONFIG.max_pending_invitations) {
    throw new Error(`待处理邀请已达上限 (${INVITATION_CONFIG.max_pending_invitations} 个)`);
  }

  // 检查管理员数量限制
  if (role === 'admin') {
    const adminCount = await getTeamAdminCount();
    if (adminCount >= INVITATION_CONFIG.admin_limit) {
      throw new Error(`管理员数量已达上限 (${INVITATION_CONFIG.admin_limit} 个)`);
    }
  }

  // 检查邮箱是否已存在
  const existingMember = await getTeamMemberByEmail(email);
  if (existingMember) {
    throw new Error('该邮箱已是团队成员');
  }

  const pendingInvitation = await getPendingInvitationByEmail(email);
  if (pendingInvitation) {
    throw new Error('该邮箱已有待处理的邀请');
  }

  try {
    // 生成邀请令牌
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + INVITATION_CONFIG.token_expiry_hours * 60 * 60 * 1000);

    // 保存邀请到数据库
    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        token,
        email: email.toLowerCase(),
        role,
        expires_at: expiresAt.toISOString(),
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    console.log('邀请令牌创建成功:', invitation);
    return invitation;
  } catch (error) {
    console.error('创建邀请令牌失败:', error);
    throw new Error(`创建邀请失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 验证和使用邀请令牌
export async function acceptInvitation(token: string): Promise<TeamMember> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  try {
    // 查找有效的邀请令牌
    const { data: invitation, error: tokenError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .eq('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !invitation) {
      throw new Error('邀请令牌无效或已过期');
    }

    // 检查邮箱是否匹配
    if (user.email !== invitation.email) {
      throw new Error('当前登录邮箱与邀请邮箱不匹配');
    }

    // 检查是否已是团队成员
    const existingMember = await getTeamMemberByEmail(user.email);
    if (existingMember) {
      throw new Error('您已经是团队成员');
    }

    // 添加用户到团队
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .insert({
        user_id: user.id,
        email: user.email,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || '用户',
        role: invitation.role,
        status: 'active',
        invited_by: invitation.created_by,
        joined_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      })
      .select()
      .single();

    if (memberError) throw memberError;

    // 标记邀请为已使用
    const { error: updateError } = await supabase
      .from('team_invitations')
      .update({
        used_at: new Date().toISOString(),
        used_by: user.id
      })
      .eq('id', invitation.id);

    if (updateError) throw updateError;

    console.log('团队邀请接受成功:', member);
    return member;
  } catch (error) {
    console.error('接受邀请失败:', error);
    throw new Error(`接受邀请失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 获取团队成员列表
export async function getTeamMembers(): Promise<TeamMember[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('joined_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// 获取待处理的邀请列表
export async function getPendingInvitations(): Promise<InvitationToken[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const { data, error } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// 取消邀请
export async function cancelInvitation(invitationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  const { error } = await supabase
    .from('team_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('created_by', user.id);

  if (error) throw error;
}

// 更新成员角色
export async function updateMemberRole(memberId: string, newRole: 'admin' | 'member'): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  // 检查权限：只有管理员可以修改角色
  const isAdmin = await checkUserIsAdmin(user.id);
  if (!isAdmin) {
    throw new Error('只有管理员可以修改成员角色');
  }

  // 检查管理员数量限制
  if (newRole === 'admin') {
    const adminCount = await getTeamAdminCount();
    if (adminCount >= INVITATION_CONFIG.admin_limit) {
      throw new Error(`管理员数量已达上限 (${INVITATION_CONFIG.admin_limit} 个)`);
    }
  }

  const { error } = await supabase
    .from('team_members')
    .update({ role: newRole })
    .eq('id', memberId);

  if (error) throw error;
}

// 暂停/激活成员
export async function updateMemberStatus(memberId: string, status: 'active' | 'suspended'): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  // 检查权限：只有管理员可以修改成员状态
  const isAdmin = await checkUserIsAdmin(user.id);
  if (!isAdmin) {
    throw new Error('只有管理员可以修改成员状态');
  }

  // 不能暂停自己
  const { data: member } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('id', memberId)
    .single();

  if (member?.user_id === user.id) {
    throw new Error('不能暂停自己的账户');
  }

  const { error } = await supabase
    .from('team_members')
    .update({ status })
    .eq('id', memberId);

  if (error) throw error;
}

// 移除团队成员
export async function removeTeamMember(memberId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  // 检查权限：只有管理员可以移除成员
  const isAdmin = await checkUserIsAdmin(user.id);
  if (!isAdmin) {
    throw new Error('只有管理员可以移除团队成员');
  }

  // 不能移除自己
  const { data: member } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('id', memberId)
    .single();

  if (member?.user_id === user.id) {
    throw new Error('不能移除自己的账户');
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

// 检查当前用户是否为管理员
export async function checkUserIsAdmin(userId?: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;
  
  if (!targetUserId) return false;

  const { data, error } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', targetUserId)
    .eq('status', 'active')
    .single();

  if (error || !data) return false;
  return data.role === 'admin';
}

// 获取团队统计信息
export async function getTeamStats(): Promise<TeamStats> {
  const { data, error } = await supabase
    .from('team_members')
    .select('role, status, last_active');

  if (error) throw error;

  const members = data || [];
  const activeMembers = members.filter(m => m.status === 'active');
  const admins = activeMembers.filter(m => m.role === 'admin');
  const pendingMembers = members.filter(m => m.status === 'pending');

  const recentActivity = activeMembers
    .map(m => m.last_active)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

  return {
    total_members: members.length,
    active_members: activeMembers.length,
    pending_members: pendingMembers.length,
    admins: admins.length,
    recent_activity: recentActivity || '无活动记录'
  };
}

// 工具函数
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function getTeamMemberByEmail(email: string): Promise<TeamMember | null> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

async function getPendingInvitationByEmail(email: string): Promise<InvitationToken | null> {
  const { data, error } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

async function getPendingInvitationsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('team_invitations')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', userId)
    .eq('used_at', null)
    .gt('expires_at', new Date().toISOString());

  if (error) throw error;
  return count || 0;
}

async function getTeamAdminCount(): Promise<number> {
  const { count, error } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('status', 'active');

  if (error) throw error;
  return count || 0;
}