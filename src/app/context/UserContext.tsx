import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import * as authService from '../../services/auth.service';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'mesero';
  createdAt: Date;
}

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isMesero: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthChange((userProfile) => {
      setUser(userProfile);
      setLoading(false);
    });

    return () => unsubscribe?.();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userProfile = await authService.loginUser(email, password);
      setUser(userProfile);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logoutUser();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value: UserContextType = {
    user,
    loading,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isMesero: user?.role === 'mesero',
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser debe usarse dentro de UserProvider');
  }
  return context;
}
