import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Crown, Clock, Shield, Mail, Trash2, Edit, UserCheck, AlertTriangle } from 'lucide-react';
import { 
  TeamMember, 
  InvitationToken,
  generateInvitationToken,
  acceptInvitation,
  getTeamMembers,
  getPendingInvitations,
  cancelInvitation,
  updateMemberRole,
  updateMemberStatus,
  removeTeamMember,
  checkUserIsAdmin,
  getTeamStats,
  TeamStats
} from '../team';

interface TeamManagerProps {
  onInvitationTokenGenerated?: (token: string) => void;
}

export default function TeamManager({ onInvitationTokenGenerated }: TeamManagerProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<InvitationToken[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [error, setError] = useState<string | null>(null);

  // 加载团队数据
  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [membersData, invitationsData, statsData, isAdmin] = await Promise.all([
        getTeamMembers(),
        getPendingInvitations(),
        getTeamStats(),
        checkUserIsAdmin()
      ]);

      setMembers(membersData);
      setPendingInvitations(invitationsData);
      setTeamStats(statsData);
      setCurrentUserIsAdmin(isAdmin);
    } catch (error) {
      console.error('加载团队数据失败:', error);
      setError('加载团队数据失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  };

  // 邀请团队成员
  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      setError('请输入邮箱地址');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    try {
      setInviting(true);
      setError(null);

      const invitation = await generateInvitationToken(inviteEmail.trim(), inviteRole);
      setPendingInvitations(prev => [invitation, ...prev]);
      setShowInviteForm(false);
      setInviteEmail('');
      
      // 生成邀请链接
      const invitationLink = `${window.location.origin}?invite_token=${invitation.token}`;
      onInvitationTokenGenerated?.(invitationLink);
      
      alert(`邀请已发送！\n\n邀请链接:\n${invitationLink}\n\n该链接72小时内有效。`);
    } catch (error) {
      console.error('邀请失败:', error);
      setError(`邀请失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setInviting(false);
    }
  };

  // 取消邀请
  const handleCancelInvitation = async (invitationId: string) => {
    if (!window.confirm('确定要取消这个邀请吗？')) return;

    try {
      await cancelInvitation(invitationId);
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      alert('邀请已取消');
    } catch (error) {
      console.error('取消邀请失败:', error);
      alert(`取消邀请失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 更新成员角色
  const handleUpdateMemberRole = async (memberId: string, newRole: 'admin' | 'member') => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const confirmMessage = `确定要将 ${member.display_name} 的角色修改为 ${newRole === 'admin' ? '管理员' : '普通成员'} 吗？`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await updateMemberRole(memberId, newRole);
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      alert('角色修改成功');
    } catch (error) {
      console.error('修改角色失败:', error);
      alert(`修改角色失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 更新成员状态
  const handleUpdateMemberStatus = async (memberId: string, newStatus: 'active' | 'suspended') => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const action = newStatus === 'suspended' ? '暂停' : '激活';
    const confirmMessage = `确定要${action} ${member.display_name} 的账户吗？`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await updateMemberStatus(memberId, newStatus);
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: newStatus } : m));
      alert(`账户${action}成功`);
    } catch (error) {
      console.error('修改账户状态失败:', error);
      alert(`修改账户状态失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 移除团队成员
  const handleRemoveMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const confirmMessage = `⚠️ 重要警告！
    
确定要移除 ${member.display_name} 吗？

⚠️ 此操作将：
• 永久移除该成员
• 删除其所有项目数据
• 无法撤销操作

请确认您理解后果并仍然要执行此操作。`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await removeTeamMember(memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      alert('团队成员已移除');
    } catch (error) {
      console.error('移除成员失败:', error);
      alert(`移除成员失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, []);

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? <Crown className="w-4 h-4 text-yellow-400" /> : <UserCheck className="w-4 h-4 text-blue-400" />;
  };

  const getRoleText = (role: string) => {
    return role === 'admin' ? '管理员' : '成员';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'suspended': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '正常';
      case 'pending': return '待加入';
      case 'suspended': return '已暂停';
      default: return '未知';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mr-3" />
        <span className="text-slate-400">加载团队信息中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 团队概览 */}
      {teamStats && (
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">团队管理</h3>
                <p className="text-sm text-slate-400">管理团队成员和权限</p>
              </div>
            </div>
            
            {currentUserIsAdmin && (
              <button
                onClick={() => setShowInviteForm(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
              >
                <UserPlus className="w-4 h-4" />
                邀请成员
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{teamStats.total_members}</div>
              <div className="text-xs text-slate-400">总成员数</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-400">{teamStats.active_members}</div>
              <div className="text-xs text-slate-400">活跃成员</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-yellow-400">{teamStats.admins}</div>
              <div className="text-xs text-slate-400">管理员</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-400">{teamStats.pending_members}</div>
              <div className="text-xs text-slate-400">待加入</div>
            </div>
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* 邀请表单 */}
      {showInviteForm && (
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <h4 className="text-lg font-semibold text-white mb-4">邀请新成员</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">邮箱地址</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2 text-white"
                placeholder="请输入要邀请的成员邮箱"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">角色</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                className="w-full glass-input rounded-xl px-4 py-2 text-white"
                disabled={!currentUserIsAdmin}
              >
                <option value="member">普通成员</option>
                <option value="admin">管理员</option>
              </select>
              {!currentUserIsAdmin && (
                <p className="text-xs text-slate-500 mt-1">只有管理员可以邀请管理员</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleInviteMember}
                disabled={inviting}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-all"
              >
                {inviting ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {inviting ? '发送中...' : '发送邀请'}
              </button>
              <button
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmail('');
                  setError(null);
                }}
                className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 团队成员列表 */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <h4 className="text-lg font-semibold text-white">团队成员</h4>
        </div>
        
        {members.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">暂无团队成员</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {members.map((member) => (
              <div key={member.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                      {getRoleIcon(member.role)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h5 className="font-medium text-white">{member.display_name}</h5>
                        <span className="px-2 py-1 text-xs rounded-full bg-slate-800 text-slate-400">
                          {getRoleText(member.role)}
                        </span>
                        <span className={`text-xs ${getStatusColor(member.status)}`}>
                          {getStatusText(member.status)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-6 text-xs text-slate-500">
                        <span>邮箱: {member.email}</span>
                        <span>加入时间: {member.joined_at ? new Date(member.joined_at).toLocaleDateString('zh-CN') : '未知'}</span>
                        {member.last_active && (
                          <span>最后活动: {new Date(member.last_active).toLocaleDateString('zh-CN')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {currentUserIsAdmin && member.status === 'active' && (
                    <div className="flex items-center gap-2">
                      {/* 角色切换 */}
                      <button
                        onClick={() => handleUpdateMemberRole(
                          member.id, 
                          member.role === 'admin' ? 'member' : 'admin'
                        )}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg transition-all"
                      >
                        <Shield className="w-4 h-4" />
                        {member.role === 'admin' ? '降为成员' : '升为管理员'}
                      </button>
                      
                      {/* 状态切换 */}
                      <button
                        onClick={() => handleUpdateMemberStatus(
                          member.id, 
                          member.status === 'active' ? 'suspended' : 'active'
                        )}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg transition-all"
                      >
                        <Clock className="w-4 h-4" />
                        {member.status === 'active' ? '暂停' : '激活'}
                      </button>
                      
                      {/* 移除成员 */}
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        移除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 待处理的邀请 */}
      {pendingInvitations.length > 0 && (
        <div className="bg-slate-900/50 rounded-xl border border-slate-800">
          <div className="p-6 border-b border-slate-800">
            <h4 className="text-lg font-semibold text-white">待处理的邀请</h4>
          </div>
          
          <div className="divide-y divide-slate-800">
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-400" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h5 className="font-medium text-white">{invitation.email}</h5>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-600/20 text-blue-400">
                          {getRoleText(invitation.role)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-6 text-xs text-slate-500">
                        <span>邀请时间: {new Date(invitation.created_at).toLocaleString('zh-CN')}</span>
                        <span>过期时间: {new Date(invitation.expires_at).toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    取消邀请
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}