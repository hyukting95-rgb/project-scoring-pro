import React, { useState, useCallback } from 'react';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from './AuthContext';
import { checkUserPermissions } from './db';

interface LoginFormProps {
  onClose?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onClose }) => {
  const { signIn, signUp, signOut, permissions } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('请填写邮箱和密码');
      return;
    }

    if (!isLogin && !displayName) {
      setError('请填写显示名称');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        console.log('[LoginForm] 步骤1: 开始登录流程');
        await signIn(email, password);
        
        // 检查 signIn 后是否有有效的用户会话
        const { data: { user: currentUser } } = await import('./db').then(db => db.supabase.auth.getUser());
        console.log('[LoginForm] 步骤1.5: signIn 后的当前用户:', currentUser?.email, currentUser?.id);
        
        if (!currentUser) {
          console.log('[LoginForm] 步骤1.6: 无有效会话，阻止登录');
          setError('登录验证失败，请重新尝试');
          setLoading(false);
          return;
        }
        
        console.log('[LoginForm] 步骤2: 登录完成，开始检查权限');
        
        let latestPermissions;
        try {
          latestPermissions = await checkUserPermissions();
        } catch (error: any) {
          console.error('[LoginForm] 步骤3: 检查权限失败:', error);
          setError('检查账户状态失败，请刷新页面后重试');
          setLoading(false);
          return;
        }
        
        console.log('[LoginForm] 步骤4: 权限检查结果:', JSON.stringify(latestPermissions));
        
        if (!latestPermissions) {
          console.log('[LoginForm] 步骤5: permissions 为 null');
          setError('无法获取您的账户状态，请刷新页面后重试');
          setLoading(false);
          return;
        }
        
        if (!latestPermissions.existsInTeam) {
          console.log('[LoginForm] 步骤5: 用户不存在于 team_members 中，准备显示错误');
          setError('您的账户不存在或已被删除，请联系管理员。');
          setLoading(false);
          console.log('[LoginForm] 步骤6: 返回，阻止登录');
          // 清除 Supabase 自动恢复的会话，防止用户进入系统
          await signOut();
          return;
        }
        
        if (latestPermissions.status === 'pending') {
          console.log('[LoginForm] 步骤5: 用户状态为 pending');
          setError('您的账户正在等待管理员审核，请联系管理员批准后登录。');
          setLoading(false);
          await signOut();
          return;
        }
        
        if (latestPermissions.status === 'suspended') {
          console.log('[LoginForm] 步骤5: 用户状态为 suspended');
          setError('您的账户已被暂停，请联系管理员。');
          setLoading(false);
          await signOut();
          return;
        }
        
        console.log('[LoginForm] 步骤5: 登录成功，关闭登录框');
        setSuccess('登录成功！');
        onClose?.();
      } else {
        await signUp(email, password, displayName);
        setSuccess('注册成功！您的账户正在等待管理员审核，请联系管理员批准后登录。');
        setIsLogin(true);
        setDisplayName('');
      }
    } catch (err: any) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setDisplayName('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="tech-card rounded-3xl p-8 w-full max-w-md border border-white/10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 tech-gradient rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mx-auto mb-4">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isLogin ? '登录系统' : '注册账户'}
          </h2>
          <p className="text-slate-400 text-sm">
            {isLogin ? '使用您的账户登录计分系统' : '创建新账户开始使用'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">显示名称</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full glass-input rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="输入您的姓名"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">邮箱地址</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="输入邮箱地址"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input rounded-xl pl-11 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="输入密码"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full tech-gradient rounded-xl py-3 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={switchMode}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            {isLogin ? '没有账户？点击注册' : '已有账户？点击登录'}
          </button>
        </div>

        {onClose && (
          <div className="mt-6 text-center">
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;