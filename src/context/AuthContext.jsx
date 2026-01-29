import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function validateAuth() {
      const storedUser = authApi.getUser();
      const hasToken = authApi.isAuthenticated();
      
      if (storedUser && hasToken) {
        try {
          // Validate token by calling the API
          const { user: validUser } = await authApi.getMe();
          setUser(validUser);
        } catch (err) {
          // Token is invalid - clear everything
          console.log('Token validation failed, logging out');
          authApi.logout();
          setUser(null);
        }
      } else {
        // No stored auth - ensure clean state
        authApi.logout();
        setUser(null);
      }
      setLoading(false);
    }
    
    validateAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const { user } = await authApi.login(email, password);
      setUser(user);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const register = useCallback(async (email, password, name, role) => {
    setError(null);
    try {
      const { user } = await authApi.register(email, password, name, role);
      setUser(user);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    try {
      const { user } = await authApi.updateProfile(data);
      setUser(user);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
