import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Tag,
  Percent,
  IndianRupee,
  Calendar,
  Users,
  ShieldCheck,
  Layers,
  Sparkles,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Check,
  X
} from 'lucide-react';
import { adminCouponService } from '../../../services/adminApi';
import './AdminCoupons.css';

export default function AdminCouponForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_value: '',
    min_order_amount: '0',
    max_discount_amount: '',
    start_date: '',
    expiry_date: '',
    usage_limit: '',
    per_user_limit: '1',
    first_order_only: false,
    status: 'ACTIVE',
    applicable_categories: [],
    applicable_brands: [],
    applicable_products: []
  });

  // Meta options (Categories, Brands, Products)
  const [metaOptions, setMetaOptions] = useState({
    categories: [],
    brands: [],
    products: []
  });

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (text, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch Meta Options & Coupon data if editing
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Fetch metadata (categories, brands, products)
        const metaRes = await adminCouponService.getMeta();
        if (metaRes && metaRes.success) {
          setMetaOptions(metaRes.data || { categories: [], brands: [], products: [] });
        }

        // If editing, fetch existing coupon details
        if (isEditMode) {
          const couponRes = await adminCouponService.getCoupon(id);
          if (couponRes && couponRes.success && couponRes.data) {
            const c = couponRes.data;
            setFormData({
              code: c.code || '',
              description: c.description || '',
              discount_type: c.discount_type || 'PERCENTAGE',
              discount_value: c.discount_value !== undefined ? String(c.discount_value) : '',
              min_order_amount: c.min_order_amount !== undefined ? String(c.min_order_amount) : '0',
              max_discount_amount: c.max_discount_amount !== null && c.max_discount_amount !== undefined ? String(c.max_discount_amount) : '',
              start_date: c.start_date ? c.start_date.slice(0, 10) : '',
              expiry_date: c.expiry_date ? c.expiry_date.slice(0, 10) : '',
              usage_limit: c.usage_limit !== null && c.usage_limit !== undefined ? String(c.usage_limit) : '',
              per_user_limit: c.per_user_limit !== null && c.per_user_limit !== undefined ? String(c.per_user_limit) : '1',
              first_order_only: Boolean(parseInt(c.first_order_only) || c.first_order_only === true),
              status: c.status || 'ACTIVE',
              applicable_categories: Array.isArray(c.applicable_categories) ? c.applicable_categories : (typeof c.applicable_categories === 'string' && c.applicable_categories ? JSON.parse(c.applicable_categories) : []),
              applicable_brands: Array.isArray(c.applicable_brands) ? c.applicable_brands : (typeof c.applicable_brands === 'string' && c.applicable_brands ? JSON.parse(c.applicable_brands) : []),
              applicable_products: Array.isArray(c.applicable_products) ? c.applicable_products : (typeof c.applicable_products === 'string' && c.applicable_products ? JSON.parse(c.applicable_products) : [])
            });
          } else {
            showToast('Coupon not found or unable to load details.', 'error');
            setTimeout(() => navigate('/admin/coupons'), 1500);
          }
        }
      } catch (err) {
        console.error('Error loading coupon metadata:', err);
        showToast('Failed to load coupon configuration.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [id, isEditMode, navigate]);

  // Code Generator
  const handleGenerateCode = () => {
    const prefixes = ['MEDI', 'HEALTH', 'CARE', 'PLUS', 'SAVE', 'WELL'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(Math.random() * 8 + 2) * 5; // 10, 15, 20, 25, 30, etc.
    const newCode = `${randomPrefix}${randomNum}`;

    setFormData(prev => ({
      ...prev,
      code: newCode
    }));

    if (errors.code) {
      setErrors(prev => ({ ...prev, code: null }));
    }
  };

  // Form input changes
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

  // Multi-select toggle helpers
  const toggleArrayItem = (fieldName, itemVal) => {
    setFormData(prev => {
      const current = prev[fieldName] || [];
      const exists = current.includes(itemVal);
      const updated = exists ? current.filter(x => x !== itemVal) : [...current, itemVal];
      return {
        ...prev,
        [fieldName]: updated
      };
    });
  };

  // Client Validation
  const validateForm = () => {
    const errs = {};

    // Code
    const cleanCode = (formData.code || '').trim().toUpperCase();
    if (!cleanCode) {
      errs.code = 'Coupon code is required.';
    } else if (!/^[A-Z0-9_-]{3,25}$/.test(cleanCode)) {
      errs.code = 'Code must be 3–25 characters (uppercase letters, numbers, hyphens, underscores).';
    }

    // Discount value
    const val = parseFloat(formData.discount_value);
    if (isNaN(val) || val <= 0) {
      errs.discount_value = 'Discount value must be greater than zero.';
    } else if (formData.discount_type === 'PERCENTAGE' && val > 100) {
      errs.discount_value = 'Percentage discount cannot exceed 100%.';
    }

    // Minimum Order Amount
    const minOrder = parseFloat(formData.min_order_amount);
    if (!isNaN(minOrder) && minOrder < 0) {
      errs.min_order_amount = 'Minimum order amount cannot be negative.';
    }

    // Maximum Discount Amount
    if (formData.max_discount_amount) {
      const maxDisc = parseFloat(formData.max_discount_amount);
      if (!isNaN(maxDisc) && maxDisc < 0) {
        errs.max_discount_amount = 'Maximum discount cannot be negative.';
      }
    }

    // Date range
    if (formData.start_date && formData.expiry_date) {
      if (new Date(formData.expiry_date) < new Date(formData.start_date)) {
        errs.expiry_date = 'End date cannot be earlier than start date.';
      }
    }

    // Limits
    if (formData.usage_limit && parseInt(formData.usage_limit) < 1) {
      errs.usage_limit = 'Total usage limit must be at least 1 or left blank for unlimited.';
    }

    if (formData.per_user_limit && parseInt(formData.per_user_limit) < 1) {
      errs.per_user_limit = 'Per customer limit must be at least 1.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fix the validation errors in the form.', 'error');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_order_amount: parseFloat(formData.min_order_amount) || 0,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
        start_date: formData.start_date ? `${formData.start_date} 00:00:00` : null,
        expiry_date: formData.expiry_date ? `${formData.expiry_date} 23:59:59` : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        per_user_limit: formData.per_user_limit ? parseInt(formData.per_user_limit) : 1,
        first_order_only: formData.first_order_only ? 1 : 0,
        applicable_categories: formData.applicable_categories,
        applicable_brands: formData.applicable_brands,
        applicable_products: formData.applicable_products,
        status: formData.status
      };

      let res;
      if (isEditMode) {
        res = await adminCouponService.updateCoupon(id, payload);
      } else {
        res = await adminCouponService.createCoupon(payload);
      }

      if (res && res.success) {
        showToast(
          isEditMode
            ? `Coupon "${payload.code}" updated successfully!`
            : `Coupon "${payload.code}" created successfully!`,
          'success'
        );
        setTimeout(() => {
          navigate('/admin/coupons');
        }, 1200);
      } else {
        showToast(res?.message || 'Failed to save coupon.', 'error');
      }
    } catch (err) {
      console.error('Error saving coupon:', err);
      const errMsg = err.response?.data?.message || 'Server error occurred while saving coupon.';
      showToast(errMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="cpn-page-wrapper">
        <div style={{ maxWidth: '900px', margin: '40px auto', padding: '24px' }}>
          <div className="cpn-skeleton" style={{ height: '40px', width: '250px', marginBottom: '24px' }}></div>
          <div className="cpn-skeleton" style={{ height: '240px', marginBottom: '24px', borderRadius: '16px' }}></div>
          <div className="cpn-skeleton" style={{ height: '200px', marginBottom: '24px', borderRadius: '16px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="cpn-page-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: toastMessage.type === 'error' ? '#EF4444' : '#087F73',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
            animation: 'cpnFadeIn 0.25s ease'
          }}
        >
          {toastMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="cpn-header" style={{ maxWidth: '1000px', margin: '0 auto 24px' }}>
        <div className="cpn-title-wrap">
          <div className="cpn-breadcrumb">
            <Link to="/admin">Admin</Link>
            <span>/</span>
            <Link to="/admin/coupons">Coupons</Link>
            <span>/</span>
            <span className="cpn-breadcrumb-current">{isEditMode ? 'Edit Coupon' : 'Create Coupon'}</span>
          </div>
          <h1>{isEditMode ? `Edit Coupon: ${formData.code}` : 'Create New Coupon'}</h1>
          <p className="cpn-subtitle">
            Configure discount rules, usage limits, eligibility restrictions, and campaign validity.
          </p>
        </div>

        <div className="cpn-header-actions">
          <Link to="/admin/coupons" className="cpn-btn cpn-btn-secondary">
            <ArrowLeft size={16} />
            <span>Back to Coupons</span>
          </Link>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* 1. BASIC INFORMATION */}
        <div className="cpn-form-card">
          <div className="cpn-form-section-title">
            <Tag size={18} style={{ color: 'var(--cpn-primary)' }} />
            <span>Basic Information</span>
          </div>

          <div className="cpn-form-grid">
            <div className="cpn-form-group">
              <label htmlFor="coupon-code">
                Coupon Code <span style={{ color: 'var(--cpn-danger)' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="coupon-code"
                  type="text"
                  name="code"
                  className="cpn-form-input"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, fontFamily: 'monospace' }}
                  placeholder="e.g. SAVE20"
                  value={formData.code}
                  onChange={(e) => {
                    const cleaned = e.target.value.toUpperCase().replace(/\s+/g, '');
                    setFormData(prev => ({ ...prev, code: cleaned }));
                    if (errors.code) setErrors(prev => ({ ...prev, code: null }));
                  }}
                  autoFocus={!isEditMode}
                />
                <button
                  type="button"
                  className="cpn-btn cpn-btn-secondary"
                  onClick={handleGenerateCode}
                  title="Generate a random coupon code"
                  style={{ padding: '0 12px' }}
                >
                  <Sparkles size={16} style={{ color: 'var(--cpn-primary)' }} />
                  <span>Generate</span>
                </button>
              </div>
              {errors.code ? (
                <span className="cpn-form-error">{errors.code}</span>
              ) : (
                <span className="cpn-form-help">Uppercase letters, numbers, hyphens. E.g. SAVE20, WELCOME100</span>
              )}
            </div>

            <div className="cpn-form-group">
              <label htmlFor="coupon-description">Description (Optional)</label>
              <input
                id="coupon-description"
                type="text"
                name="description"
                className="cpn-form-input"
                placeholder="e.g. Flat 20% off on all wellness & vitamins"
                value={formData.description}
                onChange={handleChange}
              />
              <span className="cpn-form-help">Short summary displayed on coupon badge or cart banner.</span>
            </div>
          </div>
        </div>

        {/* 2. DISCOUNT RULES */}
        <div className="cpn-form-card">
          <div className="cpn-form-section-title">
            <Percent size={18} style={{ color: 'var(--cpn-primary)' }} />
            <span>Discount Type & Value</span>
          </div>

          <div className="cpn-form-grid">
            {/* Discount Type Toggle */}
            <div className="cpn-form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Discount Type</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, discount_type: 'PERCENTAGE' }))}
                  className={`cpn-btn ${formData.discount_type === 'PERCENTAGE' ? 'cpn-btn-primary' : 'cpn-btn-secondary'}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Percent size={16} />
                  <span>Percentage Discount</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, discount_type: 'FIXED' }))}
                  className={`cpn-btn ${formData.discount_type === 'FIXED' ? 'cpn-btn-primary' : 'cpn-btn-secondary'}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <IndianRupee size={16} />
                  <span>Fixed Amount Discount</span>
                </button>
              </div>
            </div>

            {/* Discount Value */}
            <div className="cpn-form-group">
              <label htmlFor="discount-val">
                {formData.discount_type === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
                <span style={{ color: 'var(--cpn-danger)' }}> *</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="discount-val"
                  type="number"
                  step="any"
                  name="discount_value"
                  className="cpn-form-input"
                  placeholder={formData.discount_type === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 200'}
                  value={formData.discount_value}
                  onChange={handleChange}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--cpn-text-light)', fontWeight: 600 }}>
                  {formData.discount_type === 'PERCENTAGE' ? '%' : '₹'}
                </span>
              </div>
              {errors.discount_value ? (
                <span className="cpn-form-error">{errors.discount_value}</span>
              ) : (
                <span className="cpn-form-help">
                  {formData.discount_type === 'PERCENTAGE' ? 'Enter a number between 1 and 100.' : 'Enter fixed discount in rupees.'}
                </span>
              )}
            </div>

            {/* Max Discount Amount (for Percentage) */}
            {formData.discount_type === 'PERCENTAGE' && (
              <div className="cpn-form-group">
                <label htmlFor="max-discount">Maximum Discount Cap (₹)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="max-discount"
                    type="number"
                    step="any"
                    name="max_discount_amount"
                    className="cpn-form-input"
                    placeholder="e.g. 500 (Leave blank for no cap)"
                    value={formData.max_discount_amount}
                    onChange={handleChange}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--cpn-text-light)', fontWeight: 600 }}>
                    ₹
                  </span>
                </div>
                {errors.max_discount_amount ? (
                  <span className="cpn-form-error">{errors.max_discount_amount}</span>
                ) : (
                  <span className="cpn-form-help">Highest discount allowed for this percentage coupon.</span>
                )}
              </div>
            )}

            {/* Minimum Order Amount */}
            <div className="cpn-form-group">
              <label htmlFor="min-order">Minimum Order Amount (₹)</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="min-order"
                  type="number"
                  step="any"
                  name="min_order_amount"
                  className="cpn-form-input"
                  placeholder="e.g. 500 (0 for no minimum)"
                  value={formData.min_order_amount}
                  onChange={handleChange}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--cpn-text-light)', fontWeight: 600 }}>
                  ₹
                </span>
              </div>
              {errors.min_order_amount ? (
                <span className="cpn-form-error">{errors.min_order_amount}</span>
              ) : (
                <span className="cpn-form-help">Cart subtotal required before coupon can be applied.</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. VALIDITY DATES */}
        <div className="cpn-form-card">
          <div className="cpn-form-section-title">
            <Calendar size={18} style={{ color: 'var(--cpn-primary)' }} />
            <span>Validity Period</span>
          </div>

          <div className="cpn-form-grid">
            <div className="cpn-form-group">
              <label htmlFor="start-date">Start Date</label>
              <input
                id="start-date"
                type="date"
                name="start_date"
                className="cpn-form-input"
                value={formData.start_date}
                onChange={handleChange}
              />
              <span className="cpn-form-help">Date the coupon becomes active. Leave blank for immediate.</span>
            </div>

            <div className="cpn-form-group">
              <label htmlFor="expiry-date">End / Expiry Date</label>
              <input
                id="expiry-date"
                type="date"
                name="expiry_date"
                className="cpn-form-input"
                value={formData.expiry_date}
                onChange={handleChange}
              />
              {errors.expiry_date ? (
                <span className="cpn-form-error">{errors.expiry_date}</span>
              ) : (
                <span className="cpn-form-help">Date the coupon expires. Leave blank for no expiry.</span>
              )}
            </div>
          </div>
        </div>

        {/* 4. USAGE LIMITS */}
        <div className="cpn-form-card">
          <div className="cpn-form-section-title">
            <Users size={18} style={{ color: 'var(--cpn-primary)' }} />
            <span>Usage Limits & Restrictions</span>
          </div>

          <div className="cpn-form-grid">
            <div className="cpn-form-group">
              <label htmlFor="usage-limit">Total Usage Limit</label>
              <input
                id="usage-limit"
                type="number"
                name="usage_limit"
                className="cpn-form-input"
                placeholder="e.g. 100 (Leave blank for unlimited)"
                value={formData.usage_limit}
                onChange={handleChange}
              />
              {errors.usage_limit ? (
                <span className="cpn-form-error">{errors.usage_limit}</span>
              ) : (
                <span className="cpn-form-help">Maximum times this code can be redeemed across all customers.</span>
              )}
            </div>

            <div className="cpn-form-group">
              <label htmlFor="per-user-limit">Usage Limit Per Customer</label>
              <input
                id="per-user-limit"
                type="number"
                name="per_user_limit"
                className="cpn-form-input"
                placeholder="e.g. 1"
                value={formData.per_user_limit}
                onChange={handleChange}
              />
              {errors.per_user_limit ? (
                <span className="cpn-form-error">{errors.per_user_limit}</span>
              ) : (
                <span className="cpn-form-help">Maximum times an individual registered customer can use this code.</span>
              )}
            </div>

            <div className="cpn-form-group" style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="first_order_only"
                  checked={formData.first_order_only}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--cpn-primary)', cursor: 'pointer' }}
                />
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--cpn-text-main)' }}>First Order Only</span>
                  <div style={{ fontSize: '12px', color: 'var(--cpn-text-muted)' }}>
                    Only customers who have never placed a prior order can apply this coupon code.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* 5. ELIGIBILITY / RESTRICTIONS */}
        <div className="cpn-form-card">
          <div className="cpn-form-section-title">
            <ShieldCheck size={18} style={{ color: 'var(--cpn-primary)' }} />
            <span>Eligibility (Categories, Brands & Products)</span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--cpn-text-muted)', marginTop: '-8px', marginBottom: '18px' }}>
            Optionally restrict this coupon to specific categories, brands, or products. If none are selected, the coupon applies to all products storewide.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Categories */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Applicable Categories ({formData.applicable_categories.length} selected)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {metaOptions.categories.map(cat => {
                  const isSelected = formData.applicable_categories.includes(cat.name) || formData.applicable_categories.includes(String(cat.id));
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleArrayItem('applicable_categories', cat.name)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 500,
                        border: isSelected ? '1px solid var(--cpn-primary)' : '1px solid var(--cpn-card-border)',
                        backgroundColor: isSelected ? 'var(--cpn-primary-light)' : '#FFFFFF',
                        color: isSelected ? 'var(--cpn-primary)' : 'var(--cpn-text-main)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isSelected && <Check size={12} />}
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brands */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Applicable Brands ({formData.applicable_brands.length} selected)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {metaOptions.brands.map(brand => {
                  const isSelected = formData.applicable_brands.includes(brand.name) || formData.applicable_brands.includes(String(brand.id));
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => toggleArrayItem('applicable_brands', brand.name)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 500,
                        border: isSelected ? '1px solid var(--cpn-primary)' : '1px solid var(--cpn-card-border)',
                        backgroundColor: isSelected ? 'var(--cpn-primary-light)' : '#FFFFFF',
                        color: isSelected ? 'var(--cpn-primary)' : 'var(--cpn-text-main)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isSelected && <Check size={12} />}
                      <span>{brand.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Specific Products */}
            {metaOptions.products.length > 0 && (
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Applicable Products ({formData.applicable_products.length} selected)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '180px', overflowY: 'auto', padding: '4px' }}>
                  {metaOptions.products.slice(0, 30).map(prod => {
                    const isSelected = formData.applicable_products.includes(prod.id) || formData.applicable_products.includes(String(prod.id));
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => toggleArrayItem('applicable_products', prod.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 500,
                          border: isSelected ? '1px solid var(--cpn-primary)' : '1px solid var(--cpn-card-border)',
                          backgroundColor: isSelected ? 'var(--cpn-primary-light)' : '#FFFFFF',
                          color: isSelected ? 'var(--cpn-primary)' : 'var(--cpn-text-main)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isSelected && <Check size={12} />}
                        <span>{prod.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 6. STATUS */}
        <div className="cpn-form-card">
          <div className="cpn-form-section-title">
            <ShieldCheck size={18} style={{ color: 'var(--cpn-primary)' }} />
            <span>Status</span>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="status"
                value="ACTIVE"
                checked={formData.status === 'ACTIVE'}
                onChange={handleChange}
                style={{ width: '18px', height: '18px', accentColor: 'var(--cpn-primary)', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600, color: 'var(--cpn-success)' }}>Active (Enabled)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="status"
                value="INACTIVE"
                checked={formData.status === 'INACTIVE'}
                onChange={handleChange}
                style={{ width: '18px', height: '18px', accentColor: 'var(--cpn-primary)', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600, color: 'var(--cpn-danger)' }}>Disabled (Inactive)</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginBottom: '40px' }}>
          <button
            type="button"
            className="cpn-btn cpn-btn-secondary"
            onClick={() => navigate('/admin/coupons')}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="cpn-btn cpn-btn-primary"
            disabled={saving}
            style={{ minWidth: '150px', justifyContent: 'center' }}
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : isEditMode ? 'Update Coupon' : 'Create Coupon'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
