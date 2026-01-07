import { supabase, checkUserPermissions } from './db';

// 备份数据类型定义
export interface BackupMetadata {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
  size: number;
  type: 'auto' | 'manual';
  status: 'completed' | 'failed' | 'in_progress';
  record_count: {
    projects: number;
    personnel: number;
    configs: number;
  };
}

export interface BackupData {
  projects: any[];
  personnel_records: any[];
  scoring_configs: any[];
  metadata: {
    backup_time: string;
    total_records: number;
    user_count: number;
  };
}

// 备份配置
const BACKUP_CONFIG = {
  auto_backup_enabled: true,
  auto_backup_interval_days: 7, // 每周自动备份
  max_auto_backups: 4, // 保留4个自动备份
  max_manual_backups: 20, // 保留20个手动备份
};

// 创建数据备份（仅管理员可用）
export async function createBackup(name: string, description: string = ''): Promise<BackupMetadata> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  // 检查是否是管理员
  const permissions = await checkUserPermissions();
  if (!permissions.isAdmin) {
    throw new Error('只有管理员可以创建备份');
  }

  console.log('开始创建数据备份...');

  try {
    // 1. 使用 RPC 函数获取所有数据（绕过 RLS）
    const [projectsResult, personnelResult, configResult] = await Promise.all([
      supabase.rpc('get_all_projects_for_backup'),
      supabase.rpc('get_all_personnel_for_backup'),
      supabase.rpc('get_all_configs_for_backup')
    ]);

    console.log('查询结果:', {
      projects: { count: projectsResult.data?.length || 0, error: projectsResult.error },
      personnel: { count: personnelResult.data?.length || 0, error: personnelResult.error },
      configs: { count: configResult.data?.length || 0, error: configResult.error }
    });

    if (projectsResult.error) throw projectsResult.error;
    if (personnelResult.error) throw personnelResult.error;
    if (configResult.error) throw configResult.error;

    const projects = projectsResult.data || [];
    const personnel = personnelResult.data || [];
    const configs = configResult.data || [];

    console.log('获取到的数据:', {
      projectsCount: projects.length,
      personnelCount: personnel.length,
      configsCount: configs.length
    });

    // 2. 准备备份数据
    const backupData: BackupData = {
      projects,
      personnel_records: personnel,
      scoring_configs: configs,
      metadata: {
        backup_time: new Date().toISOString(),
        total_records: projects.length + personnel.length,
        user_count: new Set([...projects, ...personnel].map(item => item.user_id)).size
      }
    };

    // 3. 计算数据大小（JSON字符串长度）
    const dataSize = new Blob([JSON.stringify(backupData)]).size;

    // 4. 将备份数据存储到Supabase Storage
    // 使用 UUID 格式的备份 ID
    const backupId = crypto.randomUUID();
    const { data: storageData, error: storageError } = await supabase.storage
      .from('backups')
      .upload(`${backupId}.json`, JSON.stringify(backupData), {
        contentType: 'application/json',
        upsert: false
      });

    if (storageError) throw storageError;

    // 5. 记录备份元数据到数据库
    const { data: backupMetadata, error: metadataError } = await supabase
      .from('backup_metadata')
      .insert({
        id: backupId,
        name: name || `备份 ${new Date().toLocaleString('zh-CN')}`,
        description,
        created_at: new Date().toISOString(),
        created_by: user.id,
        size: dataSize,
        type: 'manual',
        status: 'completed',
        record_count: {
          projects: backupData.projects.length,
          personnel: backupData.personnel_records.length,
          configs: backupData.scoring_configs.length
        },
        storage_path: storageData.path
      })
      .select()
      .single();

    if (metadataError) throw metadataError;

    console.log('备份创建成功:', backupMetadata);
    
    // 清理旧备份
    await cleanupOldBackups();

    return backupMetadata;
  } catch (error) {
    console.error('备份创建失败:', error);
    throw new Error(`备份创建失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 获取所有备份列表
export async function getBackupList(): Promise<BackupMetadata[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  // 先获取所有记录，然后在代码层面过滤无效的 created_by
  const { data, error } = await supabase
    .from('backup_metadata')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // 过滤出当前用户的有效备份（created_by 必须是有效的 UUID）
  const validBackups = (data || []).filter(backup => {
    // 必须是当前用户创建的备份
    if (backup.created_by !== user.id) return false;
    // created_by 必须是有效的非空值
    if (!backup.created_by) return false;
    // 必须是有效的 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(backup.created_by);
  });
  
  return validBackups;
}

// 下载并恢复备份数据（仅管理员可用）
export async function restoreBackup(backupId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  // 检查是否是管理员
  const permissions = await checkUserPermissions();
  if (!permissions.isAdmin) {
    throw new Error('只有管理员可以恢复备份');
  }

  console.log('开始恢复备份数据...');

  try {
    // 先获取所有备份，然后在代码层面找到目标备份
    const allBackups = await getBackupList();
    const metadata = allBackups.find(b => b.id === backupId);
    
    if (!metadata) throw new Error('备份不存在或无权访问');

    // 2. 从Storage下载备份数据
    const { data: backupData, error: downloadError } = await supabase.storage
      .from('backups')
      .download(metadata.storage_path);

    if (downloadError) throw downloadError;

    const backupContent = await backupData.text();
    const data: BackupData = JSON.parse(backupContent);

    // 3. 确认恢复操作
    const confirmMessage = `确定要恢复备份数据吗？
    
备份名称: ${metadata.name}
创建时间: ${new Date(metadata.created_at).toLocaleString('zh-CN')}
项目记录: ${metadata.record_count.projects} 条
人员记录: ${metadata.record_count.personnel} 条
配置记录: ${metadata.record_count.configs} 条

⚠️ 此操作将覆盖当前所有数据，且无法撤销！`;

    if (!window.confirm(confirmMessage)) {
      throw new Error('用户取消了恢复操作');
    }

    // 4. 清空当前数据（使用 not + is null 避免 UUID 类型比较问题）
    const { error: deleteProjectsError } = await supabase
      .from('projects')
      .delete()
      .not('id', 'is', null);

    const { error: deletePersonnelError } = await supabase
      .from('personnel_records')
      .delete()
      .not('id', 'is', null);

    if (deleteProjectsError) throw deleteProjectsError;
    if (deletePersonnelError) throw deletePersonnelError;

    // 5. 恢复项目数据
    if (data.projects.length > 0) {
      const { error: restoreProjectsError } = await supabase
        .from('projects')
        .insert(data.projects);

      if (restoreProjectsError) throw restoreProjectsError;
    }

    // 6. 恢复人员记录数据
    if (data.personnel_records.length > 0) {
      const { error: restorePersonnelError } = await supabase
        .from('personnel_records')
        .insert(data.personnel_records);

      if (restorePersonnelError) throw restorePersonnelError;
    }

    console.log('备份数据恢复成功');
    alert('备份数据恢复成功！页面将刷新以显示最新数据。');
    
    // 7. 刷新页面以重新加载数据
    window.location.reload();
  } catch (error) {
    console.error('备份恢复失败:', error);
    throw new Error(`备份恢复失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 清理旧备份
async function cleanupOldBackups(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    // 获取用户的备份列表
    const backups = await getBackupList();
    
    // 分离自动备份和手动备份
    const autoBackups = backups.filter(b => b.type === 'auto');
    const manualBackups = backups.filter(b => b.type === 'manual');

    // 删除超出限制的自动备份
    if (autoBackups.length > BACKUP_CONFIG.max_auto_backups) {
      const toDelete = autoBackups
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(0, autoBackups.length - BACKUP_CONFIG.max_auto_backups);

      for (const backup of toDelete) {
        await deleteBackup(backup.id);
      }
    }

    // 删除超出限制的手动备份
    if (manualBackups.length > BACKUP_CONFIG.max_manual_backups) {
      const toDelete = manualBackups
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(0, manualBackups.length - BACKUP_CONFIG.max_manual_backups);

      for (const backup of toDelete) {
        await deleteBackup(backup.id);
      }
    }
  } catch (error) {
    console.error('清理旧备份失败:', error);
  }
}

// 删除备份（仅管理员可用）
export async function deleteBackup(backupId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('用户未登录');

  // 检查是否是管理员
  const permissions = await checkUserPermissions();
  if (!permissions.isAdmin) {
    throw new Error('只有管理员可以删除备份');
  }

  try {
    // 使用 getBackupList 获取有效备份列表
    const allBackups = await getBackupList();
    const metadata = allBackups.find(b => b.id === backupId);
    
    if (!metadata) throw new Error('备份不存在或无权访问');

    // 从Storage删除备份文件
    const { error: storageError } = await supabase.storage
      .from('backups')
      .remove([metadata.storage_path]);

    if (storageError) throw storageError;

    // 从数据库删除元数据
    const { error: deleteError } = await supabase
      .from('backup_metadata')
      .delete()
      .eq('id', backupId);

    if (deleteError) throw deleteError;

    console.log('备份删除成功:', backupId);
  } catch (error) {
    console.error('删除备份失败:', error);
    throw new Error(`删除备份失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 创建自动备份
export async function createAutoBackup(): Promise<void> {
  try {
    const backupName = `自动备份 ${new Date().toLocaleDateString('zh-CN')}`;
    await createBackup(backupName, '系统自动备份');
    console.log('自动备份创建成功');
  } catch (error) {
    console.error('自动备份创建失败:', error);
  }
}

// 检查是否需要创建自动备份（仅管理员可用）
export async function checkAutoBackup(): Promise<boolean> {
  if (!BACKUP_CONFIG.auto_backup_enabled) return false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // 检查是否是管理员
    const permissions = await checkUserPermissions();
    if (!permissions.isAdmin) return false;

    // 使用 getBackupList 获取有效备份列表，然后筛选自动备份
    const allBackups = await getBackupList();
    const autoBackups = allBackups.filter(b => b.type === 'auto');
    
    // 按时间排序，获取最近的自动备份
    const recentAutoBackup = autoBackups
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!recentAutoBackup) {
      await createAutoBackup();
      return true;
    }

    const lastBackupTime = new Date(recentAutoBackup.created_at);
    const now = new Date();
    const daysDiff = (now.getTime() - lastBackupTime.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff >= BACKUP_CONFIG.auto_backup_interval_days) {
      await createAutoBackup();
      return true;
    }

    return false;
  } catch (error) {
    console.error('检查自动备份失败:', error);
    return false;
  }
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}