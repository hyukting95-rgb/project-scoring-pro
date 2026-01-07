
import React from 'react';
import { BarChart, Trophy, TrendingUp } from 'lucide-react';
import { PersonnelRecord, ProjectRecord } from '../types';

interface PersonnelLeaderboardProps {
  records: PersonnelRecord[];
  projectRecords: ProjectRecord[];
}

const PersonnelLeaderboard: React.FC<PersonnelLeaderboardProps> = ({ records, projectRecords }) => {
  const staffSummary = React.useMemo(() => {
    const summary: Record<string, { total: number; count: number; lastActive: string }> = {};
    
    // Only calculate scores for projects that are "已完成"
    records.forEach(r => {
      const project = projectRecords.find(p => p.id === r.projectId);
      if (project && project.status === '已完成') {
        if (!summary[r.person]) {
          summary[r.person] = { total: 0, count: 0, lastActive: r.entryTime };
        }
        summary[r.person].total += r.score;
        summary[r.person].count += 1;
        if (new Date(r.entryTime) > new Date(summary[r.person].lastActive)) {
          summary[r.person].lastActive = r.entryTime;
        }
      }
    });
    return Object.entries(summary).sort((a, b) => b[1].total - a[1].total);
  }, [records, projectRecords]);

  if (staffSummary.length === 0) {
    return (
      <div className="p-20 text-center tech-card rounded-[2rem] border-dashed border-2 border-slate-800">
        <BarChart className="w-12 h-12 mx-auto mb-4 text-slate-700" />
        <p className="text-slate-500">暂无已完成项目的积分数据</p>
      </div>
    );
  }

  const maxScore = Math.max(...staffSummary.map(([, data]) => data.total), 1);

  return (
    <div className="tech-card rounded-[2rem] p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          全员积分贡献榜单 (仅计已完成项目)
        </h3>
        <span className="text-xs text-slate-500 font-mono">共 {staffSummary.length} 位成员获得积分</span>
      </div>

      <div className="space-y-6">
        {staffSummary.map(([name, data], idx) => (
          <div key={name} className="space-y-2 group">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-black w-5 ${idx < 3 ? 'text-indigo-400' : 'text-slate-600'}`}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-sm font-bold text-slate-200">{name}</span>
                <span className="text-[10px] text-slate-500 px-2 py-0.5 bg-slate-900 rounded-full border border-white/5">
                   已完成 {data.count} 项
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-sm font-black font-mono text-white">{data.total.toFixed(1)}</span>
                <span className="text-[10px] text-slate-600 font-bold">PTS</span>
              </div>
            </div>
            
            <div className="h-3 bg-slate-900/50 rounded-full overflow-hidden border border-white/5 p-[1px]">
              <div 
                className="h-full rounded-full tech-gradient transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                style={{ width: `${(data.total / maxScore) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonnelLeaderboard;
