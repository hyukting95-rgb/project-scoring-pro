
import React from 'react';
import { Zap, Activity } from 'lucide-react';

interface ScorePreviewProps {
  score: number;
  description: string;
}

const ScorePreview: React.FC<ScorePreviewProps> = ({ score, description }) => {
  return (
    <div className="tech-card rounded-2xl p-6 border-l-4 border-indigo-500 overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
        <Activity className="w-16 h-16 text-indigo-400" />
      </div>
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
            <Zap className="w-3 h-3 text-amber-400" />
            实时计算分值预估
          </p>
          <p className="text-sm text-slate-300 font-medium truncate max-w-[300px]">{description || '等待选择项目组成...'}</p>
        </div>
        <div className="text-right">
          <span className="text-4xl font-bold font-mono text-white bg-clip-text">
            {score.toFixed(2)}
          </span>
          <span className="text-xs text-slate-500 ml-1 font-bold">PTS</span>
        </div>
      </div>
    </div>
  );
};

export default ScorePreview;
