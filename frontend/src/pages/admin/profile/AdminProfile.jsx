import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  Clock,
  Calendar,
  Camera,
  Trash2,
  Lock,
  Key,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Edit2,
  Save,
  RotateCcw,
  Check,
  X,
  Laptop,
  Activity,
  Briefcase,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { adminProfileService } from '../../../services/adminApi';
import './AdminProfile.css';

export default function AdminProfile() {
  const { currentAdmin, updateAdmin, refreshAdmin } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    department: ''
  });

  const [initialData, setInitialData] = useState({});

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Remove Avatar Modal State
  const [showRemoveAvatarModal, setShowRemoveAvatarModal] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  // Avatar Upload State
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Activity State
  const [activities, setActivities] = useState([]);

  // Fetch verified profile & activity
  const loadProfileData = async () => {
    setLoading(true);
    try {
      const [profileRes, activityRes] = await Promise.all([
        adminProfileService.getProfile(),
        adminProfileService.getActivity().catch(() => ({ success: false }))
      ]);

      if (profileRes && profileRes.success && profileRes.data) {
        const u = profileRes.data;
        const initial = {
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          email: u.email || '',
          phone: u.phone || '',
          jobTitle: u.job_title || 'Administrator',
          department: u.department || 'Operations'
        };
        setFormData(initial);
        setInitialData(initial);
        updateAdmin(u);
      }

      if (activityRes && activityRes.success && activityRes.data) {
        setActivities(activityRes.data.activities || []);
      }
    } catch (err) {
      console.error('Failed to load admin profile:', err);
      showToast('error', 'Unable to load profile data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  // Compute dirty state
  const isDirty = useMemo(() => {
    return (
      formData.firstName !== initialData.firstName ||
      formData.lastName !== initialData.lastName ||
      formData.email !== initialData.email ||
      formData.phone !== initialData.phone ||
      formData.jobTitle !== initialData.jobTitle ||
      formData.department !== initialData.department
    );
  }, [formData, initialData]);

  // Unsaved changes browser prompt
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved profile changes.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Discard changes
  const handleReset = () => {
    setFormData(initialData);
  };

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!isDirty) return;

    // Validation
    const cleanFirstName = formData.firstName.trim();
    if (!cleanFirstName || cleanFirstName.length < 2) {
      showToast('error', 'First name must be at least 2 characters long.');
      return;
    }

    const cleanEmail = formData.email.trim();
    if (!cleanEmail || !/\S+@\S+\.\S+/.test(cleanEmail)) {
      showToast('error', 'Please enter a valid email address.');
      return;
    }

    setSavingProfile(true);
    setProfileSaved(false);

    try {
      const payload = {
        first_name: cleanFirstName,
        last_name: formData.lastName.trim(),
        name: `${cleanFirstName} ${formData.lastName.trim()}`.trim(),
        email: cleanEmail,
        phone: formData.phone.trim(),
        job_title: formData.jobTitle.trim(),
        department: formData.department.trim()
      };

      const res = await adminProfileService.updateProfile(payload);
      if (res && res.success && res.data) {
        setInitialData({
          firstName: res.data.first_name,
          lastName: res.data.last_name,
          email: res.data.email,
          phone: res.data.phone,
          jobTitle: res.data.job_title,
          department: res.data.department
        });
        updateAdmin(res.data);
        setProfileSaved(true);
        showToast('success', 'Profile updated successfully.');
        setTimeout(() => setProfileSaved(false), 3000);
      } else {
        showToast('error', res.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      const msg = err.response?.data?.message || 'Server error updating profile.';
      showToast('error', msg);
    } finally {
      setSavingProfile(false);
    }
  };

  // Avatar Upload Handler
  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Avatar file size must be less than 2MB.');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('error', 'Allowed image formats: JPG, PNG, WEBP.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append('avatar', file);

      const res = await adminProfileService.uploadAvatar(uploadForm);
      if (res && res.success && res.data) {
        updateAdmin({ avatar: res.data.avatar_url, avatar_raw: res.data.avatar_raw });
        showToast('success', 'Profile photo updated successfully.');
      } else {
        showToast('error', res.message || 'Avatar upload failed.');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      showToast('error', err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove Avatar Handler
  const handleRemoveAvatar = async () => {
    setRemovingAvatar(true);
    try {
      const res = await adminProfileService.removeAvatar();
      if (res && res.success) {
        updateAdmin({ avatar: null, avatar_raw: null });
        setShowRemoveAvatarModal(false);
        showToast('success', 'Profile photo removed.');
      } else {
        showToast('error', res.message || 'Failed to remove photo.');
      }
    } catch (err) {
      console.error('Remove avatar error:', err);
      showToast('error', 'Could not remove avatar photo.');
    } finally {
      setRemovingAvatar(false);
    }
  };

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    const pwd = passwordData.newPassword;
    if (!pwd) return { score: 0, label: '', color: '' };

    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', class: 'weak' };
    if (score === 2 || score === 3) return { score: 2, label: 'Fair', class: 'fair' };
    if (score === 4) return { score: 3, label: 'Good', class: 'good' };
    return { score: 4, label: 'Strong', class: 'strong' };
  }, [passwordData.newPassword]);

  // Change Password Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!passwordData.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (!passwordData.newPassword || passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    if (passwordData.newPassword === passwordData.currentPassword) {
      setPasswordError('New password cannot be identical to your current password.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await adminProfileService.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        confirm_password: passwordData.confirmPassword
      });

      if (res && res.success) {
        showToast('success', 'Password updated successfully.');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordError(res.message || 'Failed to update password.');
      }
    } catch (err) {
      console.error('Password change error:', err);
      setPasswordError(err.response?.data?.message || 'Error updating password. Please check your current password.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Never';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Skeleton Loading View
  if (loading && !currentAdmin) {
    return (
      <div className="profile-page-container">
        <div className="profile-page-header">
          <div className="profile-header-left">
            <div className="skeleton-line" style={{ width: '160px', height: '24px', marginBottom: '8px' }}></div>
            <div className="skeleton-line" style={{ width: '280px', height: '16px' }}></div>
          </div>
        </div>
        <div className="profile-skeleton-hero">
          <div className="skeleton-avatar"></div>
          <div style={{ flex: 1 }}>
            <div className="skeleton-line" style={{ width: '220px', height: '26px', marginBottom: '12px' }}></div>
            <div className="skeleton-line" style={{ width: '180px', height: '16px', marginBottom: '8px' }}></div>
            <div className="skeleton-line" style={{ width: '120px', height: '16px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const adminName = currentAdmin?.name || `${formData.firstName} ${formData.lastName}`.trim() || 'Administrator';
  const adminEmail = currentAdmin?.email || formData.email || '';
  const adminRole = currentAdmin?.role_label || 'Super Admin';
  const adminCode = currentAdmin?.admin_code || `ADM-${String(currentAdmin?.id || 1).padStart(3, '0')}`;
  const memberSince = currentAdmin?.created_at ? formatDate(currentAdmin.created_at) : '01 Sep 2026';
  const lastLoginFormatted = currentAdmin?.last_login ? formatDateTime(currentAdmin.last_login) : 'Recently';

  return (
    <div className="profile-page-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`profile-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/png,image/jpeg,image/webp"
        onChange={handleAvatarSelect}
      />

      {/* Page Header */}
      <header className="profile-page-header">
        <div className="profile-header-left">
          <h1>
            <User style={{ color: '#087F73' }} />
            Profile
          </h1>
          <p>
            Manage your administrator account, personal information, password and security preferences.
          </p>
        </div>

        <div className="profile-header-actions">
          <button
            type="button"
            className="btn-profile btn-profile-secondary"
            onClick={() => {
              setShowPasswordModal(true);
              setPasswordError('');
            }}
          >
            <Key size={16} />
            Change Password
          </button>
        </div>
      </header>

      {/* ============================================================
          HERO PROFILE CARD
         ============================================================ */}
      <section className="profile-hero-card">
        <div className="profile-hero-background-accent" />

        <div className="profile-hero-body">
          <div className="profile-hero-user-cluster">
            {/* Circular Avatar */}
            <div className="profile-avatar-wrapper">
              {currentAdmin?.avatar ? (
                <img
                  src={currentAdmin.avatar}
                  alt={adminName}
                  className="profile-avatar-img"
                />
              ) : (
                <div className="profile-avatar-initials">
                  {currentAdmin?.initials || 'A'}
                </div>
              )}

              {/* Upload Photo Button */}
              <button
                type="button"
                className="profile-avatar-overlay-btn"
                title="Change Profile Photo"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Upload profile photo"
              >
                <Camera size={16} />
              </button>

              {/* Remove Photo Button */}
              {currentAdmin?.avatar && (
                <button
                  type="button"
                  className="profile-avatar-remove-btn"
                  title="Remove Profile Photo"
                  onClick={() => setShowRemoveAvatarModal(true)}
                  aria-label="Remove profile photo"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {/* Admin Details */}
            <div className="profile-hero-details">
              <h2 className="profile-hero-name">
                {adminName}
                <span className="badge-role-tag">{adminRole}</span>
                <span className="badge-status-active">Active</span>
              </h2>

              <div className="profile-hero-meta">
                <span className="profile-meta-item">
                  <Mail size={15} style={{ color: '#087F73' }} />
                  {adminEmail}
                </span>

                {formData.phone && (
                  <span className="profile-meta-item">
                    <Phone size={15} style={{ color: '#087F73' }} />
                    {formData.phone}
                  </span>
                )}

                <span className="profile-meta-item">
                  <Calendar size={15} style={{ color: '#64748b' }} />
                  Member since {memberSince}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          MAIN 2-COLUMN GRID
         ============================================================ */}
      <div className="profile-content-grid">
        {/* LEFT COLUMN: Personal Info Form */}
        <div className="profile-main-col">
          <form className="profile-card" onSubmit={handleSaveProfile}>
            <div className="profile-card-header">
              <div>
                <h3 className="profile-card-title">
                  <User size={18} style={{ color: '#087F73' }} />
                  Personal Information
                </h3>
                <p className="profile-card-desc">
                  Update your personal contact coordinates and professional organizational details.
                </p>
              </div>

              {isDirty && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#d97706' }}>
                  ● Unsaved changes
                </span>
              )}
            </div>

            <div className="profile-form-grid">
              <div className="profile-form-group">
                <label className="profile-label">
                  First Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="profile-input"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>

              <div className="profile-form-group">
                <label className="profile-label">Last Name</label>
                <input
                  type="text"
                  className="profile-input"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Last name"
                />
              </div>

              <div className="profile-form-group">
                <label className="profile-label">
                  Email Address <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  className="profile-input"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="admin@medicareplus.com"
                  required
                />
                <span className="profile-help-text">Used for administrator login and security alerts.</span>
              </div>

              <div className="profile-form-group">
                <label className="profile-label">Phone Number</label>
                <input
                  type="tel"
                  className="profile-input"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                />
                <span className="profile-help-text">Contact phone number for operational communications.</span>
              </div>

              <div className="profile-form-group">
                <label className="profile-label">Job Title / Role</label>
                <input
                  type="text"
                  className="profile-input"
                  value={formData.jobTitle}
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  placeholder="e.g. Chief Pharmacy Officer"
                />
              </div>

              <div className="profile-form-group">
                <label className="profile-label">Department</label>
                <input
                  type="text"
                  className="profile-input"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="e.g. Pharmacy Operations"
                />
              </div>
            </div>

            <div className="profile-form-actions">
              <button
                type="button"
                className="btn-profile btn-profile-secondary"
                onClick={handleReset}
                disabled={!isDirty || savingProfile}
              >
                <RotateCcw size={15} />
                Reset
              </button>

              <button
                type="submit"
                className="btn-profile btn-profile-primary"
                disabled={!isDirty || savingProfile}
              >
                {profileSaved ? (
                  <>
                    <Check size={16} />
                    Saved ✓
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Activity / Session Card */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div>
                <h3 className="profile-card-title">
                  <Activity size={18} style={{ color: '#087F73' }} />
                  Recent Authentication & System Activity
                </h3>
                <p className="profile-card-desc">
                  Real authentication logs and security events recorded for your administrator ID.
                </p>
              </div>
            </div>

            <div className="activity-timeline">
              {activities.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '13px', padding: '12px 0' }}>
                  No recent security events recorded.
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="activity-item">
                    <div className={`activity-bullet ${act.status === 'active' ? 'active' : ''}`} />
                    <div className="activity-content">
                      <div className="activity-title">{act.title}</div>
                      <div className="activity-desc">
                        {act.description} &bull; <strong style={{ color: '#475569' }}>{act.device}</strong>
                      </div>
                      <div className="activity-timestamp">
                        {formatDateTime(act.timestamp)} (IP: {act.ip_address})
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Account Specs & Security */}
        <div className="profile-side-col">
          {/* Account Details Card */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div>
                <h3 className="profile-card-title">
                  <Shield size={18} style={{ color: '#087F73' }} />
                  Account Information
                </h3>
                <p className="profile-card-desc">System-assigned identifiers and permissions.</p>
              </div>
            </div>

            <div className="account-specs-list">
              <div className="account-spec-item">
                <span className="account-spec-label">
                  <Layers size={14} />
                  Administrator ID
                </span>
                <span className="account-spec-value" style={{ fontFamily: 'monospace' }}>
                  {adminCode}
                </span>
              </div>

              <div className="account-spec-item">
                <span className="account-spec-label">
                  <Briefcase size={14} />
                  Assigned Role
                </span>
                <span className="account-spec-value">
                  {adminRole}
                </span>
              </div>

              <div className="account-spec-item">
                <span className="account-spec-label">
                  <Activity size={14} />
                  Account Status
                </span>
                <span className="badge-status-active">
                  {currentAdmin?.status || 'Active'}
                </span>
              </div>

              <div className="account-spec-item">
                <span className="account-spec-label">
                  <Calendar size={14} />
                  Account Created
                </span>
                <span className="account-spec-value">
                  {formatDate(currentAdmin?.created_at)}
                </span>
              </div>

              <div className="account-spec-item">
                <span className="account-spec-label">
                  <Clock size={14} />
                  Last Login
                </span>
                <span className="account-spec-value">
                  {lastLoginFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Security & Password Card */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div>
                <h3 className="profile-card-title">
                  <Lock size={18} style={{ color: '#087F73' }} />
                  Password & Security
                </h3>
                <p className="profile-card-desc">Keep your administrator access credentials secure.</p>
              </div>
            </div>

            <div className="security-status-box">
              <div className="security-status-info">
                <h4>Password</h4>
                <p style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>••••••••••••</p>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Last modified: {formatDate(currentAdmin?.updated_at || currentAdmin?.created_at)}
                </span>
              </div>

              <button
                type="button"
                className="btn-profile btn-profile-secondary"
                onClick={() => {
                  setShowPasswordModal(true);
                  setPasswordError('');
                }}
              >
                <Key size={14} />
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          CHANGE PASSWORD MODAL
         ============================================================ */}
      {showPasswordModal && (
        <div className="profile-modal-backdrop" onClick={() => setShowPasswordModal(false)}>
          <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>
                <Key size={18} style={{ color: '#087F73' }} />
                Change Password
              </h3>
              <button
                type="button"
                className="profile-modal-close-btn"
                onClick={() => setShowPasswordModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="profile-modal-body">
                {passwordError && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{passwordError}</span>
                  </div>
                )}

                {/* Current Password */}
                <div className="profile-form-group">
                  <label className="profile-label">Current Password</label>
                  <div className="password-field-wrapper">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      className="profile-input"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                    >
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="profile-form-group">
                  <label className="profile-label">New Password</label>
                  <div className="password-field-wrapper">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      className="profile-input"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Minimum 8 characters"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPass(!showNewPass)}
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Meter */}
                {passwordData.newPassword && (
                  <div className="password-strength-container">
                    <div className="password-strength-bars">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`strength-bar ${step <= passwordStrength.score ? passwordStrength.class : ''}`}
                        />
                      ))}
                    </div>
                    <div className="strength-label">
                      <span>Strength: {passwordStrength.label}</span>
                      <span>Min 8 characters</span>
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                <div className="profile-form-group">
                  <label className="profile-label">Confirm New Password</label>
                  <div className="password-field-wrapper">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      className="profile-input"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Re-enter new password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="profile-modal-footer">
                <button
                  type="button"
                  className="btn-profile btn-profile-secondary"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={changingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-profile btn-profile-primary"
                  disabled={changingPassword}
                >
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          REMOVE AVATAR CONFIRMATION MODAL
         ============================================================ */}
      {showRemoveAvatarModal && (
        <div className="profile-modal-backdrop" onClick={() => setShowRemoveAvatarModal(false)}>
          <div className="profile-modal-card" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Remove Profile Photo?</h3>
              <button
                type="button"
                className="profile-modal-close-btn"
                onClick={() => setShowRemoveAvatarModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="profile-modal-body">
              <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', lineHeight: 1.5 }}>
                Are you sure you want to remove your profile photo? Your initials will be displayed instead.
              </p>
            </div>

            <div className="profile-modal-footer">
              <button
                type="button"
                className="btn-profile btn-profile-secondary"
                onClick={() => setShowRemoveAvatarModal(false)}
                disabled={removingAvatar}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-profile btn-profile-danger"
                onClick={handleRemoveAvatar}
                disabled={removingAvatar}
              >
                {removingAvatar ? 'Removing...' : 'Remove Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
