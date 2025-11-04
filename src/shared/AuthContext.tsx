import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Defines the roles supported by the application.  DISPATCHERs can
 * manage clients and trial trainings, while ADMINs have broader
 * access including contracts and payments.  */
export type Role = 'DISPATCHER' | 'ADMIN';

/**
 * Represents an authenticated user.  Only the username and role
 * are required for client‑side routing and access control.  */
export interface User {
  username: string;
  role: Role;
}

/**
 * The shape of the authentication context.  Components can use
 * login() to authenticate a user, logout() to clear the session,
 * and inspect the current user state.  */
export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provides authentication state and helpers to descendant
 * components.  The user is persisted in localStorage so a page
 * refresh does not reset the session.  */
export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('football-crm:user');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch (err) {
      return null;
    }
  });

  /**
   * Logs a user into the application.  Since there is no backend
   * available in this environment, the login logic simply infers
   * the role from the username: accounts beginning with "admin"
   * get the ADMIN role, otherwise DISPATCHER is assumed.  */
  const login = async (username: string, _password: string) => {
    // Trim whitespace and normalise case
    const normalized = username.trim().toLowerCase();
    const role: Role = normalized.startsWith('admin') ? 'ADMIN' : 'DISPATCHER';
    const newUser: User = { username, role };
    localStorage.setItem('football-crm:user', JSON.stringify(newUser));
    setUser(newUser);
  };

  /**
   * Clears the current session and removes the persisted user
   * information from localStorage.  */
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

/**
 * Hook to access the authentication context.  Throws an error if
 * used outside of an AuthProvider.  */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};