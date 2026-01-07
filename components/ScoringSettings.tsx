import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, RefreshCw, Database, User, Eye, EyeOff } from 'lucide-react';
import { ScoringConfig } from '../types';
import BackupManager from './BackupManager';
import { useAuth } from '../AuthContext';

interface Props {
  config: ScoringConfig;
  onSave: (config: ScoringConfig) => void;
  onExportExcel: () => void;
}

const ScoringSettings: React.FC<Props> = ({ config, onSave, onExportExcel }) => {
  const { permissions } = useAuth();
  const [localConfig, setLocalConfig] = useState<ScoringConfig>(JSON.parse(JSON.stringify(config)));
  const [activeTab, setActiveTab] = useState<'scoring' | 'backup'>('scoring');

  useEffect(() => {
    setLocalConfig(JSON.parse(JSON.stringify(config)));
  }, [config]);

  const handleUpdateItem = (category: keyof ScoringConfig, index: number, field: string, value: any) => {
    const updated = { ...localConfig };
    
    // 验证：最多1位小数
    const validatedValue = parseFloat(value.toString());
    if (!isNaN(validatedValue)) {
      const roundedValue = Math.round(validatedValue * 10) / 10;
      (updated[category] as any)[index][field] = roundedValue;
      setLocalConfig(updated);
    }
  };

  const isAdmin = permissions?.isAdmin && permissions?.status === 'active';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">分数设置</h2>
            <p className="text-slate-500 text-sm">修改各子项分值，修改后将同步影响录入计算及存量记录</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!isAdmin && (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl text-slate-400 text-sm">
              <Eye className="w-4 h-4" /> 您只能查看配置，如需修改请联系管理员
            </div>
          )}
          
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
            <button 
              onClick={() => setActiveTab('scoring')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'scoring' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}
            >
              <RefreshCw className="w-4 h-4" /> 分数设置
            </button>
            <button 
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'backup' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}
            >
              <Database className="w-4 h-4" /> 数据备份
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'scoring' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">项目分数全局设置</h3>
                <p className="text-slate-500 text-sm">修改各子项分值，修改后将同步影响录入计算及存量记录</p>
              </div>
            </div>
            {isAdmin && (
              <button 
                onClick={() => onSave(localConfig)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" /> 确认并同步全局
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* 3系项目-CMF */}
            <section className="tech-card rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <RefreshCw className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">3 系项目-CMF</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-500 uppercase">CMF 视觉指导</h4>
                  {localConfig.cmf.map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <span className="text-sm text-slate-300 w-2/3">{item.label}</span>
                      <input 
                        type="number" 
                        step="0.1" 
                        className="glass-input rounded-xl px-4 py-2 text-white w-1/3" 
                        value={item.value} 
                        disabled={!isAdmin}
                        onChange={e => handleUpdateItem('cmf', i, 'value', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 3系项目-CMFP */}
            <section className="tech-card rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <RefreshCw className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">3 系项目-CMFP</h3>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase">CMFP 人员占比</h4>
                {localConfig.cmfp.map((item, i) => (
                  <div key={i} className="space-y-2 p-4 bg-slate-900/40 rounded-2xl border border-white/5">
                    <p className="text-xs font-bold text-indigo-400 mb-2">
                      {item.mode === 'additional' ? '有额外轻量化插画制作支持' : '无额外轻量化插画制作支持'}
                    </p>
                    <div className="flex gap-4">
                      <div className="w-1/2">
                        <label className="text-[10px] text-slate-600 mb-1 block">主创分值</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          className="glass-input rounded-xl px-4 py-2 text-white w-full" 
                          value={item.main} 
                          disabled={!isAdmin}
                          onChange={e => handleUpdateItem('cmfp', i, 'main', parseFloat(e.target.value) || 0)} 
                        />
                      </div>
                      {item.mode === 'additional' && (
                        <div className="w-1/2">
                          <label className="text-[10px] text-slate-600 mb-1 block">支持分值（插画制作）</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            className="glass-input rounded-xl px-4 py-2 text-white w-full" 
                            value={item.support} 
                            disabled={!isAdmin}
                            onChange={e => handleUpdateItem('cmfp', i, 'support', parseFloat(e.target.value) || 0)} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 4系项目 */}
            <section className="tech-card rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <RefreshCw className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">4 系项目-创新性项目</h3>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase">创新项目基础分档位</h4>
                {localConfig.base4.map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500">档位 {i+1} {b.label}</span>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="glass-input rounded-xl px-3 py-2 text-white flex-1" 
                      value={b.value} 
                      disabled={!isAdmin}
                      onChange={e => handleUpdateItem('base4', i, 'value', parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 5系项目 */}
            <section className="tech-card rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <RefreshCw className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">5 系项目-开模创新性项目</h3>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase">开模创新基础分档位</h4>
                {localConfig.base5.map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500">档位 {i+1} {b.label}</span>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="glass-input rounded-xl px-3 py-2 text-white flex-1" 
                      value={b.value} 
                      disabled={!isAdmin}
                      onChange={e => handleUpdateItem('base5', i, 'value', parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 包装项目 */}
            <section className="tech-card rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <RefreshCw className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">包装项目</h3>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase">包装类型分值</h4>
                {localConfig.package.map((pkg, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 flex-1">{pkg.type}</span>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="glass-input rounded-xl px-3 py-2 text-white w-24" 
                      value={pkg.score} 
                      disabled={!isAdmin}
                      onChange={e => handleUpdateItem('package', i, 'score', parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 说明书项目 */}
            <section className="tech-card rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <RefreshCw className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">说明书项目</h3>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase">说明书制作分值</h4>
                {localConfig.manual.map((man, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 flex-1">{man.type}</span>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="glass-input rounded-xl px-3 py-2 text-white w-24" 
                      value={man.score} 
                      disabled={!isAdmin}
                      onChange={e => handleUpdateItem('manual', i, 'score', parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 额外创新加分项 */}
            <section className="tech-card rounded-[2rem] p-6 space-y-4 xl:col-span-2">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <RefreshCw className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">额外创新加分项</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {localConfig.addons.map((addon, i) => (
                  <div key={addon.id} className="flex items-center gap-4 bg-slate-900/30 rounded-xl p-4">
                    <span className="text-sm text-slate-300 flex-1">{addon.label}</span>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="glass-input rounded-xl px-4 py-2 text-white w-28" 
                      value={addon.score} 
                      disabled={!isAdmin}
                      onChange={e => handleUpdateItem('addons', i, 'score', parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <BackupManager />
      )}
    </div>
  );
};

export default ScoringSettings;
