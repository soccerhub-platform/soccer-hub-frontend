import React, { createContext, useContext, useState } from 'react';
import { getApiUrl } from './api';
import { clearStoredUser, readStoredUser, writeStoredUser } from './auth-storage';

export interface User {
  email: string;
  roles: string[];        // массив ролей, гибко на будущее
  accessToken: string;
  refreshToken?: string;
  passwordChangeRequired?: boolean;
}

export type Role = string;

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  const login = async (email: string, password: string, role: string) => {
    const response = await fetch(getApiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();

    const newUser: User = {
      email,
      roles: [role],          // сохраняем выбранную роль
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      passwordChangeRequired: data.passwordChangeRequired,
    };

    writeStoredUser(newUser);
    setUser(newUser);
  };

  const logout = () => {
    clearStoredUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
