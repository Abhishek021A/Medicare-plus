// frontend/src/pages/admin/managers/AdminManagers.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  Search,
  Plus,
  RefreshCw,
  Download,
  Eye,
  Edit2,
  Key,
  Shield,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  ChevronLeft,
  ChevronRight,
  X,
  Activity,
  Check,
  Building,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  Clock
} from 'lucide-react';
import { adminManagerService } from '../../../services/adminApi';
import { useToast } from '../../../context/ToastContext';
import './AdminManagers.css';

const MODULES_LIST = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'products', label: 'Products' },
  { key: 'categories', label: 'Categories' },
  { key: 'brands', label: 'Brands' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'orders', label: 'Orders' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'customers', label: 'Customers' },
  { key: 'coupons', label: 'Coupons' },
  { key: 'banners', label: 'Banners' },
  { key: 'blog', label: 'Blog' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'reports', label: 'Reports' },
  { key: 'notifications', label: 'Notifications' }
];

export default function AdminManagers() {
  const toastCtx = useToast();
  const addToast = useCallback((type, msg) => {
    if (toastCtx && typeof toastCtx.addToast === 'function') {
      toastCtx.addToast(msg, type);
    }
  }, [toastCtx]);

  // State
  const [managers, setManagers] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Selected manager for actions
  const [selectedManager, setSelectedManager] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmType: 'primary',
    action: null
  });

  // Permissions form state
  const [permissionsMatrix, setPermissionsMatrix] = useState({});
  const [savingPerms, setSavingPerms] = useState(false);

  // Activity logs for details modal
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Add / Edit form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: 'Operations',
    job_title: 'Manager',
    role: 'MANAGER',
    password: '',
    confirm_password: '',
    status: 'ACTIVE'
  });
  const [formErrors, setFormErrors] = useState({});
  const [submittingForm, setSubmittingForm] = useState(false);

  // Reset password state
  const [resetPassData, setResetPassData] = useState({
    password: '',
    confirm_password: ''
  });
  const [submittingReset, setSubmittingReset] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch summary counts
  const fetchSummary = useCallback(async () => {
    try {
      const res = await adminManagerService.getSummary();
      if (res && res.success && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.warn('Failed to load manager summary KPIs', err);
    }
  }, []);

  // Fetch manager list
  const fetchManagers = useCallback(async (isSilent = false) => {
    if (isSilent) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {
        search: debouncedSearch,
        status: statusFilter,
        department: departmentFilter,
        sort: sortBy,
        page,
        limit
      };

      const res = await adminManagerService.getManagers(params);
      if (res && res.success) {
        const mgrList = Array.isArray(res.data)
          ? res.data
          : (Array.isArray(res.data?.managers)
              ? res.data.managers
              : (Array.isArray(res.managers) ? res.managers : []));
        setManagers(mgrList);
        const pag = res.pagination || res.data?.pagination;
        if (pag) {
          setPagination({
            page: pag.page || 1,
            limit: pag.limit || 10,
            total: pag.total || pag.total_records || mgrList.length,
            totalPages: pag.totalPages || pag.total_pages || 1
          });
        }
      } else {
        setManagers([]);
      }
    } catch (err) {
      console.error('Failed to load managers', err);
      addToast('error', err.response?.data?.message || 'Failed to load manager accounts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, departmentFilter, sortBy, page, limit, addToast]);

  // Initial load
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  // Handlers for Add Manager
  const handleOpenAddModal = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: 'Operations',
      job_title: 'Manager',
      role: 'MANAGER',
      password: '',
      confirm_password: '',
      status: 'ACTIVE'
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleCreateManager = async (e) => {
    e.preventDefault();
    setFormErrors({});

    // Validate
    const errors = {};
    if (!formData.first_name.trim()) errors.first_name = 'First name is required.';
    if (!formData.email.trim()) errors.email = 'Email address is required.';
    if (!formData.password) errors.password = 'Password is required.';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters.';
    if (formData.password !== formData.confirm_password) errors.confirm_password = 'Passwords do not match.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmittingForm(true);
    try {
      const res = await adminManagerService.createManager(formData);
      if (res && res.success) {
        addToast('success', 'Manager created successfully.');
        setIsAddModalOpen(false);
        fetchSummary();
        fetchManagers();
      } else {
        addToast('error', res?.message || 'Failed to create manager.');
      }
    } catch (err) {
      console.error('Failed to create manager', err);
      addToast('error', err.response?.data?.message || 'Failed to create manager account.');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Handlers for Edit Manager
  const handleOpenEditModal = (mgr) => {
    setSelectedManager(mgr);
    setFormData({
      first_name: mgr.first_name || '',
      last_name: mgr.last_name || '',
      email: mgr.email || '',
      phone: mgr.phone || '',
      department: mgr.department || 'Operations',
      job_title: mgr.job_title || 'Manager',
      role: mgr.role || 'MANAGER',
      status: mgr.status || 'ACTIVE'
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleUpdateManager = async (e) => {
    e.preventDefault();
    if (!selectedManager) return;
    setFormErrors({});

    const errors = {};
    if (!formData.first_name.trim()) errors.first_name = 'First name is required.';
    if (!formData.email.trim()) errors.email = 'Email address is required.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmittingForm(true);
    try {
      const res = await adminManagerService.updateManager(selectedManager.id, formData);
      if (res && res.success) {
        addToast('success', 'Manager updated successfully.');
        setIsEditModalOpen(false);
        fetchSummary();
        fetchManagers();
      } else {
        addToast('error', res?.message || 'Failed to update manager.');
      }
    } catch (err) {
      console.error('Failed to update manager', err);
      addToast('error', err.response?.data?.message || 'Failed to update manager.');
    } finally {
      setSubmittingForm(false);
    }
  };

  // Handlers for Permissions Matrix Modal
  const handleOpenPermModal = async (mgr) => {
    setSelectedManager(mgr);
    setSavingPerms(false);

    try {
      const res = await adminManagerService.getPermissions(mgr.id);
      if (res && res.success && res.data) {
        const matrix = {};
        MODULES_LIST.forEach((m) => {
          const existing = res.data[m.key] || {};
          matrix[m.key] = {
            can_view: existing.can_view ?? (m.key === 'dashboard'),
            can_create: existing.can_create ?? false,
            can_edit: existing.can_edit ?? false,
            can_delete: existing.can_delete ?? false,
            can_approve: existing.can_approve ?? false,
            can_export: existing.can_export ?? false
          };
        });
        setPermissionsMatrix(matrix);
      }
      setIsPermModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch manager permissions', err);
      addToast('error', 'Could not load existing permissions.');
    }
  };

  const handleTogglePerm = (moduleKey, permType) => {
    setPermissionsMatrix((prev) => {
      const currentMod = prev[moduleKey] || {};
      const newVal = !currentMod[permType];
      
      const updatedMod = { ...currentMod, [permType]: newVal };
      // If turning on create/edit/delete/approve/export, ensure view is also on
      if (newVal && permType !== 'can_view') {
        updatedMod.can_view = true;
      }
      // If turning off view, turn off all actions
      if (!newVal && permType === 'can_view') {
        updatedMod.can_create = false;
        updatedMod.can_edit = false;
        updatedMod.can_delete = false;
        updatedMod.can_approve = false;
        updatedMod.can_export = false;
      }

      return {
        ...prev,
        [moduleKey]: updatedMod
      };
    });
  };

  const handleSelectAllPerms = (turnOn = true) => {
    const updated = {};
    MODULES_LIST.forEach((m) => {
      updated[m.key] = {
        can_view: turnOn,
        can_create: turnOn,
        can_edit: turnOn,
        can_delete: turnOn,
        can_approve: turnOn,
        can_export: turnOn
      };
    });
    setPermissionsMatrix(updated);
  };

  const handleSavePermissions = async () => {
    if (!selectedManager) return;
    setSavingPerms(true);
    try {
      const res = await adminManagerService.savePermissions(selectedManager.id, permissionsMatrix);
      if (res && res.success) {
        addToast('success', 'Permissions updated successfully.');
        setIsPermModalOpen(false);
      } else {
        addToast('error', res?.message || 'Failed to save permissions.');
      }
    } catch (err) {
      console.error('Failed to save permissions', err);
      addToast('error', err.response?.data?.message || 'Failed to save permissions.');
    } finally {
      setSavingPerms(false);
    }
  };

  // Handlers for Reset Password
  const handleOpenResetPassModal = (mgr) => {
    setSelectedManager(mgr);
    setResetPassData({ password: '', confirm_password: '' });
    setIsResetPassModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedManager) return;

    if (!resetPassData.password || resetPassData.password.length < 6) {
      addToast('error', 'Password must be at least 6 characters.');
      return;
    }
    if (resetPassData.password !== resetPassData.confirm_password) {
      addToast('error', 'Passwords do not match.');
      return;
    }

    setSubmittingReset(true);
    try {
      const res = await adminManagerService.resetPassword(selectedManager.id, resetPassData);
      if (res && res.success) {
        addToast('success', 'Password reset successfully.');
        setIsResetPassModalOpen(false);
      } else {
        addToast('error', res?.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error('Failed to reset password', err);
      addToast('error', err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setSubmittingReset(false);
    }
  };

  // Handlers for View Details & Activity
  const handleOpenDetailsModal = async (mgr) => {
    setSelectedManager(mgr);
    setIsDetailsModalOpen(true);
    setLoadingLogs(true);
    try {
      const res = await adminManagerService.getActivity(mgr.id);
      if (res && res.success) {
        setActivityLogs(res.data || []);
      }
    } catch (err) {
      console.warn('Could not load activity logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Status toggle confirmation
  const handleToggleStatus = (mgr) => {
    const isActivating = mgr.status !== 'ACTIVE';
    const newStatus = isActivating ? 'ACTIVE' : 'INACTIVE';

    setConfirmConfig({
      title: isActivating ? 'Activate Manager Account?' : 'Deactivate Manager Account?',
      message: isActivating
        ? `Are you sure you want to activate ${mgr.name}? They will be able to log in to the admin system.`
        : `Are you sure you want to deactivate ${mgr.name}? They will immediately lose access and cannot log in.`,
      confirmText: isActivating ? 'Activate' : 'Deactivate',
      confirmType: isActivating ? 'primary' : 'danger',
      action: async () => {
        try {
          const res = await adminManagerService.updateStatus(mgr.id, newStatus);
          if (res && res.success) {
            addToast('success', isActivating ? 'Manager activated successfully.' : 'Manager deactivated.');
            fetchSummary();
            fetchManagers();
          } else {
            addToast('error', res?.message || 'Failed to update manager status.');
          }
        } catch (err) {
          console.error('Failed to toggle status', err);
          addToast('error', err.response?.data?.message || 'Failed to update status.');
        }
      }
    });
    setIsConfirmModalOpen(true);
  };

  // Delete confirmation
  const handleDeleteManager = (mgr) => {
    setConfirmConfig({
      title: 'Delete Manager Account?',
      message: `Are you sure you want to remove ${mgr.name}? This will safely archive the manager account and disable all active access without corrupting audit history.`,
      confirmText: 'Delete Manager',
      confirmType: 'danger',
      action: async () => {
        try {
          const res = await adminManagerService.deleteManager(mgr.id);
          if (res && res.success) {
            addToast('success', 'Manager account removed successfully.');
            fetchSummary();
            fetchManagers();
          } else {
            addToast('error', res?.message || 'Failed to delete manager.');
          }
        } catch (err) {
          console.error('Failed to delete manager', err);
          addToast('error', err.response?.data?.message || 'Failed to delete manager.');
        }
      }
    });
    setIsConfirmModalOpen(true);
  };

  // Export CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await adminManagerService.exportManagers({
        search: debouncedSearch,
        status: statusFilter,
        department: departmentFilter
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `managers_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('success', 'Manager list exported successfully.');
    } catch (err) {
      console.error('Export failed', err);
      addToast('error', 'Failed to export managers.');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="mgr-page-wrapper">
      {/* Header */}
      <div className="mgr-header">
        <div>
          <div className="mgr-breadcrumb">
            <Link to="/admin">Admin</Link>
            <span>/</span>
            <span className="mgr-breadcrumb-current">Managers</span>
          </div>
          <div className="mgr-title-group">
            <h1>Managers</h1>
            <p>Manage staff managers, permissions and account access.</p>
          </div>
        </div>

        <div className="mgr-header-actions">
          <button
            className="mgr-btn mgr-btn-secondary"
            onClick={() => fetchManagers(true)}
            disabled={refreshing}
            title="Refresh Table"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            className="mgr-btn mgr-btn-secondary"
            onClick={handleExport}
            disabled={exporting}
            title="Export CSV"
          >
            <Download size={15} />
            <span>{exporting ? 'Exporting...' : 'Export'}</span>
          </button>

          <button
            className="mgr-btn mgr-btn-primary"
            onClick={handleOpenAddModal}
          >
            <Plus size={16} />
            <span>Add Manager</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="mgr-summary-grid">
        <div className="mgr-kpi-card">
          <div className="mgr-kpi-icon-wrap" style={{ backgroundColor: '#E0F2FE', color: '#0284C7' }}>
            <Users size={24} />
          </div>
          <div className="mgr-kpi-info">
            <span className="mgr-kpi-val">{summary.total}</span>
            <span className="mgr-kpi-label">Total Managers</span>
          </div>
        </div>

        <div className="mgr-kpi-card">
          <div className="mgr-kpi-icon-wrap" style={{ backgroundColor: '#D1FAE5', color: '#059669' }}>
            <UserCheck size={24} />
          </div>
          <div className="mgr-kpi-info">
            <span className="mgr-kpi-val">{summary.active}</span>
            <span className="mgr-kpi-label">Active Managers</span>
          </div>
        </div>

        <div className="mgr-kpi-card">
          <div className="mgr-kpi-icon-wrap" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
            <UserX size={24} />
          </div>
          <div className="mgr-kpi-info">
            <span className="mgr-kpi-val">{summary.inactive}</span>
            <span className="mgr-kpi-label">Inactive Managers</span>
          </div>
        </div>

        <div className="mgr-kpi-card">
          <div className="mgr-kpi-icon-wrap" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <ShieldAlert size={24} />
          </div>
          <div className="mgr-kpi-info">
            <span className="mgr-kpi-val">{summary.suspended}</span>
            <span className="mgr-kpi-label">Suspended Managers</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="mgr-card">
        {/* Controls Bar */}
        <div className="mgr-controls-bar">
          <div className="mgr-search-box">
            <Search size={16} className="mgr-search-icon" />
            <input
              type="text"
              placeholder="Search managers by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="mgr-search-clear" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="mgr-filter-actions">
            <select
              className="mgr-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>

            <select
              className="mgr-select"
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Departments</option>
              <option value="Operations">Operations</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Orders">Orders</option>
              <option value="Inventory">Inventory</option>
              <option value="Customer Support">Customer Support</option>
            </select>

            <select
              className="mgr-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="last_login">Recent Login</option>
            </select>
          </div>
        </div>

        {/* Manager Table */}
        <div className="mgr-table-responsive">
          {loading ? (
            <div style={{ padding: '24px' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="mgr-skeleton" style={{ height: '52px', marginBottom: '12px' }} />
              ))}
            </div>
          ) : (!Array.isArray(managers) || managers.length === 0) ? (
            <div className="mgr-empty-state">
              <Users size={44} className="mgr-empty-icon" />
              <h3>No managers found</h3>
              <p>Try adjusting your search query or status filter.</p>
              <button className="mgr-btn mgr-btn-primary" onClick={handleOpenAddModal}>
                <Plus size={15} />
                <span>Add First Manager</span>
              </button>
            </div>
          ) : (
            <table className="mgr-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Manager</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(managers) && managers.map((mgr) => {
                  const initials = mgr.initials || 'MG';
                  const isSuspended = mgr.status === 'SUSPENDED';
                  const isActive = mgr.status === 'ACTIVE';

                  return (
                    <tr key={mgr.id}>
                      <td>
                        <div className="mgr-avatar">
                          {mgr.avatar ? (
                            <img src={mgr.avatar} alt={mgr.name} />
                          ) : (
                            <span>{initials}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="mgr-user-cell">
                          <div>
                            <div className="mgr-user-name">{mgr.name}</div>
                            <div className="mgr-user-title">{mgr.job_title || 'Staff Manager'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--mgr-dark)', fontWeight: 500 }}>
                          {mgr.email}
                        </span>
                      </td>
                      <td>{mgr.phone || '—'}</td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{mgr.department || 'Operations'}</span>
                      </td>
                      <td>
                        <span className={`mgr-role-badge ${mgr.role === 'SUPER_ADMIN' ? 'mgr-role-super' : ''}`}>
                          {mgr.role_label || mgr.role}
                        </span>
                      </td>
                      <td>
                        <span className={`mgr-badge ${
                          isActive ? 'mgr-badge-active' :
                          isSuspended ? 'mgr-badge-suspended' : 'mgr-badge-inactive'
                        }`}>
                          <span className="mgr-badge-dot" />
                          <span>{mgr.status}</span>
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--mgr-gray-500)' }}>
                        {formatDate(mgr.last_login)}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--mgr-gray-500)' }}>
                        {formatDate(mgr.created_at)}
                      </td>
                      <td>
                        <div className="mgr-action-group">
                          {/* View details */}
                          <button
                            className="mgr-icon-btn primary"
                            title="View Details"
                            onClick={() => handleOpenDetailsModal(mgr)}
                          >
                            <Eye size={15} />
                          </button>

                          {/* Edit */}
                          <button
                            className="mgr-icon-btn"
                            title="Edit Manager"
                            onClick={() => handleOpenEditModal(mgr)}
                          >
                            <Edit2 size={15} />
                          </button>

                          {/* Permissions */}
                          <button
                            className="mgr-icon-btn"
                            title="Manage Permissions"
                            onClick={() => handleOpenPermModal(mgr)}
                          >
                            <Shield size={15} />
                          </button>

                          {/* Reset Password */}
                          <button
                            className="mgr-icon-btn"
                            title="Reset Password"
                            onClick={() => handleOpenResetPassModal(mgr)}
                          >
                            <Key size={15} />
                          </button>

                          {/* Activate / Deactivate */}
                          <button
                            className={`mgr-icon-btn ${isActive ? 'danger' : 'primary'}`}
                            title={isActive ? 'Deactivate Manager' : 'Activate Manager'}
                            onClick={() => handleToggleStatus(mgr)}
                          >
                            {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>

                          {/* Delete (Soft) */}
                          <button
                            className="mgr-icon-btn danger"
                            title="Delete Manager"
                            onClick={() => handleDeleteManager(mgr)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {pagination.total > 0 && (
          <div className="mgr-pagination">
            <div>
              Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} managers
            </div>

            <div className="mgr-page-btns">
              <button
                className="mgr-page-btn"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  className={`mgr-page-btn ${pageNum === pagination.page ? 'active' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                className="mgr-page-btn"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. ADD MANAGER MODAL */}
      {isAddModalOpen && (
        <div className="mgr-modal-overlay">
          <div className="mgr-modal-card">
            <div className="mgr-modal-header">
              <h2>Add New Manager</h2>
              <button className="mgr-modal-close" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateManager}>
              <div className="mgr-modal-body">
                <div className="mgr-form-grid">
                  <div className="mgr-form-group">
                    <label className="mgr-label">First Name *</label>
                    <input
                      type="text"
                      className="mgr-input"
                      placeholder="e.g. Abhishek"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                    {formErrors.first_name && (
                      <span style={{ fontSize: '11px', color: 'var(--mgr-danger)' }}>{formErrors.first_name}</span>
                    )}
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Last Name</label>
                    <input
                      type="text"
                      className="mgr-input"
                      placeholder="e.g. Barik"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Email Address *</label>
                    <input
                      type="email"
                      className="mgr-input"
                      placeholder="manager@medicareplus.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    {formErrors.email && (
                      <span style={{ fontSize: '11px', color: 'var(--mgr-danger)' }}>{formErrors.email}</span>
                    )}
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Phone Number</label>
                    <input
                      type="tel"
                      className="mgr-input"
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Department</label>
                    <select
                      className="mgr-input"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    >
                      <option value="Operations">Operations</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Orders">Orders</option>
                      <option value="Inventory">Inventory</option>
                      <option value="Customer Support">Customer Support</option>
                    </select>
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Job Title</label>
                    <input
                      type="text"
                      className="mgr-input"
                      placeholder="e.g. Operations Manager"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    />
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Role</label>
                    <select
                      className="mgr-input"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="MANAGER">Manager</option>
                      <option value="PHARMACY_MANAGER">Pharmacy Manager</option>
                      <option value="ORDER_MANAGER">Order Manager</option>
                      <option value="CONTENT_MANAGER">Content Manager</option>
                    </select>
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Status</label>
                    <select
                      className="mgr-input"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Password *</label>
                    <input
                      type="password"
                      className="mgr-input"
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    {formErrors.password && (
                      <span style={{ fontSize: '11px', color: 'var(--mgr-danger)' }}>{formErrors.password}</span>
                    )}
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Confirm Password *</label>
                    <input
                      type="password"
                      className="mgr-input"
                      placeholder="Re-enter password"
                      value={formData.confirm_password}
                      onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    />
                    {formErrors.confirm_password && (
                      <span style={{ fontSize: '11px', color: 'var(--mgr-danger)' }}>{formErrors.confirm_password}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mgr-modal-footer">
                <button
                  type="button"
                  className="mgr-btn mgr-btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mgr-btn mgr-btn-primary"
                  disabled={submittingForm}
                >
                  {submittingForm ? 'Creating...' : 'Create Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EDIT MANAGER MODAL */}
      {isEditModalOpen && selectedManager && (
        <div className="mgr-modal-overlay">
          <div className="mgr-modal-card">
            <div className="mgr-modal-header">
              <h2>Edit Manager Profile</h2>
              <button className="mgr-modal-close" onClick={() => setIsEditModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateManager}>
              <div className="mgr-modal-body">
                <div className="mgr-form-grid">
                  <div className="mgr-form-group">
                    <label className="mgr-label">First Name *</label>
                    <input
                      type="text"
                      className="mgr-input"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                    {formErrors.first_name && (
                      <span style={{ fontSize: '11px', color: 'var(--mgr-danger)' }}>{formErrors.first_name}</span>
                    )}
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Last Name</label>
                    <input
                      type="text"
                      className="mgr-input"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Email Address *</label>
                    <input
                      type="email"
                      className="mgr-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    {formErrors.email && (
                      <span style={{ fontSize: '11px', color: 'var(--mgr-danger)' }}>{formErrors.email}</span>
                    )}
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Phone Number</label>
                    <input
                      type="tel"
                      className="mgr-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Department</label>
                    <select
                      className="mgr-input"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    >
                      <option value="Operations">Operations</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Orders">Orders</option>
                      <option value="Inventory">Inventory</option>
                      <option value="Customer Support">Customer Support</option>
                    </select>
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Job Title</label>
                    <input
                      type="text"
                      className="mgr-input"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    />
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Role</label>
                    <select
                      className="mgr-input"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="MANAGER">Manager</option>
                      <option value="PHARMACY_MANAGER">Pharmacy Manager</option>
                      <option value="ORDER_MANAGER">Order Manager</option>
                      <option value="CONTENT_MANAGER">Content Manager</option>
                    </select>
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Status</label>
                    <select
                      className="mgr-input"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mgr-modal-footer">
                <button
                  type="button"
                  className="mgr-btn mgr-btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mgr-btn mgr-btn-primary"
                  disabled={submittingForm}
                >
                  {submittingForm ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. PERMISSIONS MATRIX MODAL */}
      {isPermModalOpen && selectedManager && (
        <div className="mgr-modal-overlay">
          <div className="mgr-modal-card wide">
            <div className="mgr-modal-header">
              <div>
                <h2>Manager Permissions Matrix</h2>
                <span style={{ fontSize: '13px', color: 'var(--mgr-gray-500)' }}>
                  Configuring access rules for <strong>{selectedManager.name}</strong> ({selectedManager.role_label || selectedManager.role})
                </span>
              </div>
              <button className="mgr-modal-close" onClick={() => setIsPermModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="mgr-modal-body" style={{ padding: '16px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: 'var(--mgr-gray-600)' }}>
                  Checked boxes grant explicit access. Unchecked modules will be completely hidden from the manager's sidebar and forbidden by the PHP backend.
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="mgr-btn mgr-btn-secondary"
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                    onClick={() => handleSelectAllPerms(true)}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="mgr-btn mgr-btn-secondary"
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                    onClick={() => handleSelectAllPerms(false)}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="mgr-table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="mgr-perm-table">
                  <thead>
                    <tr>
                      <th>Module</th>
                      <th>View</th>
                      <th>Create</th>
                      <th>Edit</th>
                      <th>Delete</th>
                      <th>Approve</th>
                      <th>Export</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES_LIST.map((mod) => {
                      const perms = permissionsMatrix[mod.key] || {};
                      return (
                        <tr key={mod.key}>
                          <td>{mod.label}</td>
                          <td>
                            <label className="mgr-checkbox-wrap">
                              <input
                                type="checkbox"
                                className="mgr-checkbox"
                                checked={!!perms.can_view}
                                onChange={() => handleTogglePerm(mod.key, 'can_view')}
                              />
                            </label>
                          </td>
                          <td>
                            <label className="mgr-checkbox-wrap">
                              <input
                                type="checkbox"
                                className="mgr-checkbox"
                                checked={!!perms.can_create}
                                onChange={() => handleTogglePerm(mod.key, 'can_create')}
                              />
                            </label>
                          </td>
                          <td>
                            <label className="mgr-checkbox-wrap">
                              <input
                                type="checkbox"
                                className="mgr-checkbox"
                                checked={!!perms.can_edit}
                                onChange={() => handleTogglePerm(mod.key, 'can_edit')}
                              />
                            </label>
                          </td>
                          <td>
                            <label className="mgr-checkbox-wrap">
                              <input
                                type="checkbox"
                                className="mgr-checkbox"
                                checked={!!perms.can_delete}
                                onChange={() => handleTogglePerm(mod.key, 'can_delete')}
                              />
                            </label>
                          </td>
                          <td>
                            <label className="mgr-checkbox-wrap">
                              <input
                                type="checkbox"
                                className="mgr-checkbox"
                                checked={!!perms.can_approve}
                                onChange={() => handleTogglePerm(mod.key, 'can_approve')}
                              />
                            </label>
                          </td>
                          <td>
                            <label className="mgr-checkbox-wrap">
                              <input
                                type="checkbox"
                                className="mgr-checkbox"
                                checked={!!perms.can_export}
                                onChange={() => handleTogglePerm(mod.key, 'can_export')}
                              />
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mgr-modal-footer">
              <button
                type="button"
                className="mgr-btn mgr-btn-secondary"
                onClick={() => setIsPermModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mgr-btn mgr-btn-primary"
                onClick={handleSavePermissions}
                disabled={savingPerms}
              >
                {savingPerms ? 'Saving Permissions...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. RESET PASSWORD MODAL */}
      {isResetPassModalOpen && selectedManager && (
        <div className="mgr-modal-overlay">
          <div className="mgr-modal-card" style={{ maxWidth: '440px' }}>
            <div className="mgr-modal-header">
              <h2>Reset Password</h2>
              <button className="mgr-modal-close" onClick={() => setIsResetPassModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="mgr-modal-body">
                <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--mgr-gray-600)' }}>
                  Set a new secure password for <strong>{selectedManager.name}</strong> ({selectedManager.email}). Passwords will be securely hashed with Bcrypt.
                </div>

                <div className="mgr-form-grid single">
                  <div className="mgr-form-group">
                    <label className="mgr-label">New Password *</label>
                    <input
                      type="password"
                      className="mgr-input"
                      placeholder="Minimum 6 characters"
                      value={resetPassData.password}
                      onChange={(e) => setResetPassData({ ...resetPassData, password: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mgr-form-group">
                    <label className="mgr-label">Confirm New Password *</label>
                    <input
                      type="password"
                      className="mgr-input"
                      placeholder="Re-enter new password"
                      value={resetPassData.confirm_password}
                      onChange={(e) => setResetPassData({ ...resetPassData, confirm_password: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="mgr-modal-footer">
                <button
                  type="button"
                  className="mgr-btn mgr-btn-secondary"
                  onClick={() => setIsResetPassModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mgr-btn mgr-btn-primary"
                  disabled={submittingReset}
                >
                  {submittingReset ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. VIEW DETAILS & ACTIVITY MODAL */}
      {isDetailsModalOpen && selectedManager && (
        <div className="mgr-modal-overlay">
          <div className="mgr-modal-card wide">
            <div className="mgr-modal-header">
              <h2>Manager Details & Audit History</h2>
              <button className="mgr-modal-close" onClick={() => setIsDetailsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="mgr-modal-body">
              {/* Profile Card Header */}
              <div className="mgr-detail-profile-header">
                <div className="mgr-detail-avatar">
                  {selectedManager.avatar ? (
                    <img src={selectedManager.avatar} alt={selectedManager.name} />
                  ) : (
                    <span>{selectedManager.initials || 'MG'}</span>
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--mgr-dark)' }}>
                    {selectedManager.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="mgr-role-badge">{selectedManager.role_label || selectedManager.role}</span>
                    <span className={`mgr-badge ${
                      selectedManager.status === 'ACTIVE' ? 'mgr-badge-active' :
                      selectedManager.status === 'SUSPENDED' ? 'mgr-badge-suspended' : 'mgr-badge-inactive'
                    }`}>
                      <span className="mgr-badge-dot" />
                      <span>{selectedManager.status}</span>
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--mgr-gray-500)' }}>
                      • {selectedManager.department || 'Operations'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="mgr-info-row">
                <div className="mgr-info-item">
                  <span className="mgr-info-label">Email Address</span>
                  <span className="mgr-info-value">{selectedManager.email}</span>
                </div>
                <div className="mgr-info-item">
                  <span className="mgr-info-label">Phone Number</span>
                  <span className="mgr-info-value">{selectedManager.phone || 'N/A'}</span>
                </div>
                <div className="mgr-info-item">
                  <span className="mgr-info-label">Job Title</span>
                  <span className="mgr-info-value">{selectedManager.job_title || 'Manager'}</span>
                </div>
                <div className="mgr-info-item">
                  <span className="mgr-info-label">Department</span>
                  <span className="mgr-info-value">{selectedManager.department || 'Operations'}</span>
                </div>
                <div className="mgr-info-item">
                  <span className="mgr-info-label">Account Created</span>
                  <span className="mgr-info-value">{formatDate(selectedManager.created_at)}</span>
                </div>
                <div className="mgr-info-item">
                  <span className="mgr-info-label">Last Login</span>
                  <span className="mgr-info-value">{formatDate(selectedManager.last_login)}</span>
                </div>
              </div>

              {/* Recent Activity Audit Logs */}
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--mgr-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} style={{ color: 'var(--mgr-primary)' }} />
                  <span>Recent Audit Activity</span>
                </h4>

                {loadingLogs ? (
                  <div style={{ padding: '16px 0' }}>
                    <div className="mgr-skeleton" style={{ height: '36px', marginBottom: '8px' }} />
                    <div className="mgr-skeleton" style={{ height: '36px', marginBottom: '8px' }} />
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--mgr-gray-500)', backgroundColor: 'var(--mgr-gray-50)', borderRadius: '10px' }}>
                    No audit records recorded for this manager yet.
                  </div>
                ) : (
                  <div className="mgr-table-responsive" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                    <table className="mgr-table">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Module</th>
                          <th>Description</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityLogs.map((log) => (
                          <tr key={log.id}>
                            <td style={{ fontWeight: 600, color: 'var(--mgr-dark)' }}>{log.action}</td>
                            <td>
                              <span className="mgr-role-badge" style={{ backgroundColor: '#F1F5F9', color: '#475569', borderColor: '#E2E8F0' }}>
                                {log.module}
                              </span>
                            </td>
                            <td style={{ fontSize: '12px' }}>{log.description}</td>
                            <td style={{ fontSize: '11px', color: 'var(--mgr-gray-500)' }}>{formatDate(log.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="mgr-modal-footer">
              <button
                type="button"
                className="mgr-btn mgr-btn-secondary"
                onClick={() => setIsDetailsModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="mgr-btn mgr-btn-primary"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  handleOpenPermModal(selectedManager);
                }}
              >
                <Shield size={14} />
                <span>Edit Permissions</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. GENERIC CONFIRMATION MODAL */}
      {isConfirmModalOpen && (
        <div className="mgr-modal-overlay">
          <div className="mgr-modal-card" style={{ maxWidth: '440px' }}>
            <div className="mgr-modal-header">
              <h2>{confirmConfig.title}</h2>
              <button className="mgr-modal-close" onClick={() => setIsConfirmModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="mgr-modal-body">
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: confirmConfig.confirmType === 'danger' ? '#FEE2E2' : '#E6F5F3',
                  color: confirmConfig.confirmType === 'danger' ? '#DC2626' : '#087F73',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={20} />
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--mgr-gray-600)', lineHeight: '1.5' }}>
                  {confirmConfig.message}
                </p>
              </div>
            </div>

            <div className="mgr-modal-footer">
              <button
                type="button"
                className="mgr-btn mgr-btn-secondary"
                onClick={() => setIsConfirmModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`mgr-btn ${confirmConfig.confirmType === 'danger' ? 'mgr-btn-danger' : 'mgr-btn-primary'}`}
                onClick={async () => {
                  setIsConfirmModalOpen(false);
                  if (confirmConfig.action) {
                    await confirmConfig.action();
                  }
                }}
              >
                {confirmConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
