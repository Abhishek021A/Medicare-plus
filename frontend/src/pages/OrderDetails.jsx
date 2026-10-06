import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Package, CheckCircle2, Truck, FileText, Check, 
  Loader2, AlertTriangle, ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './OrderDetails.css';

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, isLoading: authLoading } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    if (id && currentUser) {
      const fetchOrderDetails = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await api.getOrderDetails(id);
          if (res && res.success && res.order) {
            setOrder(res.order);
          } else {
            setError(res?.message || 'Unable to retrieve order details.');
          }
        } catch (err) {
          console.error("Fetch order error:", err);
          if (err.response?.status === 403) {
            setError("You are not authorized to view this order.");
          } else if (err.response?.status === 404) {
            setError("Order not found.");
          } else {
            setError(err.response?.data?.message || 'Failed to load order details.');
          }
        } finally {
          setLoading(false);
        }
      };

      fetchOrderDetails();
    }
  }, [id, currentUser, authLoading, isAuthenticated, navigate]);

  const renderStatusBadge = (status) => {
    const statusMap = {
      'PENDING': 'badge-warning',
      'Pending': 'badge-warning',
      'CONFIRMED': 'badge-info',
      'Confirmed': 'badge-info',
      'PROCESSING': 'badge-primary',
      'Processing': 'badge-primary',
      'SHIPPED': 'badge-info',
      'Shipped': 'badge-info',
      'DELIVERED': 'badge-success',
      'Delivered': 'badge-success',
      'CANCELLED': 'badge-danger',
      'Cancelled': 'badge-danger',
    };
    return <span className={`status-badge ${statusMap[status] || 'badge-secondary'}`}>{status}</span>;
  };

  if (authLoading || loading) {
    return (
      <div className="order-details-page section-padding" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} className="spinning" style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite', margin: '0 auto 15px auto' }} />
          <p className="text-muted">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-details-page section-padding">
        <div className="container" style={{ maxWidth: '600px', textAlign: 'center', padding: '60px 20px' }}>
          <AlertTriangle size={54} className="text-danger mb-20" style={{ margin: '0 auto' }} />
          <h2>Order Inaccessible</h2>
          <p className="text-muted mt-10 mb-30">{error || "Unable to display this order."}</p>
          <Link to="/account/orders" className="btn-primary" style={{ display: 'inline-block' }}>
            Back to My Orders
          </Link>
        </div>
      </div>
    );
  }

  // Determine timeline progress based on status
  const statuses = ['Order Placed', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
  const statusStr = (order.order_status || order.status || 'CONFIRMED').toUpperCase();
  let currentStatusIndex = 0;
  
  if (statusStr === 'PENDING') currentStatusIndex = 0;
  else if (statusStr === 'CONFIRMED' || statusStr === 'PRESCRIPTION_REVIEW') currentStatusIndex = 1;
  else if (statusStr === 'PROCESSING') currentStatusIndex = 2;
  else if (statusStr === 'SHIPPED') currentStatusIndex = 3;
  else if (statusStr === 'DELIVERED') currentStatusIndex = 4;

  const dateFormatted = order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : 'Recent';

  const subtotal = parseFloat(order.subtotal || 0).toFixed(2);
  const shipping = parseFloat(order.shipping_fee || 0).toFixed(2);
  const total = parseFloat(order.total_amount || 0).toFixed(2);

  const shippingAddr = order.shipping_address || {};
  const addrLine = [shippingAddr.address_line_1, shippingAddr.address_line_2].filter(Boolean).join(', ') || shippingAddr.address || 'Address on file';
  const cityState = [shippingAddr.city, shippingAddr.state].filter(Boolean).join(', ');
  const pin = shippingAddr.pin_code || shippingAddr.pin || '';

  return (
    <div className="order-details-page section-padding">
      <div className="container" style={{ maxWidth: '900px' }}>
        
        <Link to="/account/orders" className="back-link mb-20 text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <ChevronLeft size={16} /> Back to My Orders
        </Link>

        <div className="order-header-card">
          <div className="order-header-info">
            <h1>Order #{order.order_number || `ORD-${order.id}`}</h1>
            <p className="text-muted">Placed on {dateFormatted}</p>
          </div>
          <div className="order-header-status">
            {renderStatusBadge(order.order_status || order.status)}
          </div>
        </div>

        {/* Timeline Tracker */}
        {statusStr !== 'CANCELLED' && (
          <div className="order-tracker-card mt-20">
            <div className="timeline-container">
              {statuses.map((s, index) => (
                <div key={s} className={`timeline-step ${index <= currentStatusIndex ? 'completed' : ''} ${index === currentStatusIndex ? 'current' : ''}`}>
                  <div className="timeline-icon">
                    {index < currentStatusIndex ? <Check size={14} /> : <div className="dot"></div>}
                  </div>
                  <span className="timeline-label">{s}</span>
                  {index < statuses.length - 1 && <div className="timeline-line"></div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="order-layout-grid mt-20">
          
          {/* Left Column: Items */}
          <div className="order-items-column">
            <div className="order-card">
              <h3>Items in this Order</h3>
              
              <div className="order-items-list mt-15">
                {(order.items || []).map((item, idx) => {
                  const itemPrice = parseFloat(item.price || 0).toFixed(2);
                  const itemTotal = (parseFloat(item.price || 0) * parseInt(item.quantity || 1, 10)).toFixed(2);

                  return (
                    <div key={item.id || idx} className="order-item-row">
                      <div className="order-item-details">
                        <div className="item-name-group">
                          <span className="fw-bold">{item.product_name || item.name}</span>
                        </div>
                        <span className="text-muted">Qty: {item.quantity} × ₹{itemPrice}</span>
                      </div>
                      <span className="fw-bold text-primary">₹{itemTotal}</span>
                    </div>
                  );
                })}
              </div>

              <div className="order-summary-totals mt-20">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>{parseFloat(shipping) > 0 ? `₹${shipping}` : 'FREE'}</span>
                </div>
                <div className="summary-row text-success fw-bold total-row">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Info */}
          <div className="order-info-column">
            
            <div className="order-card">
              <h3>Delivery Details</h3>
              <div className="info-block mt-15">
                <p className="fw-bold">{currentUser?.fullName || currentUser?.name || shippingAddr.name || 'Recipient'}</p>
                <p className="text-muted">{addrLine}</p>
                {cityState && <p className="text-muted">{cityState} {pin ? `- ${pin}` : ''}</p>}
                <p className="text-muted mt-5">Phone: {currentUser?.phone || shippingAddr.phone || 'Phone on file'}</p>
              </div>
            </div>

            <div className="order-card mt-20">
              <h3>Payment Summary</h3>
              <div className="info-block mt-15">
                <p className="text-muted mb-5">
                  Method: <span className="fw-bold text-main">{order.payment_method || 'Online / Card'}</span>
                </p>
                <p className="text-muted">
                  Status: <span className={`fw-bold ${(order.payment_status || '').toUpperCase() === 'PAID' ? 'text-success' : 'text-warning'}`}>
                    {order.payment_status || 'Pending'}
                  </span>
                </p>
              </div>
            </div>

            <div className="order-card mt-20">
              <h3>Account Security</h3>
              <div className="info-block mt-15 d-flex align-center gap-10" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={28} className="text-primary" />
                <div>
                  <p className="fw-bold">Verified Account Order</p>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>Assigned to {currentUser.email}</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
