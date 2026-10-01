import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as loginApi } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('admin');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyExistingAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await getMe();
          setAdmin(res.data.admin);
          localStorage.setItem('admin', JSON.stringify(res.data.admin));
        } catch (err) {
          localStorage.removeItem('token');
          localStorage.removeItem('admin');
          setAdmin(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    verifyExistingAuth();
  }, []);

  const loginUser = async (username, password) => {
    const res = await loginApi({ username, password });
    const { token: receivedToken, admin: adminData } = res.data;
    localStorage.setItem('token', receivedToken);
    localStorage.setItem('admin', JSON.stringify(adminData));
    setToken(receivedToken);
    setAdmin(adminData);
    return adminData;
  };

  const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    setToken(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, token, isAuthenticated: !!token, loading, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
