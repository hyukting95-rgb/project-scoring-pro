
import React, { useMemo } from 'react';
import { 
  Database, 
  Trash2,
  Edit3,
  Search,
  CheckCircle,
  Clock,
  UserCheck,
  Star,
  Activity,
  ClipboardList
} from 'lucide-react';
import { ProjectRecord, PersonnelRecord, ProjectStatus } from '../types';

interface Props {
  projectRecords: ProjectRecord[];
  personnelRecords: PersonnelRecord[];
  onDeleteProject: (id: string) => void;
  onEditProject: (id: string) => void;
  onUpdateProjectStatus: (id: string, status: ProjectStatus) => void;
  loading?: boolean;
}

const RecordsDashboard: React.FC<Props> = ({ 
  projectRecords, 
  personnelRecords, 
  onDeleteProject, 
  onEditProject,
  onUpdateProjectStatus,
  loading = false
}) => {
  const [search, setSearch] = React.useState('');

  const filteredProjects = useMemo(() => 
    projectRecords.filter(p => 
      (p.projectUid?.toLowerCase().includes(search.toLowerCase()) || false) || 
      (p.id?.toLowerCase().includes(search.toLowerCase()) || false) || 
      (p.content?.includes(search) || false)
    ),
  [projectRecords, search]);

  const filteredPersonnel = useMemo(() => 
    personnelRecords.filter(r => 
      (r.person?.includes(search) || false) || 
      (r.content?.includes(search) || false)
    ),
  [personnelRecords, search]);

  const summaryData = useMemo(() => {
    const summaryMap: Record<string, { 
      person: string, 
      completedUids: Set<string>, 
      inProgressUids: Set<string>, 
      points: number,
      workDays: number
    }> = {};

    personnelRecords.forEach(r => {
      if (!r.person || !r.projectId) return;
      
      if (!summaryMap[r.person]) {
        summaryMap[r.person] = { person: r.person, completedUids: new Set(), inProgressUids: new Set(), points: 0, workDays: 0 };
      }
      const project = projectRecords.find(p => p.id === r.projectId);
      if (project) {
        if (project.status === '已完成') {
          summaryMap[r.person].completedUids.add(r.projectId);
          summaryMap[r.person].points += r.score || 0;
          summaryMap[r.person].workDays += (r.workDays || 0);
        } else {
          summaryMap[r.person].inProgressUids.add(r.projectId);
        }
      }
    });

    return Object.values(summaryMap).map(s => ({
      ...s,
      completed: s.completedUids.size,
      inProgress: s.inProgressUids.size,
      participated: new Set([...s.completedUids, ...s.inProgressUids]).size
    })).sort((a, b) => b.points - a.points);
  }, [personnelRecords, projectRecords]);

  return (
    <div className="space-y-12">
      {/* 搜索栏 */}
      <div className="flex justify-end">
        <div className="relative group w-full sm:w-80">
          {loading && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
              <div className="flex items-center gap-2 text-indigo-400">
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">加载中...</span>
              </div>
            </div>
          )}
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="glass-input rounded-2xl pl-12 pr-6 py-3 text-sm w-full outline-none" 
            placeholder="搜索人员、内容或项目UID..." 
          />
        </div>
      </div>

      {/* 1. 项目明细库 */}
      <div className="tech-card rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
        <div className="px-8 py-6 bg-slate-900/40 border-b border-white/5 flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white">项目明细库</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/20 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                <th className="px-8 py-5">UID</th>
                <th className="px-6 py-5">项目组成内容</th>
                <th className="px-6 py-5 text-center">预估分值</th>
                <th className="px-6 py-5 text-center">工作天数</th>
                <th className="px-6 py-5">日期</th>
                <th className="px-6 py-5 text-center">项目状态</th>
                <th className="px-6 py-5 text-right px-8">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProjects.map(p => {
                const relatedRecords = personnelRecords.filter(r => r.projectId === p.id);
                const totalDays = relatedRecords.reduce((sum, r) => sum + (r.workDays || 0), 0);
                return (
                <tr key={p.id} className="hover:bg-indigo-500/[0.02] transition-colors group">
                  <td className="px-8 py-6 font-mono text-indigo-400 text-xs font-bold">{p.projectUid || p.id}</td>
                  <td className="px-6 py-6">
                    <p className="text-white text-sm font-bold">{p.type}</p>
                    <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">{p.content}</p>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className="text-white font-mono font-bold px-2 py-1 bg-slate-900 rounded-lg">{p.score.toFixed(1)}</span>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className="text-cyan-400 font-mono font-bold px-2 py-1 bg-cyan-900/20 rounded-lg">{totalDays.toFixed(1)} 天</span>
                  </td>
                  <td className="px-6 py-6 text-slate-500 text-[11px] font-mono">{p.entryTime}</td>
                  <td className="px-6 py-6 text-center">
                    <select 
                      value={p.status}
                      onChange={(e) => onUpdateProjectStatus(p.id, e.target.value as ProjectStatus)}
                      className={`text-[11px] font-black px-3 py-1.5 rounded-xl bg-slate-950 border transition-all cursor-pointer outline-none ${p.status === '已完成' ? 'text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]'}`}
                    >
                      <option value="进行中">进行中</option>
                      <option value="已完成">已完成</option>
                    </select>
                  </td>
                  <td className="px-6 py-6 text-right px-8">
                    <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      {p.status !== '已完成' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEditProject(p.id); }}
                          title="修改项目"
                          className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-lg active:scale-95"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                        title="删除项目"
                        className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
              {filteredProjects.length === 0 && (
                <tr><td colSpan={7} className="py-20 text-center text-slate-600 italic">暂无明细记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. 积分明细表 */}
      <div className="tech-card rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
        <div className="px-8 py-6 bg-slate-900/40 border-b border-white/5 flex items-center gap-3">
          <Star className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-white">积分明细表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/20 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                <th className="px-8 py-5">获得者</th>
                <th className="px-6 py-5">项目UID</th>
                <th className="px-6 py-5">项目内容明细</th>
                <th className="px-6 py-5 text-center">获得分值</th>
                <th className="px-6 py-5 text-center">工作天数</th>
                <th className="px-6 py-5">结算时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPersonnel.map((r) => {
                const project = projectRecords.find(p => p.id === r.projectId);
                const isInProgress = project?.status === '进行中';
                const formattedDate = r.entryTime ? new Date(r.entryTime).toISOString().split('T')[0] : '';
                return (
                  <tr key={r.id} className={`hover:bg-white/[0.02] transition-colors ${isInProgress ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm shadow-inner border border-white/5">
                          {(r.person || '').charAt(0)}
                        </div>
                        <span className="text-white font-bold text-sm">{r.person}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="font-mono text-indigo-400 text-xs font-bold px-2 py-1 bg-indigo-900/20 rounded-lg">{project?.projectUid || r.projectId}</span>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-slate-200 text-xs font-medium">{r.content}</span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      {isInProgress ? (
                        <span className="text-slate-600 text-[10px] italic">等待完成...</span>
                      ) : (
                        <span className="text-emerald-400 font-mono font-black text-sm">+{r.score.toFixed(1)}</span>
                      )}
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="text-cyan-400 font-mono font-bold text-xs px-2 py-1 bg-cyan-900/20 rounded-lg">{r.workDays?.toFixed(1) || '0.0'} 天</span>
                    </td>
                    <td className="px-6 py-6 text-slate-500 text-[11px] font-mono">{formattedDate}</td>
                  </tr>
                );
              })}
              {filteredPersonnel.length === 0 && (
                <tr><td colSpan={6} className="py-20 text-center text-slate-600 italic">暂无明细数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. 人员得分表 */}
      <div className="tech-card rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
        <div className="px-8 py-6 bg-slate-900/40 border-b border-white/5 flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-white">人员得分表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/20 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                <th className="px-8 py-5">人员</th>
                <th className="px-6 py-5 text-center">参与项目总数 (Unique)</th>
                <th className="px-6 py-5 text-center">已完成</th>
                <th className="px-6 py-5 text-center">进行中</th>
                <th className="px-6 py-5 text-center">已完成项目天数</th>
                <th className="px-6 py-5 text-right px-10">总计获得积分 (已结算)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {summaryData.map((s, i) => (
                <tr key={i} className="hover:bg-indigo-500/[0.02] transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm shadow-lg border border-emerald-500/10">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <span className="text-white font-black text-base">{s.person}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center text-slate-300 font-mono font-bold text-sm">{s.participated}</td>
                  <td className="px-6 py-6 text-center">
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-black px-3 py-1.5 bg-emerald-500/5 rounded-full border border-emerald-500/10 text-xs">
                       <CheckCircle className="w-3.5 h-3.5" /> {s.completed}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className="inline-flex items-center gap-1.5 text-amber-400 font-black px-3 py-1.5 bg-amber-500/5 rounded-full border border-amber-500/10 text-xs">
                       <Clock className="w-3.5 h-3.5" /> {s.inProgress}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className="text-cyan-400 font-mono font-bold px-3 py-1.5 bg-cyan-900/20 rounded-lg text-sm">{s.workDays.toFixed(1)} 天</span>
                  </td>
                  <td className="px-6 py-6 text-right px-10">
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-white text-2xl font-black font-mono tracking-tighter shadow-indigo-500/20">{s.points.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-500 font-black uppercase">PTS</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {summaryData.length === 0 && (
                <tr><td colSpan={6} className="py-20 text-center text-slate-600 italic">暂无人员得分汇总</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecordsDashboard;
