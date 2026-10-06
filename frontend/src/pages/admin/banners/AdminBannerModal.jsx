import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Calendar,
  Layers,
  Sparkles,
  Save,
  AlertCircle,
  Check,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { adminBannerService } from '../../../services/adminApi';
import { resolveImageUrl } from '../../../utils/imageUrl';

const POSITIONS = [
  { value: 'HOMEPAGE_HERO', label: 'Homepage Hero', desc: 'Main top slider on customer homepage' },
  { value: 'PROMOTIONAL_BANNER', label: 'Promotional Banner', desc: 'Mid-page spotlight banner' },
  { value: 'NEW_LAUNCHES', label: 'New Launches Banner', desc: 'Header for new products' },
  { value: 'SPECIAL_DEALS', label: 'Special Deals Banner', desc: 'Spotlight deal showcase' },
  { value: 'CATEGORY_BANNER', label: 'Category Banner', desc: 'Header banner for category shop pages' }
];

export default function AdminBannerModal({ banner, isOpen, onClose, onSaved }) {
  const isEditMode = Boolean(banner && banner.id);

  // Form fields
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    badge: '',
    position: 'HOMEPAGE_HERO',
    button_text: 'SHOP NOW',
    button_url: '/shop',
    open_new_tab: false,
    start_date: '',
    end_date: '',
    status: 'ACTIVE',
    sort_order: '1'
  });

  // Media files & previews
  const [desktopFile, setDesktopFile] = useState(null);
  const [desktopPreview, setDesktopPreview] = useState(null);
  const [mobileFile, setMobileFile] = useState(null);
  const [mobilePreview, setMobilePreview] = useState(null);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const desktopInputRef = useRef(null);
  const mobileInputRef = useRef(null);

  // Initialize data when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (banner && banner.id) {
        setFormData({
          title: banner.title || '',
          subtitle: banner.subtitle || '',
          description: banner.description || '',
          badge: banner.badge || '',
          position: banner.position || 'HOMEPAGE_HERO',
          button_text: banner.button_text || 'SHOP NOW',
          button_url: banner.button_url || banner.target_url || '/shop',
          open_new_tab: Boolean(banner.open_new_tab),
          start_date: banner.start_date ? banner.start_date.slice(0, 16) : '',
          end_date: banner.end_date ? banner.end_date.slice(0, 16) : '',
          status: banner.status || 'ACTIVE',
          sort_order: banner.sort_order !== undefined ? String(banner.sort_order) : '1'
        });
        setDesktopFile(null);
        setDesktopPreview(banner.image ? resolveImageUrl(banner.image) : null);
        setMobileFile(null);
        setMobilePreview(banner.mobile_image ? resolveImageUrl(banner.mobile_image) : null);
      } else {
        // Reset for create
        setFormData({
          title: '',
          subtitle: '',
          description: '',
          badge: 'SPECIAL OFFER',
          position: 'HOMEPAGE_HERO',
          button_text: 'SHOP NOW',
          button_url: '/shop',
          open_new_tab: false,
          start_date: '',
          end_date: '',
          status: 'ACTIVE',
          sort_order: '1'
        });
        setDesktopFile(null);
        setDesktopPreview(null);
        setMobileFile(null);
        setMobilePreview(null);
      }
    }
  }, [isOpen, banner]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, saving]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Image Upload Handlers
  const handleDesktopFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 6 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, desktop_image: 'File size exceeds 6MB.' }));
        return;
      }
      setDesktopFile(file);
      setDesktopPreview(URL.createObjectURL(file));
      if (errors.desktop_image) {
        setErrors(prev => ({ ...prev, desktop_image: null }));
      }
    }
  };

  const handleMobileFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 6 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, mobile_image: 'File size exceeds 6MB.' }));
        return;
      }
      setMobileFile(file);
      setMobilePreview(URL.createObjectURL(file));
      if (errors.mobile_image) {
        setErrors(prev => ({ ...prev, mobile_image: null }));
      }
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) {
      errs.title = 'Banner title is required.';
    }

    if (!isEditMode && !desktopFile && !desktopPreview) {
      errs.desktop_image = 'Please upload a desktop banner image.';
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        errs.end_date = 'End date cannot be earlier than start date.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const data = new FormData();
      data.append('title', formData.title.trim());
      data.append('subtitle', formData.subtitle.trim());
      data.append('description', formData.description.trim());
      data.append('badge', formData.badge.trim());
      data.append('position', formData.position);
      data.append('button_text', formData.button_text.trim());
      data.append('button_url', formData.button_url.trim());
      data.append('open_new_tab', formData.open_new_tab ? '1' : '0');
      data.append('status', formData.status);
      data.append('sort_order', formData.sort_order || '0');

      if (formData.start_date) {
        data.append('start_date', formData.start_date);
      }
      if (formData.end_date) {
        data.append('end_date', formData.end_date);
      }

      if (desktopFile) {
        data.append('desktop_image', desktopFile);
      }
      if (mobileFile) {
        data.append('mobile_image', mobileFile);
      }

      let res;
      if (isEditMode) {
        res = await adminBannerService.updateBanner(banner.id, data);
      } else {
        res = await adminBannerService.createBanner(data);
      }

      if (res && res.success) {
        onSaved(
          isEditMode
            ? `Banner "${formData.title}" updated successfully.`
            : `Banner "${formData.title}" created successfully.`
        );
        onClose();
      } else {
        setErrors(prev => ({ ...prev, form: res?.message || 'Failed to save banner.' }));
      }
    } catch (err) {
      console.error('Error saving banner:', err);
      const msg = err.response?.data?.message || 'Server error occurred while saving banner.';
      setErrors(prev => ({ ...prev, form: msg }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bnr-modal-overlay" onClick={() => !saving && onClose()} role="dialog" aria-modal="true">
      <div className="bnr-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bnr-modal-header">
          <div>
            <h3 style={{ margin: 0 }}>
              {isEditMode ? `Edit Banner: ${banner.title}` : 'Create Promotional Banner'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--bnr-text-muted)' }}>
              Configure media, placement, target link, scheduling and display rules.
            </p>
          </div>
          <button
            type="button"
            className="bnr-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="bnr-modal-body">
            {errors.form && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--bnr-danger-bg)',
                  border: '1px solid var(--bnr-danger-border)',
                  color: 'var(--bnr-danger)',
                  borderRadius: '8px',
                  marginBottom: '18px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} />
                <span>{errors.form}</span>
              </div>
            )}

            {/* 1. BASIC INFORMATION */}
            <div className="bnr-form-section">
              <div className="bnr-form-section-title">
                <Sparkles size={16} style={{ color: 'var(--bnr-primary)' }} />
                <span>Basic Information</span>
              </div>

              <div className="bnr-form-grid">
                <div className="bnr-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="bnr-title">
                    Banner Title <span style={{ color: 'var(--bnr-danger)' }}>*</span>
                  </label>
                  <input
                    id="bnr-title"
                    type="text"
                    name="title"
                    className="bnr-form-input"
                    placeholder="e.g. Special Healthcare Offer"
                    value={formData.title}
                    onChange={handleChange}
                    autoFocus={!isEditMode}
                  />
                  {errors.title && <span className="bnr-form-error">{errors.title}</span>}
                </div>

                <div className="bnr-form-group">
                  <label htmlFor="bnr-subtitle">Subtitle / Highlight Text</label>
                  <input
                    id="bnr-subtitle"
                    type="text"
                    name="subtitle"
                    className="bnr-form-input"
                    placeholder="e.g. Up To 25% Off"
                    value={formData.subtitle}
                    onChange={handleChange}
                  />
                  <span className="bnr-form-help">Secondary emphasis line shown below title.</span>
                </div>

                <div className="bnr-form-group">
                  <label htmlFor="bnr-badge">Badge Text (Optional)</label>
                  <input
                    id="bnr-badge"
                    type="text"
                    name="badge"
                    className="bnr-form-input"
                    placeholder="e.g. SPECIAL OFFER, NEW LAUNCH"
                    value={formData.badge}
                    onChange={handleChange}
                  />
                  <span className="bnr-form-help">Small pill tag displayed above the title.</span>
                </div>

                <div className="bnr-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="bnr-desc">Description / Body Text (Optional)</label>
                  <textarea
                    id="bnr-desc"
                    name="description"
                    className="bnr-form-input"
                    style={{ height: '70px', resize: 'vertical' }}
                    placeholder="e.g. Order genuine healthcare supplies, vitamins and daily health essentials online."
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* 2. MEDIA (DESKTOP & MOBILE IMAGES) */}
            <div className="bnr-form-section">
              <div className="bnr-form-section-title">
                <ImageIcon size={16} style={{ color: 'var(--bnr-primary)' }} />
                <span>Media & Banner Images</span>
              </div>

              <div className="bnr-form-grid">
                {/* Desktop Image */}
                <div className="bnr-form-group">
                  <label>
                    Desktop Banner Image <span style={{ color: 'var(--bnr-danger)' }}>*</span>
                  </label>

                  <input
                    type="file"
                    ref={desktopInputRef}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={handleDesktopFileSelect}
                  />

                  {desktopPreview ? (
                    <div className="bnr-preview-box">
                      <img src={desktopPreview} alt="Desktop banner preview" />
                      <div className="bnr-preview-overlay-actions">
                        <button
                          type="button"
                          className="bnr-btn bnr-btn-secondary bnr-btn-sm"
                          onClick={() => desktopInputRef.current?.click()}
                          style={{ padding: '4px 8px' }}
                        >
                          <RefreshCw size={12} />
                          <span>Replace</span>
                        </button>
                        {isEditMode && (
                          <button
                            type="button"
                            className="bnr-btn bnr-btn-danger bnr-btn-sm"
                            onClick={() => {
                              setDesktopFile(null);
                              setDesktopPreview(null);
                            }}
                            style={{ padding: '4px 8px' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="bnr-dropzone"
                      onClick={() => desktopInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                    >
                      <Upload size={28} style={{ color: 'var(--bnr-text-light)', margin: '0 auto 8px' }} />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--bnr-text-main)' }}>
                        Click to upload desktop image
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--bnr-text-muted)', marginTop: '4px' }}>
                        Recommended: 1920 × 600 px (JPG, PNG, WEBP, max 6MB)
                      </div>
                    </div>
                  )}
                  {errors.desktop_image && <span className="bnr-form-error">{errors.desktop_image}</span>}
                </div>

                {/* Mobile Image (Optional) */}
                <div className="bnr-form-group">
                  <label>Mobile Image (Optional)</label>

                  <input
                    type="file"
                    ref={mobileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={handleMobileFileSelect}
                  />

                  {mobilePreview ? (
                    <div className="bnr-preview-box">
                      <img src={mobilePreview} alt="Mobile banner preview" />
                      <div className="bnr-preview-overlay-actions">
                        <button
                          type="button"
                          className="bnr-btn bnr-btn-secondary bnr-btn-sm"
                          onClick={() => mobileInputRef.current?.click()}
                          style={{ padding: '4px 8px' }}
                        >
                          <RefreshCw size={12} />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          className="bnr-btn bnr-btn-danger bnr-btn-sm"
                          onClick={() => {
                            setMobileFile(null);
                            setMobilePreview(null);
                          }}
                          style={{ padding: '4px 8px' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="bnr-dropzone"
                      onClick={() => mobileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                    >
                      <Upload size={28} style={{ color: 'var(--bnr-text-light)', margin: '0 auto 8px' }} />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--bnr-text-main)' }}>
                        Optional mobile image
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--bnr-text-muted)', marginTop: '4px' }}>
                        Recommended: 1080 × 1200 px (Auto falls back to desktop)
                      </div>
                    </div>
                  )}
                  {errors.mobile_image && <span className="bnr-form-error">{errors.mobile_image}</span>}
                </div>
              </div>
            </div>

            {/* 3. PLACEMENT & POSITION */}
            <div className="bnr-form-section">
              <div className="bnr-form-section-title">
                <Layers size={16} style={{ color: 'var(--bnr-primary)' }} />
                <span>Placement & Position</span>
              </div>

              <div className="bnr-form-group">
                <label htmlFor="bnr-position">Display Placement Position</label>
                <select
                  id="bnr-position"
                  name="position"
                  className="bnr-select"
                  value={formData.position}
                  onChange={handleChange}
                >
                  {POSITIONS.map(pos => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label} — {pos.desc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. LINK & CTA BUTTON */}
            <div className="bnr-form-section">
              <div className="bnr-form-section-title">
                <LinkIcon size={16} style={{ color: 'var(--bnr-primary)' }} />
                <span>Call to Action (CTA) & Destination</span>
              </div>

              <div className="bnr-form-grid">
                <div className="bnr-form-group">
                  <label htmlFor="bnr-button-text">Button Text</label>
                  <input
                    id="bnr-button-text"
                    type="text"
                    name="button_text"
                    className="bnr-form-input"
                    placeholder="e.g. SHOP NOW"
                    value={formData.button_text}
                    onChange={handleChange}
                  />
                  <span className="bnr-form-help">Leave blank to not display a CTA button.</span>
                </div>

                <div className="bnr-form-group">
                  <label htmlFor="bnr-button-url">Target Destination Route / URL</label>
                  <input
                    id="bnr-button-url"
                    type="text"
                    name="button_url"
                    className="bnr-form-input"
                    placeholder="e.g. /shop, /category/health-wellness, or https://..."
                    value={formData.button_url}
                    onChange={handleChange}
                  />
                  <span className="bnr-form-help">Internal React route or external https URL.</span>
                </div>

                <div className="bnr-form-group" style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="open_new_tab"
                      checked={formData.open_new_tab}
                      onChange={handleChange}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--bnr-primary)' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--bnr-text-main)' }}>
                      Open target link in new browser tab
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* 5. SCHEDULING & DISPLAY */}
            <div className="bnr-form-section" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
              <div className="bnr-form-section-title">
                <Calendar size={16} style={{ color: 'var(--bnr-primary)' }} />
                <span>Scheduling, Order & Status</span>
              </div>

              <div className="bnr-form-grid">
                <div className="bnr-form-group">
                  <label htmlFor="bnr-start-date">Start Date & Time (Optional)</label>
                  <input
                    id="bnr-start-date"
                    type="datetime-local"
                    name="start_date"
                    className="bnr-form-input"
                    value={formData.start_date}
                    onChange={handleChange}
                  />
                  <span className="bnr-form-help">Leave blank for immediate publication.</span>
                </div>

                <div className="bnr-form-group">
                  <label htmlFor="bnr-end-date">End / Expiry Date & Time (Optional)</label>
                  <input
                    id="bnr-end-date"
                    type="datetime-local"
                    name="end_date"
                    className="bnr-form-input"
                    value={formData.end_date}
                    onChange={handleChange}
                  />
                  {errors.end_date ? (
                    <span className="bnr-form-error">{errors.end_date}</span>
                  ) : (
                    <span className="bnr-form-help">Leave blank for no automatic expiration.</span>
                  )}
                </div>

                <div className="bnr-form-group">
                  <label htmlFor="bnr-sort-order">Sort Order Priority</label>
                  <input
                    id="bnr-sort-order"
                    type="number"
                    name="sort_order"
                    className="bnr-form-input"
                    placeholder="e.g. 1"
                    value={formData.sort_order}
                    onChange={handleChange}
                  />
                  <span className="bnr-form-help">Lower numbers appear first in sliders and lists.</span>
                </div>

                <div className="bnr-form-group">
                  <label htmlFor="bnr-status">Status</label>
                  <select
                    id="bnr-status"
                    name="status"
                    className="bnr-select"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="ACTIVE">Active (Live when valid)</option>
                    <option value="DRAFT">Draft (Hidden)</option>
                    <option value="INACTIVE">Disabled</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bnr-modal-footer">
            <button
              type="button"
              className="bnr-btn bnr-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="bnr-btn bnr-btn-primary"
              disabled={saving}
              style={{ minWidth: '130px', justifyContent: 'center' }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : isEditMode ? 'Update Banner' : 'Create Banner'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
