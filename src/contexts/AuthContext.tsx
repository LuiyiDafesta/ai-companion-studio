import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
  role: 'user' | 'admin';
  credits: number;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, _password: string): Promise<boolean> => {
    // Mock login - replace with real API
    const isAdmin = email.includes('admin');
    setUser({
      id: '1',
      email,
      name: email.split('@')[0],
      company: 'Acme Corp',
      role: isAdmin ? 'admin' : 'user',
      credits: 5000,
    });
    return true;
  };

  const register = async (email: string, _password: string, name: string): Promise<boolean> => {
    setUser({
      id: '1',
      email,
      name,
      role: 'user',
      credits: 1000,
    });
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        login, 
        register, 
        logout,
        isAdmin: user?.role === 'admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
