import React, { useEffect, useState } from 'react';
import { UserCheck, Loader, AlertTriangle, CheckCircle } from 'lucide-react';
import { acceptInvitation } from '../team';

interface InvitationHandlerProps {
  onInvitationProcessed: () => void;
}

export default function InvitationHandler({ onInvitationProcessed }: InvitationHandlerProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // 从URL参数中获取邀请令牌
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite_token');

    if (inviteToken) {
      setToken(inviteToken);
      handleInvitation(inviteToken);
    }
  }, []);

  const handleInvitation = async (inviteToken: string) => {
    try {
      setStatus('loading');
      setMessage('正在处理邀请...');

      const member = await acceptInvitation(inviteToken);
      
      setStatus('success');
      setMessage(`欢迎 ${member.display_name}！您已成功加入团队。`);

      // 清理URL参数
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // 延迟调用回调，然后重新加载页面
      setTimeout(() => {
        onInvitationProcessed();
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('接受邀请失败:', error);
      setStatus('error');
      setMessage(`接受邀请失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  if (status === 'idle') {
    return null;
  }

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">处理邀请</h3>
            <p className="text-slate-400">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">邀请成功</h3>
            <p className="text-slate-400 mb-4">{message}</p>
            <p className="text-sm text-slate-500">正在重新加载页面...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">邀请失败</h3>
            <p className="text-slate-400 mb-4">{message}</p>
            <button
              onClick={() => {
                const newUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, '', newUrl);
                window.location.reload();
              }}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}