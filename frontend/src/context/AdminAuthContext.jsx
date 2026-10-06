import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { adminProfileService } from '../services/adminApi';

const AdminAuthContext = createContext(null);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

// Helper to normalize admin user object
export const normalizeAdmin = (raw) => {
  if (!raw) return null;

  const nameParts = (raw.name || '').trim().split(/\s+/);
  const firstName = raw.first_name || nameParts[0] || 'Admin';
  const lastName = raw.last_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
  const fullName = raw.name || `${firstName} ${lastName}`.trim();

  // Generate initials (e.g. AB for Abhishek Barik or SA for Super Admin)
  const initials = (
    (firstName ? firstName[0] : '') + 
    (lastName ? lastName[0] : (nameParts[1] ? nameParts[1][0] : ''))
  ).toUpperCase() || 'A';

  // Format avatar URL if relative path
  let avatarUrl = raw.avatar || null;
  if (avatarUrl && !avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://') && !avatarUrl.startsWith('data:')) {
    const apiBase = 'http://localhost:8080/pharmacy_api';
    avatarUrl = `${apiBase}/${avatarUrl.replace(/^\//, '')}`;
  }

  // Format role label
  const roleRaw = raw.role || 'ADMIN';
  const roleLabel = raw.role_label || ucwords(roleRaw.toLowerCase().replace(/_/g, ' '));

  return {
    id: raw.id || 1,
    admin_code: raw.admin_code || `ADM-${String(raw.id || 1).padStart(3, '0')}`,
    name: fullName,
    fullName,
    first_name: firstName,
    last_name: lastName,
    email: raw.email || '',
    phone: raw.phone || '',
    role: roleRaw,
    role_label: roleLabel,
    status: (raw.status || 'ACTIVE').toUpperCase(),
    avatar: avatarUrl,
    avatar_raw: raw.avatar_raw || raw.avatar || null,
    job_title: raw.job_title || 'Administrator',
    department: raw.department || 'Management',
    created_at: raw.created_at || null,
    updated_at: raw.updated_at || null,
    last_login: raw.last_login || null,
    permissions: raw.permissions || {},
    initials
  };
};

function ucwords(str) {
  return (str + '').replace(/^(.)|\s+(.)/g, function ($1) {
    return $1.toUpperCase();
  });
}

export const AdminAuthProvider = ({ children }) => {
  const [currentAdmin, setCurrentAdmin] = useState(() => {
    try {
      const saved = localStorage.getItem('adminUser');
      if (saved) {
        return normalizeAdmin(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to parse cached adminUser', e);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Fetch verified admin profile from MySQL
  const refreshAdmin = useCallback(async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setCurrentAdmin(null);
      setIsLoading(false);
      return null;
    }

    try {
      const res = await adminProfileService.getProfile();
      if (res && res.success && res.data) {
        const normalized = normalizeAdmin(res.data);
        setCurrentAdmin(normalized);
        localStorage.setItem('adminUser', JSON.stringify(normalized));
        return normalized;
      }
    } catch (err) {
      console.warn('Could not refresh admin profile from backend:', err?.response?.data?.message || err.message);
      // If 401 Unauthorized, token expired
      if (err.response?.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setCurrentAdmin(null);
      }
    } finally {
      setIsLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    refreshAdmin();

    const handleProfileSync = () => {
      refreshAdmin();
    };

    window.addEventListener('medicare_admin_profile_updated', handleProfileSync);
    return () => {
      window.removeEventListener('medicare_admin_profile_updated', handleProfileSync);
    };
  }, [refreshAdmin]);

  // Update admin locally and broadcast
  const updateAdmin = (newData) => {
    setCurrentAdmin(prev => {
      const merged = { ...prev, ...newData };
      const normalized = normalizeAdmin(merged);
      localStorage.setItem('adminUser', JSON.stringify(normalized));
      return normalized;
    });

    window.dispatchEvent(new CustomEvent('medicare_admin_profile_updated'));
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setCurrentAdmin(null);
    window.location.href = '/admin/login';
  };

  return (
    <AdminAuthContext.Provider value={{
      currentAdmin,
      setCurrentAdmin,
      isLoading,
      refreshAdmin,
      updateAdmin,
      logout,
      isAuthenticated: Boolean(currentAdmin)
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
