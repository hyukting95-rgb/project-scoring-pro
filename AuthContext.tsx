import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { getCurrentUser, signIn as supabaseSignIn, signUp as supabaseSignUp, signOut as supabaseSignOut, checkUserPermissions } from './db';
import { TEST_MODE, isTestMode } from './test-mode';
import { UserPermissions, UserRole, UserStatus } from './types';

interface AuthContextType {
  user: User | null;
  permissions: UserPermissions | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async (currentUser: User | null): Promise<UserPermissions | null> => {
    if (!currentUser) {
      setPermissions(null);
      return null;
    }

    try {
      const perms = await checkUserPermissions();
      setPermissions(perms);
      return perms;
    } catch (error) {
      console.error('获取用户权限失败:', error);
      setPermissions(null);
      return null;
    }
  };

  useEffect(() => {
    if (isTestMode()) {
      setTimeout(() => {
        const mockUser = TEST_MODE.mockUser as unknown as User;
        setUser(mockUser);
        setPermissions({
          isAdmin: true,
          isActive: true,
          role: 'admin',
          status: 'active',
          existsInTeam: true
        });
        setLoading(false);
      }, 500);
      return;
    }

    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        await fetchPermissions(currentUser);
      } catch (error) {
        setUser(null);
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const refreshPermissions = async (): Promise<UserPermissions | null> => {
    return await fetchPermissions(user);
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      if (isTestMode()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockUser = { ...TEST_MODE.mockUser, email } as unknown as User;
        setUser(mockUser);
        setPermissions({
          isAdmin: true,
          isActive: true,
          role: 'admin',
          status: 'active',
          existsInTeam: true
        });
        return;
      }
      
      const { user } = await supabaseSignIn(email, password);
      setUser(user);
      await fetchPermissions(user);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      setLoading(true);
      
      if (isTestMode()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockUser = { ...TEST_MODE.mockUser, email, user_metadata: { display_name: displayName || email.split('@')[0] } };
        setUser(mockUser as unknown as User);
        setPermissions({
          isAdmin: false,
          isActive: false,
          role: 'member',
          status: 'pending',
          existsInTeam: false
        });
        return;
      }
      
      await supabaseSignUp(email, password, displayName);
      setUser(null);
      setPermissions({
        isAdmin: false,
        isActive: false,
        role: 'member',
        status: 'pending',
        existsInTeam: false
      });
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      if (isTestMode()) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setUser(null);
        setPermissions(null);
        return;
      }
      
      await supabaseSignOut();
      setUser(null);
      setPermissions(null);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      permissions,
      loading,
      signIn,
      signUp,
      signOut,
      refreshPermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};