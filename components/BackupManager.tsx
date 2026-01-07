import React, { useState, useEffect } from 'react';
import { Database, Download, Trash2, Plus, Clock, FileText, AlertTriangle, X, Lock } from 'lucide-react';
import { 
  createBackup, 
  getBackupList, 
  restoreBackup, 
  deleteBackup, 
  checkAutoBackup,
  formatFileSize,
  BackupMetadata 
} from '../backup';
import { checkUserPermissions } from '../db';

interface BackupManagerProps {
  onBackupCreated?: () => void;
}

export default function BackupManager({ onBackupCreated }: BackupManagerProps) {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [backupName, setBackupName] = useState(`手动备份 ${new Date().toLocaleString('zh-CN')}`);
  const [backupDescription, setBackupDescription] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // 检查管理员权限
  useEffect(() => {
    const checkAdmin = async () => {
      const permissions = await checkUserPermissions();
      setIsAdmin(permissions.isAdmin);
    };
    checkAdmin();
  }, []);

  // 加载备份列表
  const loadBackups = async () => {
    try {
      setLoading(true);
      const backupList = await getBackupList();
      setBackups(backupList);
    } catch (error) {
      console.error('加载备份列表失败:', error);
      alert('加载备份列表失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  };

  // 创建新备份
  const handleCreateBackup = async () => {
    setBackupName(`手动备份 ${new Date().toLocaleString('zh-CN')}`);
    setBackupDescription('');
    setShowCreateModal(true);
  };

  // 确认创建备份
  const confirmCreateBackup = async () => {
    if (!backupName.trim()) {
      alert('请输入备份名称');
      return;
    }

    try {
      setCreating(true);
      await createBackup(backupName.trim(), backupDescription.trim());
      await loadBackups();
      onBackupCreated?.();
      setShowCreateModal(false);
      alert('备份创建成功！');
    } catch (error) {
      console.error('创建备份失败:', error);
      alert(`创建备份失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setCreating(false);
    }
  };

  // 恢复备份
  const handleRestoreBackup = async (backupId: string) => {
    const backup = backups.find(b => b.id === backupId);
    if (!backup) return;

    const confirmMessage = `⚠️ 重要警告！

确定要恢复备份 "${backup.name}" 吗？

创建时间: ${new Date(backup.created_at).toLocaleString('zh-CN')}
项目记录: ${backup.record_count.projects} 条
人员记录: ${backup.record_count.personnel} 条
配置记录: ${backup.record_count.configs} 条
文件大小: ${formatFileSize(backup.size)}

⚠️ 此操作将：
• 删除当前所有项目数据
• 删除当前所有人员记录
• 无法撤销操作
• 建议先创建当前数据的备份`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setRestoring(backupId);
      await restoreBackup(backupId);
    } catch (error) {
      console.error('恢复备份失败:', error);
      alert(`恢复备份失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setRestoring(null);
    }
  };

  // 删除备份
  const handleDeleteBackup = async (backupId: string) => {
    const backup = backups.find(b => b.id === backupId);
    if (!backup) return;

    if (!window.confirm(`确定要删除备份 "${backup.name}" 吗？此操作无法撤销。`)) return;

    try {
      await deleteBackup(backupId);
      await loadBackups();
      alert('备份删除成功');
    } catch (error) {
      console.error('删除备份失败:', error);
      alert(`删除备份失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 检查自动备份
  const handleCheckAutoBackup = async () => {
    try {
      const created = await checkAutoBackup();
      if (created) {
        await loadBackups();
        alert('自动备份已创建');
      } else {
        alert('暂无需创建自动备份');
      }
    } catch (error) {
      console.error('检查自动备份失败:', error);
      alert('检查自动备份失败');
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const getBackupTypeIcon = (type: string) => {
    return type === 'auto' ? <Clock className="w-4 h-4" /> : <FileText className="w-4 h-4" />;
  };

  const getBackupTypeText = (type: string) => {
    return type === 'auto' ? '自动备份' : '手动备份';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'in_progress': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* 非管理员用户提示 */}
      {!isAdmin ? (
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">数据备份管理</h3>
              <p className="text-sm text-slate-400">备份功能仅管理员可用，请联系管理员操作</p>
            </div>
          </div>
        </div>
      ) : (
      /* 备份控制面板 - 仅管理员显示 */
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">数据备份管理</h3>
              <p className="text-sm text-slate-400">保护您的项目数据安全</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={autoBackupEnabled}
                onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
              />
              自动备份
            </label>
            
            <button
              onClick={handleCheckAutoBackup}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
            >
              <Clock className="w-4 h-4" />
              检查自动备份
            </button>
            
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-all"
            >
              {creating ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {creating ? '创建中...' : '创建备份'}
            </button>
          </div>
        </div>

        {/* 自动备份说明 */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-400 font-medium mb-1">自动备份说明</p>
              <ul className="text-slate-300 space-y-1">
                <li>• 系统每周会自动创建一次数据备份</li>
                <li>• 保留最近4个自动备份和20个手动备份</li>
                <li>• 备份包含所有项目数据、人员记录和配置信息</li>
                <li>• 建议重要操作前手动创建备份</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 备份列表 */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">备份历史</h3>
          <p className="text-sm text-slate-400 mt-1">
            共 {backups.length} 个备份
            {backups.length > 0 && (
              <span className="ml-2">
                (总大小: {formatFileSize(backups.reduce((sum, b) => sum + b.size, 0))})
              </span>
            )}
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400">加载备份列表中...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-2">暂无备份记录</p>
            <p className="text-sm text-slate-500">点击上方按钮创建您的第一个备份</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {backups.map((backup) => (
              <div key={backup.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                      {getBackupTypeIcon(backup.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-medium text-white">{backup.name}</h4>
                        <span className="px-2 py-1 text-xs rounded-full bg-slate-800 text-slate-400">
                          {getBackupTypeText(backup.type)}
                        </span>
                        <span className={`text-xs ${getStatusColor(backup.status)}`}>
                          {backup.status === 'completed' ? '已完成' : 
                           backup.status === 'failed' ? '失败' : '进行中'}
                        </span>
                      </div>
                      
                      {backup.description && (
                        <p className="text-sm text-slate-400 mb-2">{backup.description}</p>
                      )}
                      
                      <div className="flex items-center gap-6 text-xs text-slate-500">
                        <span>创建时间: {new Date(backup.created_at).toLocaleString('zh-CN')}</span>
                        <span>文件大小: {formatFileSize(backup.size)}</span>
                        <span>项目: {backup.record_count.projects} 条</span>
                        <span>人员: {backup.record_count.personnel} 条</span>
                        <span>配置: {backup.record_count.configs} 条</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestoreBackup(backup.id)}
                      disabled={backup.status !== 'completed' || restoring === backup.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-all"
                    >
                      {restoring === backup.id ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {restoring === backup.id ? '恢复中...' : '恢复'}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteBackup(backup.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建备份弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">创建备份</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  备份名称 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2 text-white"
                  placeholder="请输入备份名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  备份描述 (可选)
                </label>
                <textarea
                  value={backupDescription}
                  onChange={(e) => setBackupDescription(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2 text-white resize-none"
                  rows={3}
                  placeholder="添加备份描述..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
              >
                取消
              </button>
              <button
                onClick={confirmCreateBackup}
                disabled={creating || !backupName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-all"
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    创建中...
                  </span>
                ) : (
                  '创建备份'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}