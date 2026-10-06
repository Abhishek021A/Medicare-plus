import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Printer, 
  RefreshCw, 
  XCircle, 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  CreditCard, 
  MapPin, 
  User, 
  FileText, 
  AlertCircle, 
  Loader2,
  Calendar,
  Layers
} from 'lucide-react';
import { adminOrderService } from '../../../services/adminApi';
import { useToast } from '../../../context/ToastContext';
import ProductThumbnail from '../inventory/ProductThumbnail';
import UpdateStatusModal from './UpdateStatusModal';
import PrintableInvoice from './PrintableInvoice';
import './AdminOrders.css';

export default function AdminOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const { addToast } = useToast();

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminOrderService.getOrderDetails(id);
      if (response && response.success) {
        setOrder(response.order || response.data);
      } else {
        throw new Error(response?.message || 'Order not found');
      }
    } catch (err) {
      console.error('Fetch order details error:', err);
      setError(err.response?.data?.message || err.message || 'Unable to load order details');
      addToast('error', 'Failed to retrieve order details.');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id, fetchOrder]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
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
      <div className="orders-page-wrapper">
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Loader2 size={36} className="spin-slow" style={{ margin: '0 auto 16px', color: '#087F73' }} />
          <div style={{ fontSize: '15px', color: '#64748B' }}>Loading order details...</div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="orders-page-wrapper">
        <div className="inv-error-state" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '50px 20px' }}>
          <div className="inv-state-icon-box error">
            <AlertCircle size={32} />
          </div>
          <h3 className="inv-state-title">Order Not Found</h3>
          <p className="inv-state-desc">{error || `Order #${id} does not exist in the database.`}</p>
          <Link to="/admin/orders" className="inv-btn inv-btn-primary">
            <ArrowLeft size={16} />
            <span>Back to Orders</span>
          </Link>
        </div>
      </div>
    );
  }

  const steps = [
    { key: 'CONFIRMED', label: 'Order Placed' },
    { key: 'PROCESSING', label: 'Processing' },
    { key: 'PACKED', label: 'Packed' },
    { key: 'SHIPPED', label: 'Shipped' },
    { key: 'DELIVERED', label: 'Delivered' }
  ];

  const currentStatus = order.order_status || 'CONFIRMED';
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'REFUNDED';

  const getStepIndex = (status) => {
    switch (status) {
      case 'PENDING': return 0;
      case 'CONFIRMED': return 0;
      case 'PROCESSING': return 1;
      case 'PACKED': return 2;
      case 'SHIPPED': return 3;
      case 'OUT_FOR_DELIVERY': return 3;
      case 'DELIVERED': return 4;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex(currentStatus);

  const address = order.shipping_address || {};

  return (
    <div className="orders-page-wrapper">
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <Link to="/admin/orders" className="inv-btn inv-btn-outline inv-btn-sm">
          <ArrowLeft size={16} />
          <span>Back to All Orders</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="inv-btn inv-btn-outline"
            onClick={() => setIsInvoiceModalOpen(true)}
          >
            <Printer size={16} />
            <span>Print Invoice</span>
          </button>

          <button
            type="button"
            className="inv-btn inv-btn-primary"
            onClick={() => setIsStatusModalOpen(true)}
          >
            <RefreshCw size={16} />
            <span>Update Status</span>
          </button>
        </div>
      </div>

      {/* Order Banner */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E5E9EB',
        padding: '24px',
        boxShadow: '0 2px 8px -2px rgba(16, 24, 40, 0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1E293B', margin: 0 }}>
              Order {order.order_number || `#ORD-${order.id}`}
            </h1>
            <span className={`ord-status-badge status-${currentStatus.toLowerCase()}`}>
              <span className="ord-status-dot" />
              {currentStatus}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Placed on: <strong>{formatDate(order.created_at)}</strong></span>
            <span>•</span>
            <span>Customer: <strong>{order.customer_name || 'Customer'}</strong></span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#64748B' }}>Total Amount</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#087F73' }}>
            {formatCurrency(order.total_amount)}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="ord-details-grid">
        {/* LEFT COLUMN: Stepper, Items, Financials, History */}
        <div>
          {/* Status Stepper */}
          <div className="ord-details-card">
            <h3 className="ord-details-card-title">
              <Truck size={18} color="#087F73" />
              Fulfillment Status
            </h3>

            {isCancelled ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#FEF2F2',
                borderRadius: '8px',
                border: '1px solid #FECACA',
                color: '#991B1B'
              }}>
                <XCircle size={24} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>Order Cancelled</div>
                  <div style={{ fontSize: '13px' }}>
                    This order was cancelled on {formatDate(order.updated_at)}. Product stock was automatically restored to inventory.
                  </div>
                </div>
              </div>
            ) : (
              <div className="ord-timeline">
                {steps.map((step, idx) => {
                  const isCompleted = idx < currentStepIdx;
                  const isActive = idx === currentStepIdx;

                  return (
                    <div 
                      key={step.key} 
                      className={`ord-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                    >
                      <div className="ord-step-circle">
                        {isCompleted ? <CheckCircle2 size={18} /> : idx + 1}
                      </div>
                      <div className="ord-step-label">{step.label}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ordered Products Table */}
          <div className="ord-details-card">
            <h3 className="ord-details-card-title">
              <Package size={18} color="#087F73" />
              Order Items ({order.items?.length || 0})
            </h3>

            <div className="inv-table-responsive">
              <table className="inv-table" style={{ fontSize: '13.5px' }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <ProductThumbnail image={item.image} name={item.product_name} size={42} />
                          <div>
                            <div style={{ fontWeight: 600, color: '#1E293B' }}>
                              {item.product_name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                              {item.sku || 'SKU-NONE'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ color: '#475569' }}>
                        {item.category_name || 'General'}
                      </td>

                      <td style={{ textAlign: 'right', color: '#475569' }}>
                        {formatCurrency(item.price)}
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {item.quantity}
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#1E293B' }}>
                        {formatCurrency((item.quantity || 1) * (item.price || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Breakdown */}
            <div style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <div style={{ width: '320px' }}>
                <div className="ord-breakdown-row">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>

                {parseFloat(order.discount_amount) > 0 && (
                  <div className="ord-breakdown-row" style={{ color: '#059669' }}>
                    <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                    <span>-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}

                <div className="ord-breakdown-row">
                  <span>Delivery Charge</span>
                  <span>{parseFloat(order.shipping_fee) === 0 ? 'FREE' : formatCurrency(order.shipping_fee)}</span>
                </div>

                <div className="ord-breakdown-row total-row">
                  <span>Total Amount</span>
                  <span className="val">{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Timeline History */}
          <div className="ord-details-card">
            <h3 className="ord-details-card-title">
              <Clock size={18} color="#087F73" />
              Order Status History & Audit Log
            </h3>

            {(order.status_history || []).length === 0 ? (
              <div style={{ color: '#64748B', fontSize: '13px', padding: '12px 0' }}>
                No status changes recorded yet.
              </div>
            ) : (
              <div className="inv-table-responsive">
                <table className="inv-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Date & Time</th>
                      <th>Updated By</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.status_history.map(hist => (
                      <tr key={hist.id}>
                        <td>
                          <span className={`ord-status-badge status-${hist.status.toLowerCase()}`}>
                            <span className="ord-status-dot" />
                            {hist.status}
                          </span>
                        </td>
                        <td style={{ color: '#475569', whiteSpace: 'nowrap' }}>
                          {formatDate(hist.created_at)}
                        </td>
                        <td style={{ fontWeight: 500, color: '#1E293B', whiteSpace: 'nowrap' }}>
                          {hist.admin_name || 'System / Customer'}
                        </td>
                        <td style={{ color: '#64748B' }}>
                          {hist.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Customer, Shipping Address, Payment */}
        <div>
          {/* Customer Snapshot */}
          <div className="ord-details-card">
            <h3 className="ord-details-card-title">
              <User size={18} color="#087F73" />
              Customer Information
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div className="ord-avatar" style={{ width: '46px', height: '46px', fontSize: '16px' }}>
                {order.customer_name ? order.customer_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CU'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>
                  {order.customer_name || 'Valued Customer'}
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                  ID: #{order.user_id}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#475569' }}>
              <div><strong>Email:</strong> {order.customer_email || 'N/A'}</div>
              <div><strong>Phone:</strong> {order.customer_phone || 'N/A'}</div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="ord-details-card">
            <h3 className="ord-details-card-title">
              <MapPin size={18} color="#087F73" />
              Shipping Address
            </h3>

            <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#334155' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                {address.name || order.customer_name}
              </div>
              <div>{address.address_line1 || address.address_line_1 || 'Primary Address'}</div>
              {address.address_line2 || address.address_line_2 ? <div>{address.address_line2 || address.address_line_2}</div> : null}
              <div>
                {address.city ? `${address.city}, ` : ''}{address.state ? `${address.state} ` : ''}{address.postal_code || address.pin_code || ''}
              </div>
              {address.landmark ? <div style={{ color: '#64748B', fontSize: '12px' }}>Landmark: {address.landmark}</div> : null}
              <div style={{ marginTop: '8px', color: '#64748B' }}>
                Contact: {address.phone || order.customer_phone || 'N/A'}
              </div>
            </div>
          </div>

          {/* Payment Snapshot */}
          <div className="ord-details-card">
            <h3 className="ord-details-card-title">
              <CreditCard size={18} color="#087F73" />
              Payment Information
            </h3>

            <div style={{ fontSize: '13px', lineHeight: '1.7', color: '#475569' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Method:</span>
                <strong>{order.payment_method || 'COD'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span>Status:</span>
                <span className={`ord-pay-badge ${order.payment_status === 'PAID' ? 'badge-in-stock' : order.payment_status === 'REFUNDED' ? 'status-refunded' : 'badge-low-stock'}`}>
                  {order.payment_status || 'PENDING'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span>Inventory Deducted:</span>
                <strong>{order.inventory_deducted ? 'Yes (Live Stock Synced)' : 'No (Restored)'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      <UpdateStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        order={order}
        onSuccess={() => {
          fetchOrder();
        }}
      />

      {/* Printable Invoice Modal */}
      <PrintableInvoice
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        order={order}
      />
    </div>
  );
}
