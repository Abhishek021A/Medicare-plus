import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const normalizeUser = (rawUser) => {
  if (!rawUser) return null;
  const nameParts = (rawUser.name || '').trim().split(/\s+/);
  const firstName = rawUser.first_name || nameParts[0] || '';
  const lastName = rawUser.last_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
  const fullName = rawUser.name || `${firstName} ${lastName}`.trim();
  
  const initials = (
    (firstName ? firstName[0] : '') + 
    (lastName ? lastName[0] : (nameParts[1] ? nameParts[1][0] : ''))
  ).toUpperCase() || 'U';

  return {
    id: rawUser.id,
    name: fullName,
    fullName,
    firstName,
    lastName,
    first_name: firstName,
    last_name: lastName,
    email: rawUser.email || '',
    phone: rawUser.phone || '',
    role: rawUser.role || 'CUSTOMER',
    status: rawUser.status || 'ACTIVE',
    avatar: rawUser.avatar || null,
    initials
  };
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCurrentUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const res = await api.getCurrentUser();
      const userData = res?.user || res?.data;
      if (userData) {
        const normalized = normalizeUser(userData);
        setCurrentUser(normalized);
        localStorage.setItem('medicare_user', JSON.stringify(normalized));
        localStorage.setItem('user', JSON.stringify(normalized));
        return normalized;
      }
    } catch (err) {
      console.warn('Could not verify session with backend:', err.message);
      // If 401 Unauthorized, token has expired or is invalid
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('medicare_user');
        localStorage.removeItem('user');
        setCurrentUser(null);
      } else {
        // Fallback to cached local storage if network is temporarily unreachable
        const cached = localStorage.getItem('medicare_user') || localStorage.getItem('user');
        if (cached) {
          try {
            setCurrentUser(normalizeUser(JSON.parse(cached)));
          } catch (e) {
            setCurrentUser(null);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = (userData, token = null) => {
    if (token) {
      localStorage.setItem('token', token);
    }
    const normalized = normalizeUser(userData);
    setCurrentUser(normalized);
    if (normalized) {
      localStorage.setItem('medicare_user', JSON.stringify(normalized));
      localStorage.setItem('user', JSON.stringify(normalized));
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('token');
    localStorage.removeItem('medicare_user');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading,
    loading: isLoading,
    login,
    logout,
    refreshUser,
    setCurrentUser: (user) => {
      const norm = normalizeUser(user);
      setCurrentUser(norm);
      if (norm) {
        localStorage.setItem('medicare_user', JSON.stringify(norm));
        localStorage.setItem('user', JSON.stringify(norm));
      }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
