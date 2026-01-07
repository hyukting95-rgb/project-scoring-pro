import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import {
  getPendingUsers,
  getTeamMembersForAdmin,
  activateUser,
  suspendUser,
  deleteUser,
  setUserRole,
  getDeletedUsers,
  recoverUser
} from '../db';

interface TeamMember {
  id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'member';
  status: 'active' | 'pending' | 'suspended';
  joined_at: string | null;
  created_at: string;
}

interface PendingUser {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

interface DeletedUser {
  user_id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export const UserManagement: React.FC = () => {
  const { permissions, refreshPermissions } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'members' | 'deleted'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (permissions?.isAdmin) {
      loadData();
    }
  }, [permissions]);

  const loadData = async () => {
    setLoading(true);
    if (!permissions?.isAdmin) {
      setError('权限不足');
      setLoading(false);
      return;
    }
    try {
      const [pending, members, deleted] = await Promise.all([
        getPendingUsers(),
        getTeamMembersForAdmin(),
        getDeletedUsers()
      ]);
      setPendingUsers(pending);
      setTeamMembers(members);
      setDeletedUsers(deleted);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (memberId: string) => {
    try {
      setError(null);
      setSuccess(null);
      await activateUser(memberId);
      setSuccess('用户已激活');
      await loadData();
      await refreshPermissions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSuspend = async (memberId: string) => {
    try {
      setError(null);
      setSuccess(null);
      await suspendUser(memberId);
      setSuccess('用户已暂停');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm('确定要删除该用户吗？此操作不可撤销。')) return;
    try {
      setError(null);
      setSuccess(null);
      await deleteUser(memberId);
      setSuccess('用户已删除');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member') => {
    try {
      setError(null);
      setSuccess(null);
      await setUserRole(memberId, newRole);
      setSuccess(`用户角色已更新为${newRole === 'admin' ? '管理员' : '普通成员'}`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRecover = async (userId: string) => {
    if (!confirm('确定要恢复该用户吗？恢复后用户状态为待审核，需要重新激活。')) return;
    try {
      setError(null);
      setSuccess(null);
      await recoverUser(userId);
      setSuccess('用户已恢复');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  if (!permissions?.isAdmin) {
    return (
      <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-700/50">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-bold text-slate-300 mb-2">权限不足</h3>
          <p className="text-slate-500">只有管理员才能访问用户管理功能</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">用户管理</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'pending'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            待审核 ({pendingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'members'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            团队成员 ({teamMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('deleted')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'deleted'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            已删除 ({deletedUsers.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'pending' ? (
        <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
          {pendingUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-slate-400">暂无待审核用户</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {pendingUsers.map((user) => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold">
                      {user.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.display_name}</p>
                      <p className="text-slate-500 text-sm">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-sm">
                      申请时间: {new Date(user.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleActivate(user.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      批准
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      拒绝
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'members' ? (
        <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
          {teamMembers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">👥</div>
              <p className="text-slate-400">暂无团队成员</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {teamMembers.map((member) => (
                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      member.role === 'admin'
                        ? 'bg-amber-600/20 text-amber-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {member.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{member.display_name}</p>
                        {member.role === 'admin' && (
                          <span className="px-2 py-0.5 bg-amber-600/20 text-amber-400 text-xs rounded-full">
                            管理员
                          </span>
                        )}
                        {member.status === 'suspended' && (
                          <span className="px-2 py-0.5 bg-red-600/20 text-red-400 text-xs rounded-full">
                            已暂停
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-sm">
                      加入时间: {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '待激活'}
                    </span>
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as 'admin' | 'member')}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      disabled={member.status !== 'active'}
                    >
                      <option value="member">普通成员</option>
                      <option value="admin">管理员</option>
                    </select>
                    {member.status === 'active' ? (
                      <button
                        onClick={() => handleSuspend(member.id)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        暂停
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(member.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        激活
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
          {deletedUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-slate-400">暂无已删除用户</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {deletedUsers.map((user) => (
                <div key={user.user_id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center text-red-400 font-bold">
                      {user.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.display_name}</p>
                      <p className="text-slate-500 text-sm">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-sm">
                      注册时间: {new Date(user.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleRecover(user.user_id)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      恢复
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
