import React, { useState, useEffect, useMemo } from 'react';
import {
  FiSettings,
  FiSave,
  FiRotateCcw,
  FiRefreshCw,
  FiSearch,
  FiCheckCircle,
  FiAlertCircle,
  FiUpload,
  FiTrash2,
  FiInfo,
  FiLock,
  FiEye,
  FiEyeOff,
  FiClock,
  FiShoppingBag,
  FiTruck,
  FiCreditCard,
  FiPercent,
  FiTag,
  FiBox,
  FiStar,
  FiUserCheck,
  FiMail,
  FiBell,
  FiShield,
  FiGlobe,
  FiDroplet,
  FiAlertTriangle
} from 'react-icons/fi';
import { adminSettingsService } from '../../../services/adminApi';
import './AdminSettings.css';

// Navigation category structure
const SETTING_NAV_GROUPS = [
  {
    heading: 'General',
    items: [
      { id: 'general', label: 'General Settings', icon: <FiSettings /> },
      { id: 'store', label: 'Store Information', icon: <FiInfo /> },
      { id: 'contact', label: 'Contact & Social', icon: <FiGlobe /> },
      { id: 'hours', label: 'Business Hours', icon: <FiClock /> },
    ]
  },
  {
    heading: 'Commerce',
    items: [
      { id: 'orders', label: 'Order Rules', icon: <FiShoppingBag /> },
      { id: 'payments', label: 'Payments & COD', icon: <FiCreditCard /> },
      { id: 'shipping', label: 'Shipping & Delivery', icon: <FiTruck /> },
      { id: 'tax', label: 'Tax & GST', icon: <FiPercent /> },
      { id: 'coupons', label: 'Coupons Engine', icon: <FiTag /> },
      { id: 'inventory', label: 'Inventory Rules', icon: <FiBox /> },
    ]
  },
  {
    heading: 'Customer & Content',
    items: [
      { id: 'customer', label: 'Customer Account', icon: <FiUserCheck /> },
      { id: 'reviews', label: 'Reviews & Ratings', icon: <FiStar /> },
      { id: 'notifications', label: 'Admin Notifications', icon: <FiBell /> },
      { id: 'email', label: 'Email & SMTP', icon: <FiMail /> },
    ]
  },
  {
    heading: 'System & Security',
    items: [
      { id: 'security', label: 'Security & Auth', icon: <FiShield /> },
      { id: 'seo', label: 'SEO & Metadata', icon: <FiGlobe /> },
      { id: 'appearance', label: 'Appearance & Theme', icon: <FiDroplet /> },
      { id: 'maintenance', label: 'Maintenance Mode', icon: <FiAlertTriangle /> },
    ]
  }
];

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialSettings, setInitialSettings] = useState({});
  const [formSettings, setFormSettings] = useState({});
  const [toast, setToast] = useState(null);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  // Fetch settings from API
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await adminSettingsService.getSettings();
      if (res && res.success && res.data) {
        // Flat map of key -> value
        const flat = res.data.settings_flat || {};
        setInitialSettings(flat);
        setFormSettings(flat);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      showToast('error', 'Failed to load settings from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Compute dirty keys
  const dirtyKeys = useMemo(() => {
    const dirty = [];
    Object.keys(formSettings).forEach((key) => {
      let cur = formSettings[key];
      let init = initialSettings[key];

      // Handle JSON objects like business hours
      if (typeof cur === 'object' && cur !== null) {
        if (JSON.stringify(cur) !== JSON.stringify(init)) {
          dirty.push(key);
        }
      } else if (cur !== init) {
        dirty.push(key);
      }
    });
    return dirty;
  }, [formSettings, initialSettings]);

  const isDirty = dirtyKeys.length > 0;

  // Warn on browser unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Leave without saving?';
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

  // Field change handler
  const handleChange = (key, value) => {
    setFormSettings((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  // Toggle boolean handler
  const handleToggle = (key) => {
    setFormSettings((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Business Hours day change
  const handleHoursChange = (day, field, value) => {
    const currentHours = formSettings.business_hours || {};
    const updatedDay = {
      ...(currentHours[day] || { is_closed: false, open: '09:00', close: '21:00' }),
      [field]: value
    };
    const updated = {
      ...currentHours,
      [day]: updatedDay
    };
    handleChange('business_hours', updated);
  };

  // Reset changes
  const handleReset = () => {
    if (isDirty) {
      if (window.confirm('Discard unsaved changes and restore saved settings?')) {
        setFormSettings(initialSettings);
        showToast('info', 'Unsaved changes discarded.');
      }
    } else {
      setFormSettings(initialSettings);
    }
  };

  // Save Settings
  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      // Send changed keys only
      const payload = {};
      dirtyKeys.forEach((k) => {
        payload[k] = formSettings[k];
      });

      const res = await adminSettingsService.updateSettings(payload);
      if (res && res.success) {
        showToast('success', '✓ Settings saved successfully.');
        // Refresh state
        setInitialSettings({ ...formSettings });
        // Dispatch window event so customer website and local context immediately sync!
        window.dispatchEvent(new CustomEvent('medicare_settings_updated', {
          detail: { updated_keys: dirtyKeys }
        }));
      } else {
        showToast('error', res.message || 'Failed to save settings.');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      showToast('error', 'Error saving settings to server.');
    } finally {
      setSaving(false);
    }
  };

  // Logo / Favicon Upload
  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isLogo = type === 'logo';
    if (isLogo) setUploadingLogo(true);
    else setUploadingFavicon(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await adminSettingsService.uploadAsset(formData);
      if (res && res.success && res.data) {
        const fileUrl = res.data.file_url;
        const key = isLogo ? 'store_logo' : 'store_favicon';
        handleChange(key, fileUrl);
        showToast('success', `${isLogo ? 'Logo' : 'Favicon'} uploaded successfully.`);
      } else {
        showToast('error', res.message || 'Upload failed.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('error', 'File upload failed. Ensure image is PNG, JPG, or WEBP under 2MB.');
    } finally {
      if (isLogo) setUploadingLogo(false);
      else setUploadingFavicon(false);
    }
  };

  // Helper toggle switch renderer
  const renderToggle = (key, label, subtext) => {
    const checked = Boolean(formSettings[key]);
    return (
      <div className="settings-toggle-row">
        <div className="settings-toggle-info">
          <span className="settings-toggle-label">{label}</span>
          {subtext && <span className="settings-toggle-sub">{subtext}</span>}
        </div>
        <label className="settings-switch" aria-label={label}>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => handleToggle(key)}
          />
          <span className="settings-slider"></span>
        </label>
      </div>
    );
  };

  // Render Skeleton while loading
  if (loading) {
    return (
      <div className="settings-container">
        <div className="settings-header">
          <div className="settings-header-left">
            <div className="skeleton-line skeleton-title"></div>
            <div className="skeleton-line" style={{ width: '60%' }}></div>
          </div>
        </div>
        <div className="settings-main-layout">
          <div className="settings-sidebar">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-line skeleton-block"></div>
            ))}
          </div>
          <div className="settings-content-panel">
            <div className="settings-skeleton-card">
              <div className="skeleton-line skeleton-title"></div>
              <div className="skeleton-line skeleton-block"></div>
              <div className="skeleton-line skeleton-block"></div>
              <div className="skeleton-line skeleton-block"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`settings-toast ${toast.type}`}>
          {toast.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Settings Header */}
      <header className="settings-header">
        <div className="settings-header-left">
          <h1>
            <FiSettings style={{ color: '#087F73' }} />
            Settings
          </h1>
          <p>
            Manage your Medicare PLUS store, checkout, notifications, security and system preferences.
          </p>
        </div>

        <div className="settings-header-actions">
          {/* Dirty changes indicator */}
          {isDirty && (
            <span className="dirty-indicator">
              ● {dirtyKeys.length} unsaved change{dirtyKeys.length > 1 ? 's' : ''}
            </span>
          )}

          {/* Search bar */}
          <div className="settings-search-box">
            <FiSearch className="settings-search-icon" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            className="btn-settings btn-settings-secondary"
            onClick={fetchSettings}
            title="Refresh settings from server"
          >
            <FiRefreshCw />
            Refresh
          </button>

          {/* Reset Button */}
          <button
            type="button"
            className="btn-settings btn-settings-secondary"
            onClick={handleReset}
            disabled={!isDirty || saving}
            title="Discard unsaved changes"
          >
            <FiRotateCcw />
            Reset
          </button>

          {/* Save Changes Button */}
          <button
            type="button"
            className="btn-settings btn-settings-primary"
            onClick={handleSave}
            disabled={!isDirty || saving}
            title="Persist changes to database"
          >
            <FiSave />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="settings-main-layout">
        {/* Left Sidebar Navigation */}
        <aside className="settings-sidebar">
          {SETTING_NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="settings-nav-group">
              <h3 className="settings-nav-heading">{group.heading}</h3>
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                // Check if any keys in this tab are dirty
                const hasDirty = dirtyKeys.some((k) => {
                  // Rough match with tab prefix
                  return k.startsWith(item.id) || 
                    (item.id === 'payments' && (k.includes('cod') || k.includes('razorpay'))) ||
                    (item.id === 'hours' && k.includes('hours')) ||
                    (item.id === 'contact' && (k.includes('social') || k.includes('support') || k.includes('instagram') || k.includes('facebook')));
                });

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`settings-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <div className="settings-nav-item-content">
                      <span className="settings-nav-item-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {hasDirty && <span className="settings-nav-badge" title="Unsaved changes in this section" />}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Right Settings Content */}
        <main className="settings-content-panel">
          {/* ============================================================
              1. GENERAL SETTINGS
             ============================================================ */}
          {activeTab === 'general' && (
            <>
              <div className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h2 className="settings-card-title">General Settings</h2>
                    <p className="settings-card-desc">Basic store identity, regional localization, and format preferences.</p>
                  </div>
                </div>

                <div className="settings-form-grid">
                  <div className="settings-form-group">
                    <label className="settings-label">
                      Store Name
                      <span className="settings-badge-public">Public</span>
                    </label>
                    <input
                      type="text"
                      className="settings-input"
                      value={formSettings.store_name || ''}
                      onChange={(e) => handleChange('store_name', e.target.value)}
                    />
                    <span className="settings-help-text">Visible in customer header, emails, and browser title bar.</span>
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">
                      Store Tagline
                      <span className="settings-badge-public">Public</span>
                    </label>
                    <input
                      type="text"
                      className="settings-input"
                      value={formSettings.store_tagline || ''}
                      onChange={(e) => handleChange('store_tagline', e.target.value)}
                    />
                    <span className="settings-help-text">Catchphrase displayed alongside the store name.</span>
                  </div>

                  <div className="settings-form-group col-span-2">
                    <label className="settings-label">Store Description</label>
                    <textarea
                      className="settings-textarea"
                      value={formSettings.store_description || ''}
                      onChange={(e) => handleChange('store_description', e.target.value)}
                    />
                    <span className="settings-help-text">Brief summary of Medicare PLUS displayed in footer and about sections.</span>
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Default Currency</label>
                    <select
                      className="settings-select"
                      value={formSettings.currency || 'INR'}
                      onChange={(e) => handleChange('currency', e.target.value)}
                    >
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                    </select>
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Currency Symbol</label>
                    <input
                      type="text"
                      className="settings-input"
                      value={formSettings.currency_symbol || '₹'}
                      onChange={(e) => handleChange('currency_symbol', e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Timezone</label>
                    <select
                      className="settings-select"
                      value={formSettings.timezone || 'Asia/Kolkata'}
                      onChange={(e) => handleChange('timezone', e.target.value)}
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                      <option value="UTC">UTC (Universal Time Coordinated)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    </select>
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Language</label>
                    <select
                      className="settings-select"
                      value={formSettings.language || 'en'}
                      onChange={(e) => handleChange('language', e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi (हिंदी)</option>
                      <option value="bn">Bengali (বাংলা)</option>
                      <option value="es">Spanish</option>
                    </select>
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Date Format</label>
                    <select
                      className="settings-select"
                      value={formSettings.date_format || 'DD/MM/YYYY'}
                      onChange={(e) => handleChange('date_format', e.target.value)}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 05/10/2026)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/05/2026)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-10-05)</option>
                    </select>
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Time Format</label>
                    <select
                      className="settings-select"
                      value={formSettings.time_format || '12'}
                      onChange={(e) => handleChange('time_format', e.target.value)}
                    >
                      <option value="12">12 Hour (02:30 PM)</option>
                      <option value="24">24 Hour (14:30)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Brand Logo & Favicon Card */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h2 className="settings-card-title">Brand Assets (Logo & Favicon)</h2>
                    <p className="settings-card-desc">Uploaded assets are automatically displayed across the customer header, footer, and browser tab.</p>
                  </div>
                </div>

                <div className="settings-form-grid">
                  {/* Logo Upload */}
                  <div className="settings-form-group">
                    <label className="settings-label">Store Logo</label>
                    <div className="media-upload-container">
                      <div className="media-preview-box">
                        {formSettings.store_logo ? (
                          <img src={formSettings.store_logo} alt="Store Logo Preview" />
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>No Logo</span>
                        )}
                      </div>
                      <div className="media-upload-actions">
                        <input
                          type="file"
                          id="logo-upload"
                          style={{ display: 'none' }}
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={(e) => handleFileUpload(e, 'logo')}
                        />
                        <button
                          type="button"
                          className="btn-settings btn-settings-secondary"
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          disabled={uploadingLogo}
                        >
                          <FiUpload />
                          {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                        </button>
                        {formSettings.store_logo && (
                          <button
                            type="button"
                            className="btn-settings btn-settings-secondary"
                            style={{ color: '#dc2626' }}
                            onClick={() => handleChange('store_logo', '')}
                          >
                            <FiTrash2 />
                            Remove Logo
                          </button>
                        )}
                        <span className="settings-help-text">Max 2MB. Recommended: PNG or SVG with transparent background.</span>
                      </div>
                    </div>
                  </div>

                  {/* Favicon Upload */}
                  <div className="settings-form-group">
                    <label className="settings-label">Favicon Icon</label>
                    <div className="media-upload-container">
                      <div className="media-preview-box" style={{ width: '80px', height: '80px' }}>
                        {formSettings.store_favicon ? (
                          <img src={formSettings.store_favicon} alt="Favicon Preview" style={{ width: '32px', height: '32px' }} />
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>No Icon</span>
                        )}
                      </div>
                      <div className="media-upload-actions">
                        <input
                          type="file"
                          id="favicon-upload"
                          style={{ display: 'none' }}
                          accept="image/png,image/x-icon,image/svg+xml"
                          onChange={(e) => handleFileUpload(e, 'favicon')}
                        />
                        <button
                          type="button"
                          className="btn-settings btn-settings-secondary"
                          onClick={() => document.getElementById('favicon-upload')?.click()}
                          disabled={uploadingFavicon}
                        >
                          <FiUpload />
                          {uploadingFavicon ? 'Uploading...' : 'Upload Favicon'}
                        </button>
                        {formSettings.store_favicon && (
                          <button
                            type="button"
                            className="btn-settings btn-settings-secondary"
                            style={{ color: '#dc2626' }}
                            onClick={() => handleChange('store_favicon', '')}
                          >
                            <FiTrash2 />
                            Remove
                          </button>
                        )}
                        <span className="settings-help-text">Square icon (32x32 or 64x64 px).</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ============================================================
              2. STORE INFORMATION
             ============================================================ */}
          {activeTab === 'store' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Store & Legal Information</h2>
                  <p className="settings-card-desc">Registered enterprise details, statutory license numbers, and official business contacts.</p>
                </div>
              </div>

              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-label">Legal Business Name</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={formSettings.legal_business_name || ''}
                    onChange={(e) => handleChange('legal_business_name', e.target.value)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Website URL</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={formSettings.website_url || ''}
                    onChange={(e) => handleChange('website_url', e.target.value)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">
                    Business Registration / CIN
                    <span className="settings-badge-private">Private</span>
                  </label>
                  <input
                    type="text"
                    className="settings-input"
                    value={formSettings.business_registration_number || ''}
                    onChange={(e) => handleChange('business_registration_number', e.target.value)}
                  />
                  <span className="settings-help-text">Corporate Identity Number or MSME registration.</span>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">
                    GST Number
                    <span className="settings-badge-private">Private</span>
                  </label>
                  <input
                    type="text"
                    className="settings-input"
                    value={formSettings.gst_number || ''}
                    onChange={(e) => handleChange('gst_number', e.target.value)}
                  />
                  <span className="settings-help-text">15-digit GSTIN used for tax invoicing.</span>
                </div>

                <div className="settings-form-group col-span-2">
                  <label className="settings-label">
                    Pharmacy Drug License Number (Form 20/21)
                    <span className="settings-badge-public">Public</span>
                  </label>
                  <input
                    type="text"
                    className="settings-input"
                    value={formSettings.pharmacy_license_number || ''}
                    onChange={(e) => handleChange('pharmacy_license_number', e.target.value)}
                  />
                  <span className="settings-help-text">Mandatory retail drug license displayed to customers for compliance.</span>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Store Email</label>
                  <input
                    type="email"
                    className="settings-input"
                    value={formSettings.store_email || ''}
                    onChange={(e) => handleChange('store_email', e.target.value)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Store Phone</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={formSettings.store_phone || ''}
                    onChange={(e) => handleChange('store_phone', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              3. CONTACT & SOCIAL SETTINGS
             ============================================================ */}
          {activeTab === 'contact' && (
            <>
              <div className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h2 className="settings-card-title">Customer Support & Physical Address</h2>
                    <p className="settings-card-desc">Customer contact coordinates rendered dynamically on the customer footer and contact page.</p>
                  </div>
                </div>

                <div className="settings-form-grid">
                  <div className="settings-form-group">
                    <label className="settings-label">Support Email</label>
                    <input
                      type="email"
                      className="settings-input"
                      value={formSettings.support_email || ''}
                      onChange={(e) => handleChange('support_email', e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Support Phone</label>
                    <input
                      type="text"
                      className="settings-input"
                      value={formSettings.support_phone || ''}
                      onChange={(e) => handleChange('support_phone', e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">WhatsApp Support Number</label>
                    <input
                      type="text"
                      className="settings-input"
                      value={formSettings.whatsapp_number || ''}
                      onChange={(e) => handleChange('whatsapp_number', e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Support Hours</label>
                    <input
                      type="text"
                      className="settings-input"
                      placeholder="e.g. Mon - Sat: 9:00 AM - 9:00 PM"
                      value={formSettings.support_hours || ''}
                      onChange={(e) => handleChange('support_hours', e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group col-span-2">
                    <label className="settings-label">Physical Address</label>
                    <input
                      type="text"
                      className="settings-input"
                      value={formSettings.business_address || ''}
                      onChange={(e) => handleChange('business_address', e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">City</label>
                    <input
                      type="text"
                      className="settings-input"
                      value={formSettings.city || ''}
                      onChange={(e) => handleChange('city', e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">State</label>
                    <input
                      type="text"
                      className="settings-input"
                      value={formSettings.state || ''}
                      onChange={(e) => handleChange('state', e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Postal Code</label>
                    <input
                      type="text"
                      className="settings-input"
                      value={formSettings.postal_code || ''}
                      onChange={(e) => handleChange('postal_code', e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Google Maps URL</label>
                    <input
                      type="url"
                      className="settings-input"
                      placeholder="https://maps.google.com/..."
                      value={formSettings.google_maps_url || ''}
                      onChange={(e) => handleChange('google_maps_url', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Social Channels Card */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h2 className="settings-card-title">Social Media Profiles</h2>
                    <p className="settings-card-desc">Social links shown in the customer footer. Empty URLs will automatically hide the corresponding icon.</p>
                  </div>
                </div>

                <div className="settings-form-grid">
                  <div className="settings-form-group">
                    <label className="settings-label">Instagram URL</label>
                    <input
                      type="url"
                      className="settings-input"
                      placeholder="https://instagram.com/medicareplus"
                      value={formSettings.social_instagram || ''}
                      onChange={(e) => handleChange('social_instagram', e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Facebook URL</label>
                    <input
                      type="url"
                      className="settings-input"
                      placeholder="https://facebook.com/medicareplus"
                      value={formSettings.social_facebook || ''}
                      onChange={(e) => handleChange('social_facebook', e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">X / Twitter URL</label>
                    <input
                      type="url"
                      className="settings-input"
                      placeholder="https://x.com/medicareplus"
                      value={formSettings.social_twitter || ''}
                      onChange={(e) => handleChange('social_twitter', e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">LinkedIn URL</label>
                    <input
                      type="url"
                      className="settings-input"
                      placeholder="https://linkedin.com/company/medicareplus"
                      value={formSettings.social_linkedin || ''}
                      onChange={(e) => handleChange('social_linkedin', e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">YouTube URL</label>
                    <input
                      type="url"
                      className="settings-input"
                      placeholder="https://youtube.com/@medicareplus"
                      value={formSettings.social_youtube || ''}
                      onChange={(e) => handleChange('social_youtube', e.target.value)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">WhatsApp Community URL</label>
                    <input
                      type="url"
                      className="settings-input"
                      placeholder="https://chat.whatsapp.com/..."
                      value={formSettings.social_whatsapp || ''}
                      onChange={(e) => handleChange('social_whatsapp', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ============================================================
              4. BUSINESS HOURS
             ============================================================ */}
          {activeTab === 'hours' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Store Business & Delivery Hours</h2>
                  <p className="settings-card-desc">Configure the weekly operating schedule. Orders placed outside operating hours can be handled with notification.</p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Status</th>
                      <th>Opening Time</th>
                      <th>Closing Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                      const daySchedule = formSettings.business_hours?.[day] || {
                        is_closed: day === 'sunday',
                        open: '09:00',
                        close: '21:00'
                      };

                      return (
                        <tr key={day}>
                          <td className="schedule-day-cell">
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </td>
                          <td>
                            <label className="settings-switch" style={{ width: '42px', height: '22px' }}>
                              <input
                                type="checkbox"
                                checked={!daySchedule.is_closed}
                                onChange={(e) => handleHoursChange(day, 'is_closed', !e.target.checked)}
                              />
                              <span className="settings-slider" style={{ borderRadius: '22px' }}></span>
                            </label>
                            <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 600, color: daySchedule.is_closed ? '#dc2626' : '#059669' }}>
                              {daySchedule.is_closed ? 'Closed' : 'Open'}
                            </span>
                          </td>
                          <td>
                            <input
                              type="time"
                              className="schedule-time-input"
                              disabled={daySchedule.is_closed}
                              value={daySchedule.open || '09:00'}
                              onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="time"
                              className="schedule-time-input"
                              disabled={daySchedule.is_closed}
                              value={daySchedule.close || '21:00'}
                              onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================
              5. ORDER SETTINGS
             ============================================================ */}
          {activeTab === 'orders' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Order Processing Rules</h2>
                  <p className="settings-card-desc">Control minimum order limits, customer cancellations, and fulfillment workflows.</p>
                </div>
              </div>

              <div className="settings-form-grid" style={{ marginBottom: '20px' }}>
                <div className="settings-form-group">
                  <label className="settings-label">Minimum Order Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="settings-input"
                    value={formSettings.min_order_amount ?? 100}
                    onChange={(e) => handleChange('min_order_amount', parseFloat(e.target.value) || 0)}
                  />
                  <span className="settings-help-text">Carts with subtotal below this cannot proceed to checkout.</span>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Maximum Order Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="settings-input"
                    value={formSettings.max_order_amount ?? 50000}
                    onChange={(e) => handleChange('max_order_amount', parseFloat(e.target.value) || 0)}
                  />
                  <span className="settings-help-text">Protects against fraudulent high-value bulk purchases.</span>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Customer Cancellation Window (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    className="settings-input"
                    value={formSettings.cancellation_time_limit ?? 30}
                    onChange={(e) => handleChange('cancellation_time_limit', parseInt(e.target.value, 10) || 0)}
                  />
                  <span className="settings-help-text">Minutes after placing order within which customer can cancel online.</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {renderToggle('enable_order_cancellation', 'Allow Order Cancellation', 'Permit customers to cancel their own orders before dispatch.')}
                {renderToggle('allow_order_tracking', 'Allow Customer Order Tracking', 'Provide live step-by-step dispatch tracking in the customer dashboard.')}
                {renderToggle('allow_order_notes', 'Allow Order Delivery Notes', 'Allow customers to provide instructions for the delivery executive.')}
                {renderToggle('auto_confirm_orders', 'Auto Confirm Orders', 'Automatically transition newly paid or COD orders to Confirmed status.')}
              </div>
            </div>
          )}

          {/* ============================================================
              6. PAYMENT SETTINGS
             ============================================================ */}
          {activeTab === 'payments' && (
            <>
              {/* Payment Methods */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h2 className="settings-card-title">Payment Gateways & Methods</h2>
                    <p className="settings-card-desc">Enable or disable payment options presented to customers at checkout.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  {renderToggle('enable_cod', 'Enable Cash on Delivery (COD)', 'Allow customers to pay in cash or UPI upon delivery.')}
                  {renderToggle('enable_online_payment', 'Enable Online Payment Gateways', 'Allow digital transactions via Credit/Debit Cards, Net Banking, and UPI.')}
                  {renderToggle('enable_razorpay', 'Enable Razorpay Integration', 'Process credit cards, debit cards, UPI, and wallets via Razorpay.')}
                </div>

                {/* Razorpay Keys */}
                <div className="settings-form-grid">
                  <div className="settings-form-group">
                    <label className="settings-label">
                      Razorpay Key ID
                      <span className="settings-badge-public">Public</span>
                    </label>
                    <input
                      type="text"
                      className="settings-input"
                      placeholder="rzp_test_..."
                      value={formSettings.razorpay_key_id || ''}
                      onChange={(e) => handleChange('razorpay_key_id', e.target.value)}
                    />
                    <span className="settings-help-text">Public identifier passed to the Razorpay checkout script.</span>
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">
                      Razorpay Key Secret
                      <span className="settings-badge-secret">Encrypted Server-Only</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showSecretKey ? 'text' : 'password'}
                        className="settings-input"
                        placeholder="••••••••••••"
                        value={formSettings.razorpay_secret || ''}
                        onChange={(e) => handleChange('razorpay_secret', e.target.value)}
                      />
                      <button
                        type="button"
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b'
                        }}
                        onClick={() => setShowSecretKey(!showSecretKey)}
                      >
                        {showSecretKey ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    <span className="settings-help-text">Stored encrypted in MySQL. Never returned via public API. Leave unchanged to keep current secret.</span>
                  </div>
                </div>
              </div>

              {/* COD Parameters */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h2 className="settings-card-title">Cash on Delivery (COD) Rules</h2>
                    <p className="settings-card-desc">Configure handling fees, thresholds, and limits for Cash on Delivery.</p>
                  </div>
                </div>

                <div className="settings-form-grid">
                  <div className="settings-form-group">
                    <label className="settings-label">Minimum COD Order Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="settings-input"
                      value={formSettings.min_cod_order ?? 100}
                      onChange={(e) => handleChange('min_cod_order', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Maximum COD Order Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="settings-input"
                      value={formSettings.max_cod_order ?? 5000}
                      onChange={(e) => handleChange('max_cod_order', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">COD Convenience Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="settings-input"
                      value={formSettings.cod_fee ?? 25}
                      onChange={(e) => handleChange('cod_fee', parseFloat(e.target.value) || 0)}
                    />
                    <span className="settings-help-text">Additional fee applied to COD orders (set to 0 for free COD).</span>
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-label">Free COD Above Subtotal (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="settings-input"
                      value={formSettings.free_cod_above ?? 999}
                      onChange={(e) => handleChange('free_cod_above', parseFloat(e.target.value) || 0)}
                    />
                    <span className="settings-help-text">Waives the COD handling fee for qualifying orders.</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ============================================================
              7. SHIPPING & DELIVERY SETTINGS
             ============================================================ */}
          {activeTab === 'shipping' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Delivery & Shipping Rates</h2>
                  <p className="settings-card-desc">Configure checkout delivery charges and free shipping eligibility thresholds.</p>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                {renderToggle('enable_delivery', 'Enable Store Delivery', 'Toggle delivery service availability across the customer platform.')}
              </div>

              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-label">
                    Default Delivery Charge (₹)
                    <span className="settings-badge-public">Public</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="settings-input"
                    value={formSettings.delivery_charge ?? 50}
                    onChange={(e) => handleChange('delivery_charge', parseFloat(e.target.value) || 0)}
                  />
                  <span className="settings-help-text">Standard shipping cost applied in cart and checkout.</span>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">
                    Free Delivery Above Amount (₹)
                    <span className="settings-badge-public">Public</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="settings-input"
                    value={formSettings.free_delivery_above ?? 499}
                    onChange={(e) => handleChange('free_delivery_above', parseFloat(e.target.value) || 0)}
                  />
                  <span className="settings-help-text">Orders with subtotal at or above this threshold qualify for zero shipping fee.</span>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Minimum Order for Delivery (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="settings-input"
                    value={formSettings.min_order_for_delivery ?? 99}
                    onChange={(e) => handleChange('min_order_for_delivery', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Estimated Delivery Time Window</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="e.g. 24–48 Hours"
                    value={formSettings.estimated_delivery_time || '24–48 Hours'}
                    onChange={(e) => handleChange('estimated_delivery_time', e.target.value)}
                  />
                  <span className="settings-help-text">Displayed on product detail and checkout pages.</span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              8. TAX & GST SETTINGS
             ============================================================ */}
          {activeTab === 'tax' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Taxation & GST Configuration</h2>
                  <p className="settings-card-desc">Control tax calculations on healthcare products and prescription drugs.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {renderToggle('enable_tax', 'Enable Tax Calculation', 'Apply tax rate rules to products during checkout.')}
                {renderToggle('tax_inclusive_pricing', 'Prices Include Tax (Tax Inclusive)', 'Catalog prices already incorporate applicable GST rates.')}
              </div>

              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-label">Tax Label / Name</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="GST"
                    value={formSettings.tax_name || 'GST'}
                    onChange={(e) => handleChange('tax_name', e.target.value)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Default Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="settings-input"
                    value={formSettings.tax_rate ?? 5}
                    onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value) || 0)}
                  />
                  <span className="settings-help-text">Standard GST rate on pharmaceutical formulations (5% / 12% / 18%).</span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              9. COUPONS ENGINE
             ============================================================ */}
          {activeTab === 'coupons' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Promotional Coupons Engine</h2>
                  <p className="settings-card-desc">Global safety constraints for discount coupon codes.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {renderToggle('enable_coupons', 'Enable Discount Coupons', 'Allow customers to apply promo vouchers in cart and checkout.')}
                {renderToggle('allow_coupon_stacking', 'Allow Coupon Stacking', 'Allow multiple coupons on a single purchase (recommended OFF).')}
              </div>

              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-label">Maximum Coupon Discount Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="settings-input"
                    value={formSettings.max_coupon_discount ?? 1000}
                    onChange={(e) => handleChange('max_coupon_discount', parseFloat(e.target.value) || 0)}
                  />
                  <span className="settings-help-text">Upper limit on discount value regardless of coupon percentage.</span>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Default Coupon Expiry (Days)</label>
                  <input
                    type="number"
                    min="1"
                    className="settings-input"
                    value={formSettings.default_coupon_expiry_days ?? 30}
                    onChange={(e) => handleChange('default_coupon_expiry_days', parseInt(e.target.value, 10) || 30)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Minimum Order for Coupon (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="settings-input"
                    value={formSettings.min_order_for_coupon ?? 200}
                    onChange={(e) => handleChange('min_order_for_coupon', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              10. INVENTORY RULES
             ============================================================ */}
          {activeTab === 'inventory' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Inventory & Stock Control</h2>
                  <p className="settings-card-desc">Thresholds and automation rules for medicine stock management.</p>
                </div>
              </div>

              <div className="settings-form-grid" style={{ marginBottom: '20px' }}>
                <div className="settings-form-group">
                  <label className="settings-label">Default Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    min="1"
                    className="settings-input"
                    value={formSettings.low_stock_threshold ?? 10}
                    onChange={(e) => handleChange('low_stock_threshold', parseInt(e.target.value, 10) || 10)}
                  />
                  <span className="settings-help-text">Used if a specific product threshold is not explicitly set.</span>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Stock Reservation Time (Minutes)</label>
                  <input
                    type="number"
                    min="5"
                    className="settings-input"
                    value={formSettings.stock_reservation_time ?? 15}
                    onChange={(e) => handleChange('stock_reservation_time', parseInt(e.target.value, 10) || 15)}
                  />
                  <span className="settings-help-text">Hold units in inventory during payment gateway redirection.</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {renderToggle('auto_deduct_stock', 'Auto Deduct Stock on Order Confirmation', 'Automatically decrement inventory count when an order is finalized.')}
                {renderToggle('restore_stock_on_cancellation', 'Restore Stock on Order Cancellation', 'Automatically return reserved units to stock when an order is cancelled.')}
                {renderToggle('allow_backorders', 'Allow Backorders', 'Permit ordering items currently being replenished by suppliers.')}
                {renderToggle('allow_out_of_stock_purchase', 'Allow Out-of-Stock Purchase', 'Allow checkout even if stock count is zero (recommended OFF).')}
                {renderToggle('notify_admin_low_stock', 'Notify Admin on Low Stock', 'Generate admin notification when items hit low stock.')}
                {renderToggle('notify_admin_out_of_stock', 'Notify Admin on Out of Stock', 'Generate urgent alert when stock reaches 0 units.')}
              </div>
            </div>
          )}

          {/* ============================================================
              11. CUSTOMER ACCOUNT RULES
             ============================================================ */}
          {activeTab === 'customer' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Customer Account Features</h2>
                  <p className="settings-card-desc">Control registration, verification, guest shopping, and customer capabilities.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {renderToggle('allow_customer_registration', 'Allow New Customer Registration', 'Permit visitors to create customer accounts.')}
                {renderToggle('require_email_verification', 'Require Email Verification', 'Send verification email link before activating new customer accounts.')}
                {renderToggle('allow_phone_login', 'Allow Phone / OTP Login', 'Enable mobile number OTP authentication.')}
                {renderToggle('allow_guest_browsing', 'Allow Guest Browsing', 'Permit anonymous visitors to browse catalog and search products.')}
                {renderToggle('allow_guest_checkout', 'Allow Guest Checkout', 'Permit non-logged-in customers to complete orders with email and phone.')}
                {renderToggle('allow_wishlist', 'Enable Customer Wishlist', 'Allow customers to save products to their personal wishlist.')}
                {renderToggle('allow_address_book', 'Enable Saved Address Book', 'Allow customers to store multiple home/office delivery addresses.')}
              </div>
            </div>
          )}

          {/* ============================================================
              12. REVIEWS & RATINGS RULES
             ============================================================ */}
          {activeTab === 'reviews' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Product Reviews & Ratings Moderation</h2>
                  <p className="settings-card-desc">Configure customer review eligibility, photo attachments, and auto-approval workflows.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {renderToggle('enable_reviews', 'Enable Product Reviews', 'Display customer ratings and reviews on product pages.')}
                {renderToggle('require_login_to_review', 'Require Login to Review', 'Only logged-in customers can leave feedback.')}
                {renderToggle('verified_purchase_required', 'Verified Purchase Required', 'Only customers who bought the medicine can review it.')}
                {renderToggle('auto_approve_reviews', 'Auto Approve Reviews', 'Automatically publish reviews without manual admin moderation.')}
                {renderToggle('allow_review_photos', 'Allow Review Photo Uploads', 'Permit customers to attach images of received items.')}
              </div>

              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-label">Maximum Review Photos</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="settings-input"
                    value={formSettings.max_review_photos ?? 3}
                    onChange={(e) => handleChange('max_review_photos', parseInt(e.target.value, 10) || 3)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Review Editing Window (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    className="settings-input"
                    value={formSettings.review_edit_window_hours ?? 24}
                    onChange={(e) => handleChange('review_edit_window_hours', parseInt(e.target.value, 10) || 24)}
                  />
                  <span className="settings-help-text">Hours after submission during which customer can edit their review.</span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              13. ADMIN NOTIFICATIONS
             ============================================================ */}
          {activeTab === 'notifications' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Admin Notification Preferences</h2>
                  <p className="settings-card-desc">Control which store events trigger real-time alerts in the Admin Notification Center.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {renderToggle('alert_new_order', 'New Order Alert', 'Notify admin whenever a new order is received.')}
                {renderToggle('alert_prescription', 'Prescription Upload Alert', 'Notify admin whenever a customer uploads an Rx prescription for verification.')}
                {renderToggle('alert_review', 'New Review Alert', 'Notify admin when a customer submits a new product review.')}
                {renderToggle('alert_low_stock', 'Low Stock Alert', 'Notify admin when product inventory falls below threshold.')}
                {renderToggle('alert_out_of_stock', 'Out of Stock Alert', 'Notify admin immediately when stock count reaches zero.')}
                {renderToggle('alert_new_customer', 'New Customer Registration Alert', 'Notify admin when a new user registers an account.')}
                {renderToggle('alert_payment', 'Payment Failure Alert', 'Notify admin if an online payment attempt fails or encounters gateway error.')}
                {renderToggle('alert_system', 'System & Security Alerts', 'Notify admin regarding failed login attempts and system maintenance.')}
              </div>
            </div>
          )}

          {/* ============================================================
              14. EMAIL & SMTP SETTINGS
             ============================================================ */}
          {activeTab === 'email' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Email Server & SMTP Configuration</h2>
                  <p className="settings-card-desc">Configure outgoing email delivery for customer invoices, order updates, and password resets.</p>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                {renderToggle('enable_email_notifications', 'Enable Outgoing Email Service', 'Master switch for all transactional email dispatch.')}
              </div>

              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-label">SMTP Host</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="smtp.gmail.com or smtp.mailtrap.io"
                    value={formSettings.smtp_host || ''}
                    onChange={(e) => handleChange('smtp_host', e.target.value)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">SMTP Port</label>
                  <input
                    type="number"
                    className="settings-input"
                    placeholder="587"
                    value={formSettings.smtp_port ?? 587}
                    onChange={(e) => handleChange('smtp_port', parseInt(e.target.value, 10) || 587)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">SMTP Username</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={formSettings.smtp_username || ''}
                    onChange={(e) => handleChange('smtp_username', e.target.value)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">
                    SMTP Password
                    <span className="settings-badge-secret">Encrypted Server-Only</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSmtpPass ? 'text' : 'password'}
                      className="settings-input"
                      placeholder="••••••••••••"
                      value={formSettings.smtp_password || ''}
                      onChange={(e) => handleChange('smtp_password', e.target.value)}
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b'
                      }}
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                    >
                      {showSmtpPass ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  <span className="settings-help-text">Protected on server. Never exposed over public APIs.</span>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Encryption Protocol</label>
                  <select
                    className="settings-select"
                    value={formSettings.smtp_encryption || 'tls'}
                    onChange={(e) => handleChange('smtp_encryption', e.target.value)}
                  >
                    <option value="tls">TLS (Recommended)</option>
                    <option value="ssl">SSL</option>
                    <option value="none">None</option>
                  </select>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">From Name</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={formSettings.mail_from_name || 'Medicare PLUS'}
                    onChange={(e) => handleChange('mail_from_name', e.target.value)}
                  />
                </div>

                <div className="settings-form-group col-span-2">
                  <label className="settings-label">From Email Address</label>
                  <input
                    type="email"
                    className="settings-input"
                    value={formSettings.mail_from_address || 'noreply@medicareplus.com'}
                    onChange={(e) => handleChange('mail_from_address', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              15. SECURITY SETTINGS
             ============================================================ */}
          {activeTab === 'security' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Security & Session Policies</h2>
                  <p className="settings-card-desc">Strengthen administrative login sessions and prevent brute force attacks.</p>
                </div>
              </div>

              <div className="settings-form-grid" style={{ marginBottom: '20px' }}>
                <div className="settings-form-group">
                  <label className="settings-label">Admin Session Timeout (Minutes)</label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    className="settings-input"
                    value={formSettings.admin_session_timeout ?? 120}
                    onChange={(e) => handleChange('admin_session_timeout', parseInt(e.target.value, 10) || 120)}
                  />
                  <span className="settings-help-text">Inactivity duration before requiring re-login.</span>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Max Login Attempts Before Lockout</label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    className="settings-input"
                    value={formSettings.login_attempt_limit ?? 5}
                    onChange={(e) => handleChange('login_attempt_limit', parseInt(e.target.value, 10) || 5)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Password Minimum Length</label>
                  <input
                    type="number"
                    min="6"
                    max="32"
                    className="settings-input"
                    value={formSettings.password_min_length ?? 8}
                    onChange={(e) => handleChange('password_min_length', parseInt(e.target.value, 10) || 8)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {renderToggle('require_strong_password', 'Require Strong Passwords', 'Enforce uppercase, lowercase, numbers, and special symbols in user passwords.')}
                {renderToggle('require_admin_reauth', 'Require Admin Re-authentication', 'Prompt for admin password before saving critical security credentials.')}
                {renderToggle('enable_security_notifications', 'Enable Security Alert Emails', 'Send alert to admin email upon repeated failed login attempts.')}
              </div>
            </div>
          )}

          {/* ============================================================
              16. SEO & METADATA
             ============================================================ */}
          {activeTab === 'seo' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Search Engine Optimization (SEO)</h2>
                  <p className="settings-card-desc">Configure search indexing, Open Graph tags, and rich social sharing previews.</p>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                {renderToggle('robots_indexing', 'Allow Search Engine Indexing (Robots)', 'Enable Google, Bing, and other search engines to index your store pages.')}
              </div>

              <div className="settings-form-grid">
                <div className="settings-form-group col-span-2">
                  <label className="settings-label">Site Meta Title</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={formSettings.site_title || ''}
                    onChange={(e) => handleChange('site_title', e.target.value)}
                  />
                </div>

                <div className="settings-form-group col-span-2">
                  <label className="settings-label">Meta Description</label>
                  <textarea
                    className="settings-textarea"
                    value={formSettings.meta_description || ''}
                    onChange={(e) => handleChange('meta_description', e.target.value)}
                  />
                </div>

                <div className="settings-form-group col-span-2">
                  <label className="settings-label">Meta Keywords</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="pharmacy, online medicine, healthcare essentials..."
                    value={formSettings.meta_keywords || ''}
                    onChange={(e) => handleChange('meta_keywords', e.target.value)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Open Graph Title</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={formSettings.og_title || ''}
                    onChange={(e) => handleChange('og_title', e.target.value)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Default Social Share Image URL</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="https://..."
                    value={formSettings.og_image || ''}
                    onChange={(e) => handleChange('og_image', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              17. APPEARANCE & THEME
             ============================================================ */}
          {activeTab === 'appearance' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Brand Appearance & Colors</h2>
                  <p className="settings-card-desc">Maintain consistent Medicare PLUS branding across admin and customer interfaces.</p>
                </div>
              </div>

              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-label">Primary Brand Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="color"
                      style={{ width: '44px', height: '40px', padding: '2px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                      value={formSettings.primary_brand_color || '#087F73'}
                      onChange={(e) => handleChange('primary_brand_color', e.target.value)}
                    />
                    <input
                      type="text"
                      className="settings-input"
                      value={formSettings.primary_brand_color || '#087F73'}
                      onChange={(e) => handleChange('primary_brand_color', e.target.value)}
                    />
                  </div>
                  <span className="settings-help-text">Signature Medicare PLUS medical teal.</span>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Secondary Brand Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="color"
                      style={{ width: '44px', height: '40px', padding: '2px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                      value={formSettings.secondary_brand_color || '#06665c'}
                      onChange={(e) => handleChange('secondary_brand_color', e.target.value)}
                    />
                    <input
                      type="text"
                      className="settings-input"
                      value={formSettings.secondary_brand_color || '#06665c'}
                      onChange={(e) => handleChange('secondary_brand_color', e.target.value)}
                    />
                  </div>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Customer Header Style</label>
                  <select
                    className="settings-select"
                    value={formSettings.header_style || 'modern'}
                    onChange={(e) => handleChange('header_style', e.target.value)}
                  >
                    <option value="modern">Modern Teal Header</option>
                    <option value="classic">Classic Minimal Header</option>
                    <option value="compact">Compact Search-First Header</option>
                  </select>
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Customer Footer Style</label>
                  <select
                    className="settings-select"
                    value={formSettings.footer_style || 'full'}
                    onChange={(e) => handleChange('footer_style', e.target.value)}
                  >
                    <option value="full">Comprehensive Multi-Column Footer</option>
                    <option value="minimal">Minimal Single-Column Footer</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              18. MAINTENANCE MODE
             ============================================================ */}
          {activeTab === 'maintenance' && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h2 className="settings-card-title">Store Maintenance Mode</h2>
                  <p className="settings-card-desc">
                    Temporarily close customer shopping while keeping the Admin Management Center fully operational.
                  </p>
                </div>
              </div>

              {Boolean(formSettings.maintenance_mode) && (
                <div className="maintenance-active-banner">
                  <FiAlertTriangle className="maintenance-active-banner-icon" />
                  <div className="maintenance-active-banner-text">
                    <h4>Maintenance Mode is Currently ACTIVE</h4>
                    <p>The customer-facing storefront is currently replaced by the maintenance page. Admin panel access remains completely functional.</p>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                {renderToggle(
                  'maintenance_mode',
                  'Enable Maintenance Mode',
                  'When enabled, visitors to customer pages will see a friendly maintenance screen.'
                )}
              </div>

              <div className="settings-form-grid">
                <div className="settings-form-group col-span-2">
                  <label className="settings-label">Maintenance Title</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="We'll be back shortly"
                    value={formSettings.maintenance_title || ''}
                    onChange={(e) => handleChange('maintenance_title', e.target.value)}
                  />
                </div>

                <div className="settings-form-group col-span-2">
                  <label className="settings-label">Customer Maintenance Message</label>
                  <textarea
                    className="settings-textarea"
                    placeholder="Our pharmacy catalog is undergoing scheduled system updates..."
                    value={formSettings.maintenance_message || ''}
                    onChange={(e) => handleChange('maintenance_message', e.target.value)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Maintenance Start Time</label>
                  <input
                    type="datetime-local"
                    className="settings-input"
                    value={formSettings.maintenance_start || ''}
                    onChange={(e) => handleChange('maintenance_start', e.target.value)}
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-label">Estimated Completion Time</label>
                  <input
                    type="datetime-local"
                    className="settings-input"
                    value={formSettings.maintenance_end || ''}
                    onChange={(e) => handleChange('maintenance_end', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
