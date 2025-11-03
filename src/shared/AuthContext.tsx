import React, { createContext, useContext, useState } from 'react';

export type Role = 'DISPATCHER' | 'ADMIN';

export interface User {
  username: string;
  role: Role;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('football-crm:user');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  const login = async (username: string, _password: string) => {
    const normalized = username.trim().toLowerCase();
    const role: Role = normalized.startsWith('admin') ? 'ADMIN' : 'DISPATCHER';
    const newUser: User = { username, role };
    localStorage.setItem('football-crm:user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('football-crm:user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};