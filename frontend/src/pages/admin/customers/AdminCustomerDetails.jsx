import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  MapPin,
  ShoppingBag,
  FileText,
  Heart,
  Activity,
  Edit2,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Clock,
  Package,
  IndianRupee,
  RefreshCw,
  Eye,
  Star
} from 'lucide-react';
import { adminCustomerService } from '../../../services/adminApi';
import EditCustomerModal from './EditCustomerModal';
import BlockCustomerModal from './BlockCustomerModal';
import './AdminCustomers.css';

export default function AdminCustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Active tab
  const [activeTab, setActiveTab] = useState('orders');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [targetBlockStatus, setTargetBlockStatus] = useState('BLOCKED');

  // Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchCustomerDetails = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await adminCustomerService.getCustomerDetails(id);
      if (res && res.success) {
        const payload = res.data || res;
        setCustomerData(payload);
      } else {
        setError(res.message || 'Customer not found.');
      }
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError('Unable to load customer details. Please verify the customer ID and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomerDetails();
  }, [fetchCustomerDetails]);

  const handleEditSuccess = (updatedCustomer) => {
    setCustomerData((prev) => ({
      ...prev,
      customer: { ...prev.customer, ...updatedCustomer }
    }));
    showToast('Customer profile updated successfully', 'success');
  };

  const handleBlockSuccess = (customerId, newStatus) => {
    setCustomerData((prev) => ({
      ...prev,
      customer: { ...prev.customer, status: newStatus }
    }));
    showToast(
      newStatus === 'BLOCKED' ? 'Customer blocked successfully' : 'Customer unblocked successfully',
      'success'
    );
  };

  const formatCurrency = (amt) => {
    const num = parseFloat(amt) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="cus-page-wrapper">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="cus-skeleton" style={{ width: '220px', height: '36px' }} />
          <div className="cus-details-grid">
            <div className="cus-skeleton" style={{ height: '480px', borderRadius: '16px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="cus-skeleton" style={{ height: '90px', borderRadius: '12px' }} />
              <div className="cus-skeleton" style={{ height: '380px', borderRadius: '16px' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !customerData?.customer) {
    return (
      <div className="cus-page-wrapper">
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid var(--cus-card-border)',
          padding: '48px 24px',
          textAlign: 'center',
          maxWidth: '540px',
          margin: '40px auto',
          boxShadow: 'var(--cus-card-shadow)'
        }}>
          <AlertTriangle size={48} style={{ color: 'var(--cus-danger)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--cus-text-main)' }}>
            Customer Record Not Found
          </h2>
          <p style={{ color: 'var(--cus-text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            {error || 'The requested customer profile could not be found or has been removed.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Link to="/admin/customers" className="cus-btn cus-btn-primary">
              <ArrowLeft size={16} />
              <span>Back to Customers</span>
            </Link>
            <button className="cus-btn cus-btn-secondary" onClick={() => fetchCustomerDetails(true)}>
              <RefreshCw size={16} />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { customer, statistics = {}, addresses = [], orders = [], prescriptions = [], wishlist = [], reviews = [] } = customerData;
  const isBlocked = customer.status === 'BLOCKED' || customer.status === 'INACTIVE';

  // Build real activity timeline from database events
  const activityEvents = [
    {
      id: 'reg',
      type: 'registration',
      title: 'Customer Registered',
      description: 'Account created with email ' + customer.email,
      date: customer.created_at,
      icon: <CheckCircle2 size={16} style={{ color: 'var(--cus-primary)' }} />
    },
    ...orders.map((o) => ({
      id: `ord-${o.id}`,
      type: 'order',
      title: `Placed Order #${o.order_number}`,
      description: `Amount: ${formatCurrency(o.total_amount)} • Status: ${o.order_status}`,
      date: o.created_at,
      icon: <ShoppingBag size={16} style={{ color: '#7C3AED' }} />
    })),
    ...prescriptions.map((p) => ({
      id: `rx-${p.id}`,
      type: 'prescription',
      title: `Uploaded Prescription #${p.prescription_number}`,
      description: `Status: ${p.status} ${p.reviewer_name ? '• Reviewed by ' + p.reviewer_name : ''}`,
      date: p.created_at,
      icon: <FileText size={16} style={{ color: '#0284C7' }} />
    })),
    ...wishlist.map((w) => ({
      id: `wl-${w.wishlist_item_id || w.product_id}`,
      type: 'wishlist',
      title: `Added to Wishlist: ${w.product_name || w.name}`,
      description: `Price: ${formatCurrency(w.price)}`,
      date: w.added_at || customer.created_at,
      icon: <Heart size={16} style={{ color: '#E11D48' }} />
    })),
    ...reviews.map((r) => ({
      id: `rev-${r.id}`,
      type: 'review',
      title: `Reviewed: ${r.product_name || 'Product'} (${r.rating}★)`,
      description: `"${r.title ? r.title + ': ' : ''}${r.comment || ''}"`,
      date: r.created_at,
      icon: <Star size={16} style={{ color: '#F59E0B' }} />
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="cus-page-wrapper">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '10px',
          backgroundColor: toastMessage.type === 'error' ? '#EF4444' : '#087F73',
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          animation: 'cusFadeIn 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toastMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div className="cus-header">
        <div>
          <div className="cus-breadcrumb">
            <Link to="/admin">Admin</Link>
            <span>/</span>
            <Link to="/admin/customers">Customers</Link>
            <span>/</span>
            <span className="cus-breadcrumb-current">{customer.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, margin: 0, color: 'var(--cus-text-main)' }}>
              {customer.name}
            </h1>
            <span className={`cus-badge ${isBlocked ? 'cus-badge-blocked' : 'cus-badge-active'}`}>
              <span className="cus-badge-dot" />
              <span>{isBlocked ? 'Blocked' : 'Active Account'}</span>
            </span>
            <span style={{ fontSize: '13px', color: 'var(--cus-text-light)', fontWeight: 600 }}>
              {customer.customer_code || `CUS-${customer.id}`}
            </span>
          </div>
        </div>

        <div className="cus-header-actions">
          <Link to="/admin/customers" className="cus-btn cus-btn-secondary">
            <ArrowLeft size={16} />
            <span>Back to Customers</span>
          </Link>
          <button
            className="cus-btn cus-btn-secondary"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit2 size={16} />
            <span>Edit Customer</span>
          </button>
          {isBlocked ? (
            <button
              className="cus-btn cus-btn-success"
              onClick={() => {
                setTargetBlockStatus('ACTIVE');
                setIsBlockModalOpen(true);
              }}
            >
              <CheckCircle2 size={16} />
              <span>Unblock Customer</span>
            </button>
          ) : (
            <button
              className="cus-btn cus-btn-danger"
              onClick={() => {
                setTargetBlockStatus('BLOCKED');
                setIsBlockModalOpen(true);
              }}
            >
              <ShieldAlert size={16} />
              <span>Block Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="cus-details-grid">
        {/* Left Column: Sidebar Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Profile Hero Card */}
          <div className="cus-sidebar-card">
            <div className="cus-profile-hero">
              <div className="cus-profile-hero-avatar">{customer.initials || 'CU'}</div>
              <div className="cus-profile-hero-name">{customer.name}</div>
              <div className="cus-profile-hero-email">{customer.email}</div>
              <span className={`cus-badge ${isBlocked ? 'cus-badge-blocked' : 'cus-badge-active'}`}>
                <span className="cus-badge-dot" />
                <span>{isBlocked ? 'Account Blocked' : 'Active Customer'}</span>
              </span>
            </div>

            <div className="cus-info-list">
              <div className="cus-info-item">
                <span className="cus-info-label">Customer ID</span>
                <span className="cus-info-val">{customer.customer_code || `CUS-${customer.id}`}</span>
              </div>
              <div className="cus-info-item">
                <span className="cus-info-label">Email</span>
                <span className="cus-info-val">
                  <a href={`mailto:${customer.email}`} style={{ color: 'var(--cus-primary)', textDecoration: 'none' }}>
                    {customer.email}
                  </a>
                </span>
              </div>
              <div className="cus-info-item">
                <span className="cus-info-label">Phone</span>
                <span className="cus-info-val">
                  {customer.phone ? (
                    <a href={`tel:${customer.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {customer.phone}
                    </a>
                  ) : (
                    'Not provided'
                  )}
                </span>
              </div>
              <div className="cus-info-item">
                <span className="cus-info-label">Registered On</span>
                <span className="cus-info-val">{formatDate(customer.created_at)}</span>
              </div>
              <div className="cus-info-item">
                <span className="cus-info-label">Account Role</span>
                <span className="cus-info-val">{customer.role || 'CUSTOMER'}</span>
              </div>
            </div>
          </div>

          {/* Customer Addresses Card */}
          <div className="cus-sidebar-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
                <MapPin size={18} style={{ color: 'var(--cus-primary)' }} />
                <span>Addresses ({addresses.length})</span>
              </div>
            </div>

            {addresses.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--cus-text-muted)', textAlign: 'center', padding: '16px 0' }}>
                No addresses saved by customer.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    style={{
                      border: '1px solid var(--cus-card-border)',
                      borderRadius: '10px',
                      padding: '14px',
                      backgroundColor: addr.is_default ? '#F0FDF4' : '#F8FAFC',
                      borderColor: addr.is_default ? '#BBF7D0' : 'var(--cus-card-border)',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ color: 'var(--cus-text-main)' }}>
                        {addr.is_default ? 'Default Address' : 'Address'}
                      </strong>
                      {addr.is_default ? (
                        <span className="cus-badge cus-badge-active" style={{ fontSize: '10px', padding: '2px 8px' }}>
                          Primary
                        </span>
                      ) : null}
                    </div>
                    <div style={{ color: 'var(--cus-text-main)', lineHeight: '1.5' }}>
                      {addr.address_line_1}
                      {addr.address_line_2 && <div>{addr.address_line_2}</div>}
                      <div>
                        {addr.city}, {addr.state} - <strong>{addr.pin_code}</strong>
                      </div>
                      {addr.landmark && (
                        <div style={{ fontSize: '12px', color: 'var(--cus-text-muted)', marginTop: '4px' }}>
                          Landmark: {addr.landmark}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Mini Stats & Tabs Content */}
        <div className="cus-tabs-wrapper">
          {/* Quick Statistics Cards */}
          <div className="cus-stats-cards-row">
            <div className="cus-mini-stat">
              <span className="cus-mini-stat-label">Total Orders</span>
              <span className="cus-mini-stat-val" style={{ color: '#7C3AED' }}>
                {statistics.total_orders ?? orders.length}
              </span>
            </div>

            <div className="cus-mini-stat">
              <span className="cus-mini-stat-label">Delivered</span>
              <span className="cus-mini-stat-val" style={{ color: '#16A34A' }}>
                {statistics.completed_orders ?? 0}
              </span>
            </div>

            <div className="cus-mini-stat">
              <span className="cus-mini-stat-label">Total Spent</span>
              <span className="cus-mini-stat-val" style={{ color: 'var(--cus-primary)' }}>
                {formatCurrency(statistics.total_spent)}
              </span>
            </div>

            <div className="cus-mini-stat">
              <span className="cus-mini-stat-label">Prescriptions</span>
              <span className="cus-mini-stat-val" style={{ color: '#0284C7' }}>
                {statistics.prescriptions ?? prescriptions.length}
              </span>
            </div>

            <div className="cus-mini-stat">
              <span className="cus-mini-stat-label">Wishlist</span>
              <span className="cus-mini-stat-val" style={{ color: '#E11D48' }}>
                {statistics.wishlist_items ?? wishlist.length}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="cus-tab-nav">
            <button
              className={`cus-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <ShoppingBag size={16} />
              <span>Orders ({orders.length})</span>
            </button>
            <button
              className={`cus-tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
              onClick={() => setActiveTab('prescriptions')}
            >
              <FileText size={16} />
              <span>Prescriptions ({prescriptions.length})</span>
            </button>
            <button
              className={`cus-tab-btn ${activeTab === 'wishlist' ? 'active' : ''}`}
              onClick={() => setActiveTab('wishlist')}
            >
              <Heart size={16} />
              <span>Wishlist ({wishlist.length})</span>
            </button>
            <button
              className={`cus-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              <Star size={16} />
              <span>Reviews ({reviews.length})</span>
            </button>
            <button
              className={`cus-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <Activity size={16} />
              <span>Activity Timeline ({activityEvents.length})</span>
            </button>
          </div>

          {/* Tab Content Cards */}
          <div className="cus-tab-content-card">
            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                {orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--cus-text-muted)' }}>
                    <Package size={36} style={{ margin: '0 auto 12px', color: 'var(--cus-text-light)' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No orders placed by this customer yet.</p>
                  </div>
                ) : (
                  <div className="cus-table-responsive" style={{ margin: '-20px' }}>
                    <table className="cus-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Date</th>
                          <th>Items</th>
                          <th>Total Amount</th>
                          <th>Payment</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((ord) => (
                          <tr key={ord.id}>
                            <td>
                              <span style={{ fontWeight: 700, color: 'var(--cus-primary)' }}>
                                {ord.order_number}
                              </span>
                            </td>
                            <td>{formatDate(ord.created_at)}</td>
                            <td>{ord.item_count || 1} items</td>
                            <td>
                              <strong>{formatCurrency(ord.total_amount)}</strong>
                            </td>
                            <td>
                              <span style={{ fontSize: '12px' }}>
                                {ord.payment_method} ({ord.payment_status})
                              </span>
                            </td>
                            <td>
                              <span className="cus-badge" style={{
                                backgroundColor: ord.order_status === 'DELIVERED' ? '#ECFDF5' : '#EFF6FF',
                                color: ord.order_status === 'DELIVERED' ? '#059669' : '#2563EB',
                                border: '1px solid transparent'
                              }}>
                                {ord.order_status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <Link
                                to={`/admin/orders/${ord.id}`}
                                className="cus-action-btn view"
                              >
                                <ExternalLink size={12} />
                                <span>Details</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Prescriptions Tab */}
            {activeTab === 'prescriptions' && (
              <div>
                {prescriptions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--cus-text-muted)' }}>
                    <FileText size={36} style={{ margin: '0 auto 12px', color: 'var(--cus-text-light)' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No prescriptions uploaded yet.</p>
                  </div>
                ) : (
                  <div className="cus-table-responsive" style={{ margin: '-20px' }}>
                    <table className="cus-table">
                      <thead>
                        <tr>
                          <th>Prescription</th>
                          <th>Uploaded</th>
                          <th>Status</th>
                          <th>Reviewer</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescriptions.map((rx) => (
                          <tr key={rx.id}>
                            <td>
                              <strong style={{ color: 'var(--cus-primary)' }}>
                                {rx.prescription_number}
                              </strong>
                              {rx.order_number && (
                                <div style={{ fontSize: '11px', color: 'var(--cus-text-muted)' }}>
                                  Order: {rx.order_number}
                                </div>
                              )}
                            </td>
                            <td>{formatDate(rx.created_at)}</td>
                            <td>
                              <span className={`cus-badge ${
                                rx.status === 'APPROVED' ? 'cus-badge-active' :
                                rx.status === 'REJECTED' ? 'cus-badge-blocked' : 'cus-badge-inactive'
                              }`}>
                                <span className="cus-badge-dot" />
                                <span>{rx.status}</span>
                              </span>
                            </td>
                            <td>{rx.reviewer_name || 'Not reviewed'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <Link
                                to={`/admin/prescriptions/${rx.id}`}
                                className="cus-action-btn view"
                              >
                                <Eye size={12} />
                                <span>View</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Wishlist Tab */}
            {activeTab === 'wishlist' && (
              <div>
                {wishlist.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--cus-text-muted)' }}>
                    <Heart size={36} style={{ margin: '0 auto 12px', color: 'var(--cus-text-light)' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>Customer wishlist is empty.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                    {wishlist.map((item) => (
                      <div
                        key={item.wishlist_item_id || item.product_id}
                        style={{
                          border: '1px solid var(--cus-card-border)',
                          borderRadius: '12px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          backgroundColor: '#FFFFFF'
                        }}
                      >
                        <div style={{
                          height: '90px',
                          borderRadius: '8px',
                          backgroundColor: '#F8FAFC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.product_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <Package size={28} style={{ color: 'var(--cus-text-light)' }} />
                          )}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--cus-text-main)' }}>
                          {item.product_name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--cus-text-light)' }}>
                          SKU: {item.sku || 'N/A'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                          <span style={{ fontWeight: 700, color: 'var(--cus-primary)', fontSize: '14px' }}>
                            {formatCurrency(item.sale_price || item.price)}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--cus-text-muted)' }}>
                            Stock: {item.stock_quantity ?? '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div>
                {reviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--cus-text-muted)' }}>
                    <Star size={36} style={{ margin: '0 auto 12px', color: 'var(--cus-text-light)' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No reviews submitted by this customer yet.</p>
                  </div>
                ) : (
                  <div className="cus-table-responsive" style={{ margin: '-20px' }}>
                    <table className="cus-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Rating</th>
                          <th>Review Title & Comment</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviews.map((rev) => (
                          <tr key={rev.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {rev.product_image ? (
                                  <img
                                    src={rev.product_image}
                                    alt={rev.product_name}
                                    style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Package size={18} style={{ color: '#94A3B8' }} />
                                  </div>
                                )}
                                <div>
                                  <strong style={{ fontSize: '13px', color: 'var(--cus-text-main)' }}>
                                    {rev.product_name || `Product #${rev.product_id}`}
                                  </strong>
                                  {rev.verified_purchase ? (
                                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                                      ✓ Verified Purchase
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F59E0B' }}>
                                <Star size={14} fill="#F59E0B" />
                                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--cus-text-main)' }}>
                                  {rev.rating}.0
                                </span>
                              </div>
                            </td>
                            <td>
                              {rev.title && (
                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--cus-text-main)', marginBottom: '2px' }}>
                                  {rev.title}
                                </div>
                              )}
                              <div style={{ fontSize: '12px', color: 'var(--cus-text-muted)', maxWidth: '320px', lineHeight: '1.4' }}>
                                {rev.comment}
                              </div>
                            </td>
                            <td>
                              <span className={`cus-badge ${
                                rev.status === 'APPROVED' ? 'cus-badge-active' :
                                rev.status === 'REJECTED' || rev.status === 'HIDDEN' ? 'cus-badge-blocked' : 'cus-badge-inactive'
                              }`}>
                                <span className="cus-badge-dot" />
                                <span>{rev.status}</span>
                              </span>
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--cus-text-muted)' }}>
                              {formatDate(rev.created_at)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <Link
                                to="/admin/reviews"
                                className="cus-action-btn view"
                              >
                                <ExternalLink size={12} />
                                <span>Moderate</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Activity Timeline Tab */}
            {activeTab === 'activity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activityEvents.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      paddingBottom: '14px',
                      borderBottom: '1px solid #F1F5F9'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {evt.icon}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--cus-text-main)' }}>
                          {evt.title}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--cus-text-light)' }}>
                          {formatDateTime(evt.date)}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--cus-text-muted)' }}>
                        {evt.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <EditCustomerModal
        customer={customer}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
      />

      {/* Block / Unblock Modal */}
      <BlockCustomerModal
        customer={customer}
        targetStatus={targetBlockStatus}
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onSuccess={handleBlockSuccess}
      />
    </div>
  );
}
