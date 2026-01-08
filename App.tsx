
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  LayoutGrid, 
  Package, 
  BookOpen, 
  PlusCircle, 
  BarChart2, 
  ShieldCheck, 
  Monitor, 
  Layout, 
  Users, 
  XCircle, 
  Settings,
  LogOut,
  User
} from 'lucide-react';
import { 
  DesignProjectType, 
  PackageProjectType, 
  ManualProjectType, 
  ProjectRecord, 
  PersonnelRecord, 
  ProjectStatus, 
  ScoringConfig 
} from './types';
import { INITIAL_SCORING_CONFIG } from './constants';
import RecordsDashboard from './components/RecordsDashboard';
import ScorePreview from './components/ScorePreview';
import PersonnelLeaderboard from './components/PersonnelLeaderboard';
import ScoringSettings from './components/ScoringSettings';
import LoginForm from './LoginForm';
import InvitationHandler from './components/InvitationHandler';
import { useAuth } from './AuthContext';
import { UserManagement } from './components/UserManagement';
import { 
  getAllProjects, 
  getAllPersonnel, 
  getAllProjectsForAdmin,
  getAllPersonnelForAdmin,
  getConfig,
  saveConfig,
  putProject, 
  putProjects, 
  putPersonnel, 
  deleteProjectWithPersonnel, 
  replaceProjectAndPersonnel, 
  updateProjectStatus,
  subscribeToProjects,
  subscribeToPersonnel,
  subscribeToConfig
} from './db';

const App: React.FC = () => {
  // Authentication
  const { user, permissions, loading: authLoading, signOut } = useAuth();
  const [showLoginForm, setShowLoginForm] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState<'input' | 'records' | 'settings' | 'admin'>('input');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // Scoring Config State
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>(INITIAL_SCORING_CONFIG);

  // Form States
  const [selectedDesignType, setSelectedDesignType] = useState<DesignProjectType | null>(null);
  const [selectedPackageType, setSelectedPackageType] = useState<PackageProjectType | null>(null);
  const [selectedManualType, setSelectedManualType] = useState<ManualProjectType | null>(null);
  const [cmfValue, setCmfValue] = useState<number>(0.5);
  const [cmfPerson, setCmfPerson] = useState('');
  const [cmfpMode, setCmfpMode] = useState<'additional' | 'none'>('additional');
  const [cmfpPerson1, setCmfpPerson1] = useState('');
  const [cmfpPerson2, setCmfpPerson2] = useState('');
  const [mainCreator, setMainCreator] = useState('');
  const [isIndependent, setIsIndependent] = useState<'yes' | 'no'>('yes');
  const [baseScore, setBaseScore] = useState<number>(1.0);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [addonPersons, setAddonPersons] = useState<Record<string, string>>({});
  const [addonWorkDays, setAddonWorkDays] = useState<Record<string, number>>({});
  const [packagePerson, setPackagePerson] = useState('');
  const [manualPerson, setManualPerson] = useState('');
  const [packagePersons, setPackagePersons] = useState<Record<string, string>>({});
  const [packageWorkDaysMap, setPackageWorkDaysMap] = useState<Record<string, number>>({});
  const [cmfWorkDays, setCmfWorkDays] = useState<number>(1.0);
  const [cmfpWorkDays, setCmfpWorkDays] = useState(1.0);
  const [cmfpSupportWorkDays, setCmfpSupportWorkDays] = useState(1.0);
  const [packageWorkDays, setPackageWorkDays] = useState(1.0);
  const [manualWorkDays, setManualWorkDays] = useState(1.0);
  const [designWorkDays, setDesignWorkDays] = useState(1.0);

  // Storage
  const [projectRecords, setProjectRecords] = useState<ProjectRecord[]>([]);
  const [personnelRecords, setPersonnelRecords] = useState<PersonnelRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  React.useEffect(() => {
    (async () => {
      setDataLoading(true);
      try {
        const dataPromises = permissions?.isAdmin 
          ? [getAllProjectsForAdmin(), getAllPersonnelForAdmin(), getConfig()]
          : [getAllProjects(), getAllPersonnel(), getConfig()];
        
        const [projects, personnel, config] = await Promise.all(dataPromises);
        setProjectRecords(projects.sort((a, b) => b.entryTime.localeCompare(a.entryTime)));
        setPersonnelRecords(personnel.sort((a, b) => b.entryTime.localeCompare(a.entryTime)));
        if (config) {
          setScoringConfig(config);
        }
      } catch (e: any) {
        const errorMsg = e.message || String(e);
        if (errorMsg.includes('请先登录')) {
          console.log('用户未登录，跳过数据加载');
        } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('fetch')) {
          console.warn('无法连接到数据库，请检查网络连接或切换到测试模式');
        } else {
          console.error(e);
        }
      } finally {
        setDataLoading(false);
      }
    })();
  }, [user, permissions]);

  // 实时数据同步
  React.useEffect(() => {
    if (!user) return;

    const isAdmin = permissions?.isAdmin || false;

    const projectsSubscription = subscribeToProjects((payload) => {
      console.log('Project实时更新:', payload);
      const fetchProjects = isAdmin ? getAllProjectsForAdmin() : getAllProjects();
      fetchProjects.then(projects => {
        setProjectRecords(projects.sort((a, b) => b.entryTime.localeCompare(a.entryTime)));
      }).catch(console.error);
    });

    const personnelSubscription = subscribeToPersonnel((payload) => {
      console.log('Personnel实时更新:', payload);
      const fetchPersonnel = isAdmin ? getAllPersonnelForAdmin() : getAllPersonnel();
      fetchPersonnel.then(personnel => {
        setPersonnelRecords(personnel.sort((a, b) => b.entryTime.localeCompare(a.entryTime)));
      }).catch(console.error);
    });

    const configSubscription = subscribeToConfig((payload) => {
      console.log('Config实时更新:', payload);
      getConfig().then(config => {
        if (config) {
          setScoringConfig(config);
        }
      }).catch(console.error);
    });

    return () => {
      projectsSubscription.unsubscribe();
      personnelSubscription.unsubscribe();
      configSubscription.unsubscribe();
    };
  }, [user, permissions]);
  // Reactive Score Calculation
  const { currentScore, scoreDescription, scoringParts } = useMemo(() => {
    let score = 0;
    let desc = [];
    let parts: { label: string; value: number }[] = [];

    if (selectedDesignType) {
      if (selectedDesignType === DesignProjectType.THREE_SERIES_CMF) {
        score += cmfValue;
        const label = scoringConfig.cmf.find(c => c.value === cmfValue)?.label || 'CMF';
        desc.push(`${label}(${cmfValue})`);
        parts.push({ label, value: cmfValue });
      } else if (selectedDesignType === DesignProjectType.THREE_SERIES_CMFP) {
        const total = 1.5; 
        score += total;
        desc.push('CMFP(1.5)');
        parts.push({ label: 'CMFP', value: total });
      } else {
        let pScore = baseScore;
        parts.push({ label: '基础分', value: baseScore });
        selectedAddons.forEach(id => {
          const addon = scoringConfig.addons.find(a => a.id === id);
          if (addon) {
            pScore += addon.score;
            parts.push({ label: addon.label, value: addon.score });
          }
        });
        score += pScore;
        desc.push(`产品创新(${pScore})`);
      }
    }
    if (selectedPackageType) {
      const pScore = scoringConfig.package.find(p => p.type === selectedPackageType)?.score || 0;
      score += pScore;
      desc.push(`包装(${pScore})`);
      parts.push({ label: selectedPackageType, value: pScore });
    }
    if (selectedManualType) {
      const mScore = scoringConfig.manual.find(m => m.type === selectedManualType)?.score || 0;
      score += mScore;
      desc.push(`说明书(${mScore})`);
      parts.push({ label: selectedManualType, value: mScore });
    }
    return { currentScore: score, scoreDescription: desc.join(' + '), scoringParts: parts };
  }, [selectedDesignType, selectedPackageType, selectedManualType, cmfValue, baseScore, selectedAddons, scoringConfig]);

  const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const generateProjectUid = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'P';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  const resetForm = () => {
    setSelectedDesignType(null); setSelectedPackageType(null); setSelectedManualType(null);
    setSelectedAddons([]); setAddonPersons({}); setAddonWorkDays({}); setCmfpPerson1(''); setCmfpPerson2('');
    setCmfPerson(''); setMainCreator(''); setPackagePerson(''); setManualPerson('');
    setCmfpSupportWorkDays(1.0);
    setCmfWorkDays(1.0);
    setEditingProjectId(null);
    // 新增需要重置的状态变量
    setCmfpMode('additional');
    setIsIndependent('yes');
    setBaseScore(1.0);
    setCmfpWorkDays(1.0);
    setPackageWorkDays(1.0);
    setManualWorkDays(1.0);
    setDesignWorkDays(1.0);
    setPackagePersons({});
    setPackageWorkDaysMap({});
  };

  const handleEditInit = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    console.log('handleEditInit 被调用:', { id, id格式: uuidRegex.test(id) ? 'UUID' : '非UUID' });
    
    let targetId: string | null = null;
    
    // 如果传入的是 UUID，直接使用
    if (uuidRegex.test(id)) {
      const project = projectRecords.find(p => p.id === id);
      if (project) {
        targetId = id;
        console.log('handleEditInit: 传入的是有效UUID:', targetId);
      }
    } else {
      // 如果传入的不是 UUID，尝试通过 projectUid 查找
      console.log('handleEditInit: id 不是 UUID，尝试通过 projectUid 查找...');
      const projectByUid = projectRecords.find(p => p.projectUid === id);
      if (projectByUid) {
        console.log('handleEditInit: 找到匹配的项目:', { 
          projectUid: id, 
          项目id: projectByUid.id,
          id格式: uuidRegex.test(projectByUid.id) ? 'UUID' : '非UUID'
        });
        if (uuidRegex.test(projectByUid.id)) {
          targetId = projectByUid.id;
          console.log('handleEditInit: 通过 projectUid 找到对应的 UUID:', { projectUid: id, uuid: targetId });
        } else {
          console.error('handleEditInit: 找到的项目ID不是UUID格式，需要修复数据:', {
            projectUid: id,
            invalidId: projectByUid.id
          });
        }
      } else {
        console.error('handleEditInit: 未找到匹配的项目:', { id, projectUid: id });
      }
    }
    
    if (!targetId) {
      console.error('handleEditInit: 无法确定有效的项目ID:', {
        传入的id: id,
        所有项目: projectRecords.map(p => ({ id: p.id, uid: p.projectUid }))
      });
      return alert(`项目数据异常：无法找到有效的项目记录。\n传入ID: ${id}\n请刷新页面后重试，或联系管理员修复数据。`);
    }
    
    const project = projectRecords.find(p => p.id === targetId);
    if (!project) {
      console.error('handleEditInit: 无法找到项目:', { targetId, 全部项目IDs: projectRecords.map(p => ({ id: p.id, uid: p.projectUid })) });
      return alert('项目不存在，请刷新页面后重试');
    }
    if (project.status === '已完成') return alert('已完成项目不可修改');
    
    // Restore raw selections to form
    const s = project.rawSelections;
    setSelectedDesignType(s.selectedDesignType);
    setSelectedPackageType(s.selectedPackageType);
    setSelectedManualType(s.selectedManualType);
    setCmfValue(s.cmfValue);
    setCmfPerson(s.cmfPerson);
    setCmfpMode(s.cmfpMode);
    setCmfpPerson1(s.cmfpPerson1);
    setCmfpPerson2(s.cmfpPerson2);
    setMainCreator(s.mainCreator);
    setIsIndependent(s.isIndependent);
    setBaseScore(s.baseScore);
    setSelectedAddons(s.selectedAddons);
    setAddonPersons(s.addonPersons);
    setAddonWorkDays(s.addonWorkDays || {});
    setCmfpSupportWorkDays(s.cmfpSupportWorkDays || 1.0);
    setPackagePerson(s.packagePerson);
    setManualPerson(s.manualPerson);

    setEditingProjectId(targetId);
    setActiveTab('input');
    console.log('handleEditInit 完成:', { targetId, status: '开始编辑' });
  };

  const handleDeleteProject = (id: string) => {
    if (!window.confirm(`确认要永久删除项目 ${id} 及其所有关联的人员积分明细吗？此操作不可撤销。`)) return;
    setProjectRecords(prev => prev.filter(p => p.id !== id));
    setPersonnelRecords(prev => prev.filter(r => r.projectId !== id));
    deleteProjectWithPersonnel(id).catch(console.error);
  };

  const handleConfirm = async () => {
    if (!selectedDesignType && !selectedPackageType && !selectedManualType) return alert('请至少选择一个项目组成部分');
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    let finalProjectId: string;
    let finalProjectUid: string;
    
    console.log('handleConfirm - editingProjectId:', editingProjectId);
    console.log('handleConfirm - editingProjectId 是UUID:', uuidRegex.test(editingProjectId || ''));
    
    if (editingProjectId && uuidRegex.test(editingProjectId)) {
      // 编辑模式 - editingProjectId 是有效的 UUID
      finalProjectId = editingProjectId;
      const existingProject = projectRecords.find(p => p.id === editingProjectId);
      finalProjectUid = existingProject?.projectUid || generateProjectUid();
      console.log('handleConfirm - 编辑模式，使用现有UUID:', finalProjectId);
    } else if (editingProjectId) {
      // 编辑模式 - editingProjectId 不是 UUID，尝试通过 projectUid 查找
      const existingProject = projectRecords.find(p => p.projectUid === editingProjectId);
      if (existingProject && uuidRegex.test(existingProject.id)) {
        finalProjectId = existingProject.id;
        finalProjectUid = existingProject.projectUid;
        console.log('handleConfirm - 通过projectUid找到UUID:', { projectUid: editingProjectId, uuid: finalProjectId });
      } else {
        console.error('handleConfirm - 无法找到有效的项目:', { editingProjectId });
        console.log('handleConfirm - 所有项目记录:', projectRecords.map(p => ({ id: p.id, uid: p.projectUid })));
        return alert('项目数据异常，请刷新页面后重试');
      }
    } else {
      // 新建模式
      finalProjectId = generateId();
      finalProjectUid = generateProjectUid();
      console.log('handleConfirm - 新建模式，生成新UUID:', finalProjectId);
    }
    
    // 最终验证
    if (!uuidRegex.test(finalProjectId)) {
      console.error('handleConfirm - 最终验证失败: finalProjectId 不是 UUID:', finalProjectId);
      return alert('系统错误：项目ID格式无效，请刷新页面后重试');
    }
    
    console.log('保存项目 - 输入参数:', { editingProjectId });
    console.log('保存项目 - 生成的值:', { finalProjectId, finalProjectUid });
    console.log('保存项目 - finalProjectId 格式验证:', {
      isUUID: uuidRegex.test(finalProjectId),
      length: finalProjectId?.length
    });
    
    const now = new Date();
    const entryTime = formatDate(now);
    const newPersRecords: PersonnelRecord[] = [];
    let contents: string[] = [];

    if (selectedDesignType) {
      contents.push(selectedDesignType);
      if (selectedDesignType === DesignProjectType.THREE_SERIES_CMF) {
        newPersRecords.push({ id: generateId(), person: cmfPerson || '未命名', projectId: finalProjectId, projectUid: finalProjectUid, entryTime, score: cmfValue, content: selectedDesignType, workDays: cmfWorkDays });
      } else if (selectedDesignType === DesignProjectType.THREE_SERIES_CMFP) {
        const config = scoringConfig.cmfp.find(c => c.mode === cmfpMode);
        if (cmfpMode === 'additional') {
          newPersRecords.push({ id: generateId(), person: cmfpPerson1 || '主责人员', projectId: finalProjectId, projectUid: finalProjectUid, entryTime, score: config?.main || 1.0, content: selectedDesignType, workDays: cmfpWorkDays });
          newPersRecords.push({ id: generateId(), person: cmfpPerson2 || '支持人员', projectId: finalProjectId, projectUid: finalProjectUid, entryTime, score: config?.support || 0.5, content: selectedDesignType + ' (插画制作支持)', workDays: cmfpSupportWorkDays });
        } else {
          newPersRecords.push({ id: generateId(), person: cmfpPerson1 || '主责人员', projectId: finalProjectId, projectUid: finalProjectUid, entryTime, score: config?.main || 1.5, content: selectedDesignType, workDays: cmfpWorkDays });
        }
      } else {
        newPersRecords.push({ id: generateId(), person: mainCreator || '主创', projectId: finalProjectId, projectUid: finalProjectUid, entryTime, score: baseScore, content: selectedDesignType + ' (基础)', workDays: designWorkDays });
        selectedAddons.forEach(id => {
          const addon = scoringConfig.addons.find(a => a.id === id);
          if (addon) {
            const p = isIndependent === 'yes' ? mainCreator : (addonPersons[id] || '协作');
            const days = isIndependent === 'yes' ? designWorkDays : (addonWorkDays[id] || designWorkDays);
            newPersRecords.push({ id: generateId(), person: p, projectId: finalProjectId, projectUid: finalProjectUid, entryTime, score: addon.score, content: selectedDesignType + ' (' + addon.label + ')', workDays: days });
          }
        });
      }
    }

    if (selectedPackageType) {
      contents.push(selectedPackageType);
      const s = scoringConfig.package.find(p => p.type === selectedPackageType)?.score || 0;
      newPersRecords.push({ id: generateId(), person: packagePerson || '未命名', projectId: finalProjectId, projectUid: finalProjectUid, entryTime, score: s, content: selectedPackageType, workDays: packageWorkDays });
    }

    if (selectedManualType) {
      contents.push(selectedManualType);
      const s = scoringConfig.manual.find(m => m.type === selectedManualType)?.score || 0;
      newPersRecords.push({ id: generateId(), person: manualPerson || '未命名', projectId: finalProjectId, projectUid: finalProjectUid, entryTime, score: s, content: selectedManualType, workDays: manualWorkDays });
    }

    const newProject: ProjectRecord = {
      id: finalProjectId,
      projectUid: finalProjectUid,
      type: selectedDesignType || '组合项',
      content: contents.join(' + '),
      entryTime,
      score: currentScore,
      responsiblePerson: mainCreator || cmfPerson || cmfpPerson1 || packagePerson || manualPerson || '多人',
      status: '进行中',
      scoringParts,
      totalWorkDays: newPersRecords.reduce((sum, r) => sum + (r.workDays || 0), 0),
      rawSelections: {
        selectedDesignType,
        selectedPackageType,
        selectedManualType,
        cmfValue,
        cmfPerson,
        cmfpMode,
        cmfpPerson1,
        cmfpPerson2,
        mainCreator,
        isIndependent,
        baseScore,
        selectedAddons,
        addonPersons,
        addonWorkDays,
        cmfpSupportWorkDays,
        packagePerson,
        manualPerson,
      }
    };

    console.log('保存项目 - newProject 对象:', {
      id: newProject.id,
      id格式: uuidRegex.test(newProject.id) ? 'UUID' : '非UUID',
      projectUid: newProject.projectUid,
      length: newProject.id?.length
    });
    console.log('保存项目 - newPersRecords 数量:', newPersRecords.length);
    if (newPersRecords.length > 0) {
      console.log('保存项目 - 第一条人员记录:', {
        projectId: newPersRecords[0].projectId,
        projectId格式: uuidRegex.test(newPersRecords[0].projectId) ? 'UUID' : '非UUID'
      });
    }

    // 最终保护：在调用数据库之前验证所有ID都是有效的UUID
    if (!uuidRegex.test(newProject.id)) {
      console.error('保存项目失败: 项目ID不是有效UUID', {
        id: newProject.id,
        projectUid: newProject.projectUid,
        editingProjectId: editingProjectId,
        finalProjectId: finalProjectId
      });
      alert(`保存失败：项目ID格式无效。\n当前ID: ${newProject.id}\n这不是有效的UUID格式。\n\n解决方案：\n1. 刷新页面\n2. 如果问题持续，请在数据库中运行 fix_project_ids_migration.sql 修复数据`);
      return;
    }
    
    // 验证所有人员记录的projectId也是UUID
    const invalidPersonnel = newPersRecords.filter(p => !uuidRegex.test(p.projectId));
    if (invalidPersonnel.length > 0) {
      console.error('保存项目失败: 部分人员记录的projectId不是有效UUID', {
        invalidCount: invalidPersonnel.length,
        examples: invalidPersonnel.slice(0, 3).map(p => ({ id: p.id, projectId: p.projectId }))
      });
      alert(`保存失败：人员记录项目ID格式无效。\n请刷新页面后重试。`);
      return;
    }

    if (editingProjectId) {
      const targetId = uuidRegex.test(editingProjectId) ? editingProjectId : finalProjectId;
      setProjectRecords(prev => prev.map(p => p.id === targetId ? newProject : p));
      setPersonnelRecords(prev => [...prev.filter(r => r.projectId !== targetId), ...newPersRecords]);
      replaceProjectAndPersonnel(newProject, newPersRecords)
        .then(() => alert('项目更新成功！'))
        .catch((error) => {
          console.error('更新项目失败:', error);
          alert(`更新失败: ${error.message}`);
        });
    } else {
      try {
        // 先保存到数据库
        await putProject(newProject);
        await putPersonnel(newPersRecords);
        
        // 数据库保存成功后，再更新本地状态
        setProjectRecords(prev => {
          const updated = [newProject, ...prev];
          localStorage.setItem('projectRecords', JSON.stringify(updated));
          return updated;
        });
        setPersonnelRecords(prev => {
          const updated = [...newPersRecords, ...prev];
          localStorage.setItem('personnelRecords', JSON.stringify(updated));
          return updated;
        });
        
        alert('录入成功！');
      } catch (error: any) {
        console.error('保存项目失败:', error);
        const errorMsg = error?.message || error?.error?.message || JSON.stringify(error);
        alert(`保存失败: ${errorMsg}`);
      }
    }

    resetForm();
    setActiveTab('records');
    setEditingProjectId(null);
  };

  const handleUpdateScoringConfig = (newConfig: ScoringConfig) => {
    // 1. Update config state
    setScoringConfig(newConfig);
    saveConfig(newConfig).catch(console.error);

    // 2. Pre-calculate project updates to avoid dependency on state update cycle
    const updatedProjectRecords = projectRecords.map(project => {
      let newTotal = 0;
      const updatedParts = project.scoringParts.map(part => {
        let newVal = part.value;
        const cmfMatch = newConfig.cmf.find(c => c.label === part.label);
        if (cmfMatch) newVal = cmfMatch.value;
        const addonMatch = newConfig.addons.find(a => a.label === part.label);
        if (addonMatch) newVal = addonMatch.score;
        const pkgMatch = newConfig.package.find(p => p.type === part.label);
        if (pkgMatch) newVal = pkgMatch.score;
        const manMatch = newConfig.manual.find(m => m.type === part.label);
        if (manMatch) newVal = manMatch.score;
        
        if (part.label === 'CMFP') newVal = 1.5;
        newTotal += newVal;
        return { ...part, value: newVal };
      });
      return { ...project, score: newTotal, scoringParts: updatedParts };
    });

    // 3. Sync personnel records with the calculated project scores
    const updatedPersonnelRecords = personnelRecords.map(record => {
      const project = updatedProjectRecords.find(p => p.id === record.projectId);
      if (!project) return record;

      let newScore = record.score;
      if (record.content.includes(DesignProjectType.THREE_SERIES_CMFP)) {
        const isSupport = record.content.includes('(插画制作支持)');
        if (isSupport) {
          newScore = newConfig.cmfp.find(c => c.mode === 'additional')?.support || 0.5;
        } else {
          const hasSupport = personnelRecords.some(r => r.projectId === record.projectId && r.content.includes('(插画制作支持)'));
          const mode = hasSupport ? 'additional' : 'none';
          const modeConfig = newConfig.cmfp.find(c => c.mode === mode);
          newScore = modeConfig?.main || (hasSupport ? 1.0 : 1.5);
        }
      } else {
        const matchingPart = project.scoringParts.find(p => record.content.includes(p.label));
        if (matchingPart) newScore = matchingPart.value;
      }
      return { ...record, score: newScore };
    });

    // 4. Update states atomically
    setProjectRecords(updatedProjectRecords);
    setPersonnelRecords(updatedPersonnelRecords);
    putProjects(updatedProjectRecords).catch(console.error);
    putPersonnel(updatedPersonnelRecords).catch(console.error);

    // 5. Success feedback
    alert('项目分数修改已完成');
  };

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. 项目记录 Sheet
      const projectsData = projectRecords.map(p => ({
        项目UID: p.projectUid || p.id,
        类型: p.type,
        内容: p.content,
        分值: p.score,
        负责人: p.responsiblePerson,
        录入日期: p.entryTime,
        状态: p.status,
        工作天数: personnelRecords.filter(r => r.projectId === p.id).reduce((sum, r) => sum + (r.workDays || 0), 0)
      }));
      const wsProjects = XLSX.utils.json_to_sheet(projectsData);
      XLSX.utils.book_append_sheet(wb, wsProjects, "项目记录");

      // 2. 人员明细 Sheet
      const personnelData = personnelRecords.map(p => ({
        人员: p.person,
        项目UID: p.projectUid || p.projectId,
        得分: p.score,
        内容: p.content,
        录入日期: p.entryTime,
        工作天数: p.workDays
      }));
      const wsPersonnel = XLSX.utils.json_to_sheet(personnelData);
      XLSX.utils.book_append_sheet(wb, wsPersonnel, "人员明细");

      // 3. 项目明细库 Sheet
      const projectDetailsData = projectRecords.map(p => {
        const relatedRecords = personnelRecords.filter(r => r.projectId === p.id);
        const totalDays = relatedRecords.reduce((sum, r) => sum + (r.workDays || 0), 0);
        const details = relatedRecords.map(r => ({
          项目UID: p.projectUid || p.id,
          项目类型: p.type,
          项目内容: p.content,
          预估分值: p.score,
          责任人: r.person,
          工作天数: r.workDays,
          内容明细: r.content,
          录入日期: p.entryTime,
          状态: p.status
        }));
        return details;
      }).flat();
      const wsProjectDetails = XLSX.utils.json_to_sheet(projectDetailsData);
      XLSX.utils.book_append_sheet(wb, wsProjectDetails, "项目明细库");

      // 4. 积分明细表 Sheet
      const scoreDetailsData = personnelRecords.map(r => {
        const project = projectRecords.find(p => p.id === r.projectId);
        return {
          获得者: r.person,
          项目UID: project?.projectUid || r.projectUid || r.projectId,
          项目内容明细: r.content,
          获得分值: project?.status === '已完成' ? r.score : 0,
          工作天数: r.workDays,
          结算日期: r.entryTime,
          项目状态: project?.status || '未知'
        };
      });
      const wsScoreDetails = XLSX.utils.json_to_sheet(scoreDetailsData);
      XLSX.utils.book_append_sheet(wb, wsScoreDetails, "积分明细表");

      // 5. 人员得分表 Sheet
      const summaryMap: Record<string, { 
        person: string, 
        completedCount: number,
        inProgressCount: number,
        points: number,
        workDays: number
      }> = {};

      personnelRecords.forEach(r => {
        if (!summaryMap[r.person]) {
          summaryMap[r.person] = { person: r.person, completedCount: 0, inProgressCount: 0, points: 0, workDays: 0 };
        }
        const project = projectRecords.find(p => p.id === r.projectId);
        if (project) {
          if (project.status === '已完成') {
            summaryMap[r.person].completedCount += 1;
            summaryMap[r.person].points += r.score;
            summaryMap[r.person].workDays += (r.workDays || 0);
          } else {
            summaryMap[r.person].inProgressCount += 1;
          }
        }
      });

      const personnelScoreData = Object.values(summaryMap).map(s => ({
        人员: s.person,
        参与项目总数: new Set(personnelRecords.filter(r => r.person === s.person).map(r => r.projectId)).size,
        已完成: s.completedCount,
        进行中: s.inProgressCount,
        已完成项目天数: s.workDays,
        总计获得积分: s.points
      })).sort((a, b) => b.points - a.points);

      const wsPersonnelScore = XLSX.utils.json_to_sheet(personnelScoreData);
      XLSX.utils.book_append_sheet(wb, wsPersonnelScore, "人员得分表");

      // Export
      XLSX.writeFile(wb, `项目积分数据_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出Excel失败');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 tech-gradient rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mx-auto">
            <Layout className="w-8 h-8" />
          </div>
          <div className="text-white text-lg font-bold">D-Scoring Pro</div>
          <div className="text-slate-500">正在加载...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 tech-gradient rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mx-auto">
              <Layout className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mt-4">D-Scoring Pro</h1>
            <p className="text-slate-500 mt-2">项目积分管理系统</p>
          </div>
          <LoginForm onClose={() => {}} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <nav className="sticky top-0 z-50 tech-card border-b border-white/5 px-6 py-4 flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 tech-gradient rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
            <Layout className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white hidden sm:inline-block">D-Scoring Pro</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
            <button 
              onClick={() => setActiveTab('input')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'input' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}
            >
              <Monitor className="w-4 h-4" /> {editingProjectId ? '修改录入' : '项目录入'}
            </button>
            <button 
              onClick={() => setActiveTab('records')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'records' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}
            >
              <BarChart2 className="w-4 h-4" /> 数据看板
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}
            >
              <Settings className="w-4 h-4" /> 分数设置
            </button>
            {permissions?.isAdmin && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'admin' ? 'bg-amber-600 text-white shadow-lg' : 'text-amber-500 hover:text-amber-400'}`}
              >
                <ShieldCheck className="w-4 h-4" /> 用户管理
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                permissions?.isAdmin 
                  ? 'bg-amber-500/20' 
                  : permissions?.status === 'pending'
                    ? 'bg-yellow-500/20'
                    : 'bg-indigo-500/20'
              }`}>
                {permissions?.isAdmin ? (
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                ) : permissions?.status === 'pending' ? (
                  <Users className="w-4 h-4 text-yellow-400" />
                ) : (
                  <User className="w-4 h-4 text-indigo-400" />
                )}
              </div>
              <div className="text-white">
                <div className="font-medium">{user.user_metadata?.display_name || user.email?.split('@')[0] || '用户'}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">{user.email}</span>
                  {permissions?.status === 'pending' && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded-full">
                      待审核
                    </span>
                  )}
                  {permissions?.isAdmin && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded-full">
                      管理员
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={signOut}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" /> 登出
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {activeTab === 'input' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="lg:col-span-8 space-y-6">
              
              <section className="tech-card rounded-[2rem] p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{editingProjectId ? `修改项目: ${editingProjectId}` : '设计项目录入'}</h2>
                  </div>
                  {editingProjectId && (
                    <button onClick={resetForm} className="text-slate-500 hover:text-white flex items-center gap-1 text-xs">
                      <XCircle className="w-4 h-4" /> 取消修改
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                  {Object.values(DesignProjectType).map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedDesignType(selectedDesignType === type ? null : type)}
                      className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all ${selectedDesignType === type ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {selectedDesignType && (
                  <div className="bg-slate-900/30 rounded-2xl p-6 border border-slate-800/50 space-y-6">
                    {selectedDesignType === DesignProjectType.THREE_SERIES_CMF && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                           <label className="text-xs font-bold text-slate-500 uppercase">选择视觉指导</label>
                           <div className="flex flex-col gap-2">
                             {scoringConfig.cmf.map(o => (
                               <button key={o.value} onClick={() => setCmfValue(o.value)} className={`p-3 text-left rounded-xl border text-sm transition-all ${cmfValue === o.value ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                                  {o.label} (+{o.value})
                               </button>
                             ))}
                           </div>
                        </div>
                        <div className="space-y-4">
                           <div className="space-y-3">
                              <label className="text-xs font-bold text-slate-500 uppercase">负责人员</label>
                              <input 
                                value={cmfPerson} 
                                onChange={e => setCmfPerson(e.target.value)} 
                                className="w-full glass-input rounded-xl px-4 py-3 text-white" 
                                placeholder="请输入负责人员" 
                              />
                           </div>
                           <div className="space-y-3 relative">
                              <label className="text-xs font-bold text-slate-500 uppercase">工作天数</label>
                              <input 
                               type="number" 
                               step="0.5" 
                               min="0"
                               value={cmfWorkDays} 
                               onChange={e => {
                                 const val = parseFloat(e.target.value);
                                 if (!isNaN(val) && val >= 0) {
                                   setCmfWorkDays(Math.max(0, Math.round(val * 2) / 2));
                                 }
                               }}
                               className="w-full glass-input rounded-xl px-4 py-3 text-white pr-12" 
                               placeholder="请输入工作天数" 
                             />
                             <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">天</span>
                           </div>
                        </div>
                      </div>
                    )}

                    {selectedDesignType === DesignProjectType.THREE_SERIES_CMFP && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                           <label className="text-xs font-bold text-slate-500 uppercase">选择项</label>
                           <div className="flex flex-col gap-2">
                             <button 
                               onClick={() => setCmfpMode('additional')} 
                               className={`p-4 text-left rounded-xl border text-sm transition-all ${cmfpMode === 'additional' ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                             >
                               有额外轻量化插画制作支持
                             </button>
                             <button 
                               onClick={() => setCmfpMode('none')} 
                               className={`p-4 text-left rounded-xl border text-sm transition-all ${cmfpMode === 'none' ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                             >
                               无额外轻量化插画制作支持
                             </button>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <div className="space-y-3">
                              <label className="text-xs font-bold text-slate-500 uppercase">
                                主负责人 ({cmfpMode === 'additional' ? `+${scoringConfig.cmfp[0].main}` : `+${scoringConfig.cmfp[1].main}`})
                              </label>
                              <input 
                                value={cmfpPerson1} 
                                onChange={e => setCmfpPerson1(e.target.value)} 
                                className="w-full glass-input rounded-xl px-4 py-3 text-white" 
                                placeholder="请输入主负责人" 
                              />
                           </div>
                           <div className="space-y-3">
                              <label className="text-xs font-bold text-slate-500 uppercase">工作天数</label>
                              <div className="relative">
                                <input 
                                  type="number" 
                                  step="0.5" 
                                  min="0.5"
                                  value={cmfpWorkDays} 
                                  onChange={e => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && val >= 0.5) {
                                      setCmfpWorkDays(Math.round(val * 2) / 2);
                                    }
                                  }}
                                  className="w-full glass-input rounded-xl px-4 py-3 text-white pr-12" 
                                  placeholder="请输入工作天数" 
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">天</span>
                              </div>
                           </div>
                           {cmfpMode === 'additional' && (
                             <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-xs font-bold text-slate-500 uppercase">
                                  支持负责人 (插画制作) (+{scoringConfig.cmfp[0].support})
                                </label>
                                <input 
                                  value={cmfpPerson2} 
                                  onChange={e => setCmfpPerson2(e.target.value)} 
                                  className="w-full glass-input rounded-xl px-4 py-3 text-white border-indigo-500/30" 
                                  placeholder="请输入支持人员" 
                                />
                                <div className="relative">
                                  <input 
                                    type="number" 
                                    step="0.5" 
                                    min="0.5"
                                    value={cmfpSupportWorkDays} 
                                    onChange={e => {
                                      const val = parseFloat(e.target.value);
                                      if (!isNaN(val) && val >= 0.5) {
                                        setCmfpSupportWorkDays(Math.round(val * 2) / 2);
                                      }
                                    }}
                                    className="w-full glass-input rounded-xl px-4 py-3 text-white pr-12" 
                                    placeholder="请输入工作天数" 
                                  />
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">天</span>
                                </div>
                             </div>
                           )}
                        </div>
                      </div>
                    )}

                    {(selectedDesignType === DesignProjectType.FOUR_SERIES_INNOVATION || selectedDesignType === DesignProjectType.FIVE_SERIES_INNOVATION) && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">主创人员</label>
                            <input value={mainCreator} onChange={e => setMainCreator(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2 text-white" placeholder="姓名" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">基础分</label>
                            <div className="flex gap-2">
                               {(selectedDesignType === DesignProjectType.FOUR_SERIES_INNOVATION ? scoringConfig.base4 : scoringConfig.base5).map(b => (
                                 <button key={b.value} onClick={() => setBaseScore(b.value)} className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${baseScore === b.value ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                                   {b.label}
                                 </button>
                               ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">独立完成</label>
                            <div className="flex gap-2">
                               <button onClick={() => setIsIndependent('yes')} className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${isIndependent === 'yes' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>是</button>
                               <button onClick={() => setIsIndependent('no')} className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${isIndependent === 'no' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>否</button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">工作天数</label>
                            <div className="relative">
                              <input 
                                type="number" 
                                step="0.5" 
                                min="0.5"
                                value={designWorkDays} 
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val >= 0.5) {
                                    setDesignWorkDays(Math.round(val * 2) / 2);
                                  }
                                }}
                                className="w-full glass-input rounded-xl px-4 py-2 text-white pr-10" 
                                placeholder="天数" 
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">天</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">额外加分项</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {scoringConfig.addons.map(a => (
                              <div key={a.id} className="space-y-2">
                                <button 
                                  onClick={() => setSelectedAddons(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])}
                                  className={`w-full p-3 text-left rounded-xl border text-[11px] font-bold transition-all ${selectedAddons.includes(a.id) ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}
                                >
                                  {a.label} (+{a.score})
                                </button>
                                {selectedAddons.includes(a.id) && isIndependent === 'no' && (
                                  <>
                                    <input 
                                      className="w-full glass-input rounded-lg px-2 py-1.5 text-xs text-white border-indigo-500/30 animate-in fade-in zoom-in-95"
                                      placeholder="输入人员姓名"
                                      value={addonPersons[a.id] || ''}
                                      onChange={(e) => setAddonPersons({...addonPersons, [a.id]: e.target.value})}
                                    />
                                    <div className="relative">
                                      <input 
                                        type="number"
                                        step="0.5"
                                        min="0.5"
                                        className="w-full glass-input rounded-lg px-2 py-1.5 text-xs text-white border-indigo-500/30 animate-in fade-in zoom-in-95 pr-8"
                                        placeholder="天数"
                                        value={addonWorkDays[a.id] || ''}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          if (!isNaN(val) && val >= 0.5) {
                                            setAddonWorkDays({...addonWorkDays, [a.id]: Math.round(val * 2) / 2});
                                          }
                                        }}
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">天</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="tech-card rounded-[2rem] p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Package className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg font-bold text-white">包装项目</h2>
                  </div>
                  <div className="space-y-3">
                    {scoringConfig.package.map(t => {
                      const isSelected = selectedPackageType === t.type;
                      return (
                        <button 
                          key={t.type}
                          onClick={() => setSelectedPackageType(isSelected ? null : t.type)}
                          className={`w-full p-4 rounded-xl border transition-all text-left ${isSelected ? 'bg-cyan-600/20 border-cyan-500' : 'bg-slate-900/40 border-slate-800'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-bold ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`}>{t.type} (+{t.score})</span>
                            <span className={`text-xs px-2 py-1 rounded ${isSelected ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-600'}`}>
                              {isSelected ? '已选择' : '未选择'}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div>
                                <label className="text-[10px] text-slate-500 mb-1 block">负责人</label>
                                <input 
                                  value={packagePersons[t.type] || ''} 
                                  onChange={e => setPackagePersons({...packagePersons, [t.type]: e.target.value})}
                                  onClick={e => e.stopPropagation()}
                                  className="w-full glass-input rounded-lg px-3 py-2 text-xs text-white" 
                                  placeholder="请输入负责人" 
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-500 mb-1 block">工作天数</label>
                                <div className="relative">
                                  <input 
                                    type="number" 
                                    step="0.5" 
                                    min="0"
                                    value={packageWorkDaysMap[t.type] || 0} 
                                    onChange={e => {
                                      const val = parseFloat(e.target.value);
                                      if (!isNaN(val) && val >= 0) {
                                        setPackageWorkDaysMap({...packageWorkDaysMap, [t.type]: Math.max(0, Math.round(val * 2) / 2)});
                                      }
                                    }}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full glass-input rounded-lg px-3 py-2 text-xs text-white pr-8" 
                                    placeholder="天数" 
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">天</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="tech-card rounded-[2rem] p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <BookOpen className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-lg font-bold text-white">说明书项目</h2>
                  </div>
                  <div className="space-y-2">
                     {scoringConfig.manual.map(t => (
                        <button key={t.type} onClick={() => setSelectedManualType(selectedManualType === t.type ? null : t.type)} className={`p-3 text-left rounded-xl border text-xs font-bold transition-all w-full ${selectedManualType === t.type ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{t.type} (+{t.score})</button>
                     ))}
                  </div>
                  {selectedManualType && (
                    <>
                      <input value={manualPerson} onChange={e => setManualPerson(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2 mt-4 text-xs text-white" placeholder="请输入说明书负责人" />
                      <div className="relative mt-3">
                        <input 
                          type="number" 
                          step="0.5" 
                          min="0.5"
                          value={manualWorkDays} 
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0.5) {
                              setManualWorkDays(Math.round(val * 2) / 2);
                            }
                          }}
                          className="w-full glass-input rounded-xl px-4 py-2 text-xs text-white pr-10" 
                          placeholder="请输入工作天数" 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">天</span>
                      </div>
                    </>
                  )}
                </section>
              </div>

              <ScorePreview score={currentScore} description={scoreDescription} />
            </div>

            <div className="lg:col-span-4 space-y-6 sticky top-28">
               <section className="tech-card rounded-[2rem] p-8 bg-indigo-600/5 border-indigo-500/20">
                  <div className="flex items-center gap-3 mb-6">
                    <ShieldCheck className="w-6 h-6 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">录入检查</h2>
                  </div>
                  <div className="space-y-4 mb-8">
                     <div className="flex justify-between p-3 bg-slate-900/40 rounded-xl">
                        <span className="text-slate-500 text-xs font-bold">已选组成部分</span>
                        <span className="text-white font-mono text-xs">{(selectedDesignType?1:0)+(selectedPackageType?1:0)+(selectedManualType?1:0)} 项</span>
                     </div>
                     <div className="flex justify-between p-3 bg-slate-900/40 rounded-xl">
                        <span className="text-slate-500 text-xs font-bold">最终计分</span>
                        <span className="text-indigo-400 font-mono text-lg font-bold">{currentScore.toFixed(2)} pts</span>
                     </div>
                  </div>
                  <button 
                    onClick={handleConfirm}
                    disabled={currentScore === 0}
                    className="w-full py-4 rounded-2xl tech-gradient text-white font-bold text-lg shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-5 h-5" /> {editingProjectId ? '确认修改并保存' : '确认存入库'}
                  </button>
               </section>
            </div>
          </div>
        ) : activeTab === 'records' ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <Monitor className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white">数据明细档案</h2>
              </div>
              <RecordsDashboard 
                projectRecords={projectRecords} 
                personnelRecords={personnelRecords} 
                onDeleteProject={handleDeleteProject}
                onEditProject={handleEditInit}
                onUpdateProjectStatus={(id, status) => {
                  setProjectRecords(prev => prev.map(p => p.id === id ? { ...p, status } : p));
                  updateProjectStatus(id, status).catch(console.error);
                }}
                loading={dataLoading}
              />
            </section>

            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white">积分表现可视化</h2>
              </div>
              <PersonnelLeaderboard 
                records={personnelRecords} 
                projectRecords={projectRecords} 
              />
            </section>
          </div>
        ) : activeTab === 'admin' ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <UserManagement />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
            <ScoringSettings 
              config={scoringConfig} 
              onSave={handleUpdateScoringConfig} 
              onExportExcel={handleExportExcel}
            />
          </div>
        )}
      </div>
      
      {/* 邀请处理组件 */}
      <InvitationHandler onInvitationProcessed={() => {
        console.log('邀请处理完成，重新加载页面');
      }} />
    </div>
  );
};

export default App;
