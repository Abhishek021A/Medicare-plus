import React, { useEffect } from 'react';
import { X, Printer } from 'lucide-react';

export default function PrintableInvoice({
  isOpen = true,
  onClose,
  order,
  autoPrint = false
}) {
  // Auto-print effect when autoPrint is true and DOM is ready
  useEffect(() => {
    if (order && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [order, autoPrint]);

  // Keyboard accessibility: Escape closes dialog
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(Number(val) || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const address = order.shipping_address || {};
  const items = order.items || [];
  const orderNumber = order.order_number || `#ORD-${String(order.id).padStart(4, '0')}`;
  const subtotal = Number(order.subtotal) || 0;
  const discount = Number(order.discount_amount) || 0;
  const delivery = Number(order.shipping_fee) || 0;
  const tax = Number(order.tax_amount) || 0;
  const total = Number(order.total_amount) || (subtotal + delivery - discount + tax);

  return (
    <div className="inv-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="inv-modal-card modal-lg printable-invoice-container" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '850px', backgroundColor: '#FFFFFF' }}
      >
        {/* Modal Top Actions (Hidden during print) */}
        <div className="inv-modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="inv-modal-title">Tax Invoice</h2>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
              ({orderNumber})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="inv-btn inv-btn-primary inv-btn-sm"
              onClick={handlePrint}
            >
              <Printer size={16} />
              <span>Print Invoice</span>
            </button>
            <button
              type="button"
              className="inv-modal-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Document Body */}
        <div className="inv-modal-body" style={{ padding: '40px 48px', backgroundColor: '#FFFFFF' }}>
          {/* 1. Brand Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #087F73', paddingBottom: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#087F73', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                MEDICARE PLUS
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginTop: '4px' }}>
                Your Trusted Online Pharmacy
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px', lineHeight: '1.4' }}>
                Licensed Pharmacy & Healthcare Services<br />
                Drug License: DL-2026-OD-88741 | GSTIN: 21AAACM9928P1Z8<br />
                Plot 42, Infocity Avenue, Patia, Bhubaneswar, Odisha 751024
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', letterSpacing: '0.04em' }}>
                TAX INVOICE
              </div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>
                Order: <strong style={{ color: '#087F73', fontFamily: 'monospace', fontSize: '14px' }}>{orderNumber}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                Date: <strong>{formatDate(order.created_at)}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                Payment: <strong>{order.payment_status || 'PENDING'}</strong> ({order.payment_method === 'COD' ? 'Cash on Delivery' : (order.payment_method || 'Online')})
              </div>
            </div>
          </div>

          {/* 2. Customer & Shipping Address */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', marginBottom: '28px', fontSize: '13px' }}>
            {/* Customer Details */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontWeight: 700, textTransform: 'uppercase', color: '#087F73', fontSize: '11px', letterSpacing: '0.05em', marginBottom: '8px' }}>
                CUSTOMER
              </div>
              <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '14.5px' }}>
                {order.customer_name || 'Registered Customer'}
              </div>
              <div style={{ color: '#475569', marginTop: '4px', lineHeight: '1.5' }}>
                Email: {order.customer_email || 'N/A'}<br />
                Phone: {order.customer_phone || address.phone || 'N/A'}
              </div>
            </div>

            {/* Shipping Address */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontWeight: 700, textTransform: 'uppercase', color: '#087F73', fontSize: '11px', letterSpacing: '0.05em', marginBottom: '8px' }}>
                SHIPPING ADDRESS
              </div>
              <div style={{ fontWeight: 600, color: '#1E293B' }}>
                {address.name || order.customer_name || 'Recipient'}
              </div>
              <div style={{ color: '#475569', marginTop: '4px', lineHeight: '1.5' }}>
                {address.address_line_1 || address.address_line1 || 'Primary Delivery Address'}<br />
                {(address.address_line_2 || address.address_line2) && (
                  <>{address.address_line_2 || address.address_line2}<br /></>
                )}
                {address.landmark && <>Landmark: {address.landmark}<br /></>}
                {address.city ? `${address.city}, ` : ''}{address.state ? `${address.state} ` : ''}{address.pin_code || address.postal_code ? `- ${address.pin_code || address.postal_code}` : ''}
              </div>
            </div>
          </div>

          {/* 3. Items Table */}
          <div style={{ marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569', width: '35px' }}>#</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569' }}>Product</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569' }}>SKU</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569', textAlign: 'center', width: '60px' }}>Qty</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569', textAlign: 'right', width: '100px' }}>Price</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569', textAlign: 'right', width: '110px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>
                      No individual items recorded for this order.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => {
                    const itemQty = Number(item.quantity) || 1;
                    const itemPrice = Number(item.price) || 0;
                    const itemTotal = itemQty * itemPrice;

                    return (
                      <tr key={item.id || index} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '12px 12px', color: '#94A3B8' }}>{index + 1}</td>
                        <td style={{ padding: '12px 12px', fontWeight: 600, color: '#1E293B' }}>
                          {item.product_name}
                        </td>
                        <td style={{ padding: '12px 12px', color: '#64748B', fontFamily: 'monospace', fontSize: '12px' }}>
                          {item.sku || '—'}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600 }}>
                          {itemQty}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'right', color: '#475569' }}>
                          {formatCurrency(itemPrice)}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 700, color: '#1E293B' }}>
                          {formatCurrency(itemTotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Financial Totals Breakdown */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px' }}>
            <div style={{ width: '320px', fontSize: '13.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#475569' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#059669' }}>
                  <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}:</span>
                  <span style={{ fontWeight: 600 }}>-{formatCurrency(discount)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#475569' }}>
                <span>Delivery:</span>
                <span style={{ fontWeight: 600 }}>{delivery === 0 ? 'FREE' : formatCurrency(delivery)}</span>
              </div>

              {tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#475569' }}>
                  <span>Tax:</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(tax)}</span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderTop: '2px solid #087F73',
                marginTop: '8px',
                fontSize: '17px',
                fontWeight: 800,
                color: '#087F73'
              }}>
                <span>TOTAL:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* 5. Summary Status Info */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            marginBottom: '24px',
            fontSize: '13px'
          }}>
            <div>
              Payment Status: <strong style={{ color: '#087F73' }}>{order.payment_status || 'PENDING'}</strong>
            </div>
            <div>
              Order Status: <strong style={{ color: '#1E293B' }}>{order.order_status || 'CONFIRMED'}</strong>
            </div>
          </div>

          {/* 6. Footer Terms */}
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', fontSize: '11.5px', color: '#94A3B8', textAlign: 'center', lineHeight: '1.5' }}>
            <strong style={{ color: '#64748B' }}>Thank you for shopping with Medicare PLUS.</strong><br />
            For prescription refills or medical inquiries, contact support at care@medicareplus.com or call +91-1800-419-7427.<br />
            This is a computer-generated tax invoice and requires no physical signature.
          </div>
        </div>

        {/* Modal Footer (Hidden during print) */}
        <div className="inv-modal-footer no-print">
          <button type="button" className="inv-btn inv-btn-outline" onClick={onClose}>
            Close
          </button>
          <button type="button" className="inv-btn inv-btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
}
