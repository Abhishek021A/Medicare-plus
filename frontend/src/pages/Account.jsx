import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Heart, MapPin, User, LogOut, 
  ChevronRight, Eye, Loader2, Plus, Trash2, CheckCircle2,
  FileText, UploadCloud, AlertCircle, Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import './Account.css';

export default function Account() {
  const { tab } = useParams();
  const [activeTab, setActiveTab] = useState(tab || 'dashboard');
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, isLoading: authLoading, logout, setCurrentUser } = useAuth();
  const { addToast } = useToast();

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  // Addresses State
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressesError, setAddressesError] = useState(null);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState({
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    pin_code: '',
    landmark: '',
    is_default: 0
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Prescriptions State
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [prescriptionsError, setPrescriptionsError] = useState(null);
  const [showUploadRxModal, setShowUploadRxModal] = useState(false);
  const [rxUploadFile, setRxUploadFile] = useState(null);
  const [rxUploadMessage, setRxUploadMessage] = useState('');
  const [isUploadingRx, setIsUploadingRx] = useState(false);

  // Redirect to login if unauthenticated once auth loading is complete
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Sync active tab with URL param
  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  // Populate profile form whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || ''
      });
    }
  }, [currentUser]);

  // Fetch orders when orders tab is active
  useEffect(() => {
    if (activeTab === 'orders' && currentUser) {
      const fetchOrders = async () => {
        setLoadingOrders(true);
        setOrdersError(null);
        try {
          const res = await api.getOrders();
          setOrders(res?.orders || []);
        } catch (err) {
          console.error("Failed to fetch user orders:", err);
          setOrdersError("Unable to load your orders. Please try again.");
        } finally {
          setLoadingOrders(false);
        }
      };
      fetchOrders();
    }
  }, [activeTab, currentUser]);

  // Fetch addresses when addresses tab is active
  useEffect(() => {
    if (activeTab === 'addresses' && currentUser) {
      const fetchAddresses = async () => {
        setLoadingAddresses(true);
        setAddressesError(null);
        try {
          const res = await api.getAddresses();
          setAddresses(res?.addresses || []);
        } catch (err) {
          console.error("Failed to fetch addresses:", err);
          setAddressesError("Unable to load addresses. Please try again.");
        } finally {
          setLoadingAddresses(false);
        }
      };
      fetchAddresses();
    }
  }, [activeTab, currentUser]);

  // Fetch prescriptions when prescriptions tab is active
  const fetchCustomerPrescriptions = async () => {
    if (!currentUser) return;
    setLoadingPrescriptions(true);
    setPrescriptionsError(null);
    try {
      const res = await api.getPrescriptions();
      if (res && res.success) {
        setPrescriptions(res.data?.prescriptions || []);
      }
    } catch (err) {
      console.error("Failed to fetch customer prescriptions:", err);
      setPrescriptionsError("Unable to load your prescriptions. Please try again.");
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'prescriptions' && currentUser) {
      fetchCustomerPrescriptions();
    }
  }, [activeTab, currentUser]);

  const handleUploadPrescription = async (e) => {
    e.preventDefault();
    if (!rxUploadFile) {
      addToast('Please select a file to upload.', 'error');
      return;
    }

    setIsUploadingRx(true);
    try {
      const formData = new FormData();
      formData.append('file', rxUploadFile);
      if (rxUploadMessage.trim()) {
        formData.append('message', rxUploadMessage.trim());
      }

      const res = await api.uploadPrescription(formData);
      if (res && res.success) {
        addToast('✓ Prescription uploaded successfully. Our pharmacist will review it.', 'success');
        setShowUploadRxModal(false);
        setRxUploadFile(null);
        setRxUploadMessage('');
        fetchCustomerPrescriptions();
      } else {
        addToast(res?.message || 'Failed to upload prescription.', 'error');
      }
    } catch (err) {
      console.error("Prescription upload error:", err);
      addToast(err.response?.data?.message || 'Upload failed. Please ensure file is JPG, PNG or PDF under 8MB.', 'error');
    } finally {
      setIsUploadingRx(false);
    }
  };

  const handleTabClick = (newTab) => {
    setActiveTab(newTab);
    navigate(`/account/${newTab}`);
  };

  const handleLogout = async () => {
    await logout();
    addToast('Logged out successfully', 'info');
    navigate('/login');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await api.updateProfile({
        first_name: profileForm.firstName.trim(),
        last_name: profileForm.lastName.trim(),
        phone: profileForm.phone.trim()
      });

      if (res && res.success) {
        const updatedUser = res.user || res.data;
        if (updatedUser) {
          setCurrentUser(updatedUser);
        }
        addToast('✓ Profile updated successfully', 'success');
      } else {
        addToast(res?.message || 'Unable to update profile.', 'error');
      }
    } catch (err) {
      console.error("Profile update error:", err);
      addToast(err.response?.data?.message || 'Unable to update profile.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddAddressSubmit = async (e) => {
    e.preventDefault();
    setIsSavingAddress(true);
    try {
      const res = await api.addAddress(newAddress);
      if (res && res.success) {
        addToast('Address added successfully', 'success');
        setShowAddAddressModal(false);
        setNewAddress({
          address_line_1: '',
          address_line_2: '',
          city: '',
          state: '',
          pin_code: '',
          landmark: '',
          is_default: 0
        });
        // Refresh address list
        const updated = await api.getAddresses();
        setAddresses(updated?.addresses || []);
      } else {
        addToast(res?.message || 'Failed to add address.', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add address.', 'error');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await api.deleteAddress(id);
      addToast('Address removed', 'success');
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      addToast('Failed to delete address', 'error');
    }
  };

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

  // If still checking authentication
  if (authLoading) {
    return (
      <div className="account-page section-padding" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} className="spinning" style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite', margin: '0 auto 15px auto' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Loading account details...</p>
        </div>
      </div>
    );
  }

  // If not logged in
  if (!currentUser) {
    return null;
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return (
          <div className="account-dashboard">
            <h2>Welcome back, {currentUser.fullName || currentUser.name}</h2>
            <p className="text-muted mb-30">
              From your account dashboard you can view your real orders, manage your delivery addresses, and update your personal profile details.
            </p>
            
            <div className="dashboard-cards">
              <button className="dash-card" onClick={() => handleTabClick('orders')} aria-label="Go to Orders">
                <div className="dash-icon" aria-hidden="true"><Package size={24} /></div>
                <div className="dash-info">
                  <h3>My Orders</h3>
                  <p>Check your order history & status</p>
                </div>
              </button>
              <button className="dash-card" onClick={() => navigate('/prescriptions')} aria-label="Go to Prescriptions">
                <div className="dash-icon" aria-hidden="true"><FileText size={24} /></div>
                <div className="dash-info">
                  <h3>My Prescriptions</h3>
                  <p>View uploaded Rx & review status</p>
                </div>
              </button>
              <button className="dash-card" onClick={() => handleTabClick('wishlist')} aria-label="Go to Wishlist">
                <div className="dash-icon" aria-hidden="true"><Heart size={24} /></div>
                <div className="dash-info">
                  <h3>Wishlist</h3>
                  <p>View your saved medicines</p>
                </div>
              </button>
              <button className="dash-card" onClick={() => handleTabClick('addresses')} aria-label="Go to Addresses">
                <div className="dash-icon" aria-hidden="true"><MapPin size={24} /></div>
                <div className="dash-info">
                  <h3>Addresses</h3>
                  <p>Manage shipping locations</p>
                </div>
              </button>
              <button className="dash-card" onClick={() => handleTabClick('profile')} aria-label="Go to Profile">
                <div className="dash-icon" aria-hidden="true"><User size={24} /></div>
                <div className="dash-info">
                  <h3>Profile</h3>
                  <p>Edit your name & phone number</p>
                </div>
              </button>
            </div>
          </div>
        );

      case 'orders':
        return (
          <div className="account-orders">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>My Orders</h2>
              <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                Account: <strong>{currentUser.email}</strong>
              </span>
            </div>
            
            {loadingOrders ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', margin: '0 auto 10px auto' }} />
                <p className="text-muted">Loading your orders...</p>
              </div>
            ) : ordersError ? (
              <div className="text-center" style={{ padding: '40px 20px' }}>
                <p className="text-danger mb-20">{ordersError}</p>
                <button className="btn-outline" onClick={() => handleTabClick('orders')}>Retry</button>
              </div>
            ) : orders.length === 0 ? (
              <div className="orders-empty text-center" style={{ padding: '60px 20px' }}>
                <Package size={60} className="text-muted mb-20 opacity-50" style={{ margin: '0 auto' }} />
                <h3>You haven't placed any orders yet</h3>
                <p className="text-muted mt-10">Your purchase history for {currentUser.email} will appear here.</p>
                <Link to="/shop" className="btn-primary mt-20" style={{ display: 'inline-block' }}>Start Shopping</Link>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="orders-table-wrapper desktop-only">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => {
                        const total = parseFloat(order.total_amount || order.total || 0).toFixed(2);
                        const dateFormatted = order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        }) : 'Recent';
                        const itemsCount = order.items ? order.items.length : (order.item_count || 1);

                        return (
                          <tr key={order.id}>
                            <td className="fw-bold">{order.order_number || `ORD-${order.id}`}</td>
                            <td>{dateFormatted}</td>
                            <td>{itemsCount} item{itemsCount > 1 ? 's' : ''}</td>
                            <td>₹{total}</td>
                            <td>{renderStatusBadge(order.order_status || order.status)}</td>
                            <td>
                              <Link to={`/account/orders/${order.id}`} className="btn-action-small" style={{ textDecoration: 'none' }}>
                                <Eye size={16} /> View
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="orders-mobile-list mobile-only">
                  {orders.map(order => {
                    const total = parseFloat(order.total_amount || order.total || 0).toFixed(2);
                    const dateFormatted = order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    }) : 'Recent';
                    const itemsCount = order.items ? order.items.length : (order.item_count || 1);

                    return (
                      <div key={order.id} className="order-mobile-card">
                        <div className="order-card-header">
                          <span className="fw-bold">{order.order_number || `ORD-${order.id}`}</span>
                          {renderStatusBadge(order.order_status || order.status)}
                        </div>
                        <div className="order-card-body">
                          <div className="order-detail-row">
                            <span>Date:</span>
                            <span>{dateFormatted}</span>
                          </div>
                          <div className="order-detail-row">
                            <span>Items:</span>
                            <span>{itemsCount}</span>
                          </div>
                          <div className="order-detail-row">
                            <span>Total:</span>
                            <span className="fw-bold text-primary">₹{total}</span>
                          </div>
                        </div>
                        <div className="order-card-footer">
                          <Link to={`/account/orders/${order.id}`} className="btn-outline w-100" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', gap: '8px' }}>
                            <Eye size={16} /> View Details
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );

      case 'wishlist':
        return (
          <div className="account-wishlist">
            <h2>My Wishlist</h2>
            <p className="text-muted">Save your favorite health and wellness products for quick checkout.</p>
            <div style={{ marginTop: '25px', padding: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <Heart size={44} style={{ color: 'var(--primary)', margin: '0 auto 15px auto', opacity: 0.8 }} />
              <h3>Manage Your Saved Items</h3>
              <p className="text-muted mt-10">Access your full interactive wishlist anytime.</p>
              <Link to="/wishlist" className="btn-primary mt-20" style={{ display: 'inline-block' }}>Open Wishlist</Link>
            </div>
          </div>
        );

      case 'addresses':
        return (
          <div className="account-addresses">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Addresses</h2>
              <button className="btn-primary btn-sm" onClick={() => setShowAddAddressModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} /> Add Address
              </button>
            </div>

            {loadingAddresses ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Loader2 size={30} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', margin: '0 auto 10px auto' }} />
                <p className="text-muted">Loading addresses...</p>
              </div>
            ) : addresses.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                <MapPin size={40} className="text-muted mb-10" />
                <h4>No addresses saved yet</h4>
                <p className="text-muted mt-5 mb-20">Add your delivery location for fast checkout.</p>
                <button className="btn-outline" onClick={() => setShowAddAddressModal(true)}>Add Delivery Address</button>
              </div>
            ) : (
              <div className="address-grid">
                {addresses.map(addr => (
                  <div key={addr.id} className="address-card" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4>{addr.is_default ? 'Default Delivery' : 'Saved Address'}</h4>
                      <button 
                        onClick={() => handleDeleteAddress(addr.id)} 
                        style={{ background: 'none', border: 'none', color: 'var(--danger, #ef4444)', cursor: 'pointer', padding: '4px' }}
                        title="Delete Address"
                        aria-label="Delete Address"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '8px' }}>
                      {currentUser.fullName || currentUser.name}
                    </p>
                    <p>{addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}</p>
                    <p>{addr.city}, {addr.state} - {addr.pin_code}</p>
                    {addr.landmark && <p className="text-muted" style={{ fontSize: '0.85rem' }}>Landmark: {addr.landmark}</p>}
                    <p style={{ marginTop: '5px' }}>Phone: {currentUser.phone || '+91 - Not provided'}</p>
                  </div>
                ))}
                
                <div 
                  className="address-card add-new" 
                  onClick={() => setShowAddAddressModal(true)}
                  style={{ cursor: 'pointer', minHeight: '160px' }}
                >
                  <MapPin size={30} className="text-muted mb-10" />
                  <button className="btn-outline" style={{ pointerEvents: 'none' }}>+ Add New Address</button>
                </div>
              </div>
            )}

            {/* Modal for Adding New Address */}
            {showAddAddressModal && (
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
              }}>
                <div style={{
                  backgroundColor: 'white', borderRadius: '12px', padding: '30px',
                  maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Add New Delivery Address</h3>
                    <button onClick={() => setShowAddAddressModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
                  </div>

                  <form onSubmit={handleAddAddressSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem' }}>Address Line 1 *</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="House/Flat No., Street, Area" 
                          value={newAddress.address_line_1}
                          onChange={(e) => setNewAddress({...newAddress, address_line_1: e.target.value})}
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem' }}>Address Line 2</label>
                        <input 
                          type="text" 
                          placeholder="Apartment, Suite, Unit" 
                          value={newAddress.address_line_2}
                          onChange={(e) => setNewAddress({...newAddress, address_line_2: e.target.value})}
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem' }}>City *</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. Bhubaneswar" 
                            value={newAddress.city}
                            onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem' }}>State *</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. Odisha" 
                            value={newAddress.state}
                            onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem' }}>PIN Code *</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="e.g. 751024" 
                            value={newAddress.pin_code}
                            onChange={(e) => setNewAddress({...newAddress, pin_code: e.target.value})}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem' }}>Landmark</label>
                          <input 
                            type="text" 
                            placeholder="Near hospital/mall" 
                            value={newAddress.landmark}
                            onChange={(e) => setNewAddress({...newAddress, landmark: e.target.value})}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}
                          />
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button type="submit" className="btn-primary" disabled={isSavingAddress} style={{ flex: 1 }}>
                          {isSavingAddress ? 'Saving...' : 'Save Address'}
                        </button>
                        <button type="button" className="btn-outline" onClick={() => setShowAddAddressModal(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );

      case 'profile':
        return (
          <div className="account-profile">
            <h2>Account Details</h2>
            <p className="text-muted mb-20">Update your verified personal details and phone number.</p>

            <form className="profile-form mt-20" onSubmit={handleProfileSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="account-first-name">First Name</label>
                  <input 
                    id="account-first-name"
                    type="text" 
                    required
                    value={profileForm.firstName} 
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="account-last-name">Last Name</label>
                  <input 
                    id="account-last-name"
                    type="text" 
                    required
                    value={profileForm.lastName} 
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="account-email">Email Address <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 400 }}>(Login Account)</span></label>
                <input 
                  id="account-email"
                  type="email" 
                  value={profileForm.email} 
                  readOnly 
                  style={{ backgroundColor: 'var(--section-bg, #f8fafc)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="account-phone">Phone Number</label>
                <input 
                  id="account-phone"
                  type="tel" 
                  value={profileForm.phone} 
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                />
              </div>
              <button 
                type="submit" 
                className="btn-primary mt-20" 
                disabled={isSavingProfile}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {isSavingProfile ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={16} />}
                {isSavingProfile ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </form>
          </div>
        );

      case 'prescriptions':
        return (
          <div className="account-prescriptions">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2>My Prescriptions</h2>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
                  Manage and track medical prescriptions submitted for verification.
                </p>
              </div>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => setShowUploadRxModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Upload Prescription
              </button>
            </div>

            {loadingPrescriptions ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', margin: '0 auto 10px auto' }} />
                <p className="text-muted">Loading your prescriptions...</p>
              </div>
            ) : prescriptionsError ? (
              <div className="text-center" style={{ padding: '40px 20px' }}>
                <p className="text-danger mb-20">{prescriptionsError}</p>
                <button className="btn-outline" onClick={fetchCustomerPrescriptions}>Try Again</button>
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center" style={{ padding: '60px 20px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                <FileText size={54} className="text-muted mb-20 opacity-50" style={{ margin: '0 auto' }} />
                <h3>No prescriptions uploaded yet</h3>
                <p className="text-muted mt-10" style={{ maxWidth: '420px', margin: '10px auto 20px' }}>
                  Upload your doctor's prescription so our pharmacists can approve medications requiring clinical verification.
                </p>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={() => setShowUploadRxModal(true)}
                >
                  Upload Your First Prescription
                </button>
              </div>
            ) : (
              <div className="orders-table-wrapper">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Prescription #</th>
                      <th>Uploaded Date</th>
                      <th>Status</th>
                      <th>Linked Order</th>
                      <th>Remarks / Message</th>
                      <th style={{ textAlign: 'right' }}>Document</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((rx) => {
                      const dateStr = rx.created_at
                        ? new Date(rx.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—';

                      const st = (rx.status || 'PENDING').toUpperCase();
                      let badgeClass = 'badge-warning';
                      let statusText = 'Pending Review';

                      if (st === 'APPROVED') {
                        badgeClass = 'badge-success';
                        statusText = 'Approved';
                      } else if (st === 'REJECTED') {
                        badgeClass = 'badge-danger';
                        statusText = 'Rejected';
                      } else if (st === 'NEEDS_CLARIFICATION') {
                        badgeClass = 'badge-info';
                        statusText = 'Needs Clarification';
                      }

                      return (
                        <tr key={rx.id}>
                          <td className="fw-bold" style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>
                            {rx.prescription_number || `RX-${rx.id}`}
                          </td>
                          <td>{dateStr}</td>
                          <td>
                            <span className={`status-badge ${badgeClass}`}>
                              ● {statusText}
                            </span>
                          </td>
                          <td>
                            {rx.order_number ? (
                              <Link to={`/account/orders/${rx.order_id}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                {rx.order_number}
                              </Link>
                            ) : (
                              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Direct Upload</span>
                            )}
                          </td>
                          <td>
                            {rx.customer_message ? (
                              <span style={{ fontSize: '0.85rem', color: st === 'NEEDS_CLARIFICATION' ? '#0284C7' : 'var(--text-main)' }}>
                                {rx.customer_message}
                              </span>
                            ) : (
                              <span className="text-muted" style={{ fontSize: '0.85rem' }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <a
                              href={rx.file_url || rx.file_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-action-small"
                              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Eye size={14} /> View
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="account-page section-padding">
      <div className="container">
        
        {/* Breadcrumbs */}
        <div className="breadcrumbs mb-30">
          <Link to="/">Home</Link>
          <ChevronRight size={14} />
          <span>My Account</span>
          {activeTab !== 'dashboard' && (
            <>
              <ChevronRight size={14} />
              <span style={{ textTransform: 'capitalize' }}>{activeTab}</span>
            </>
          )}
        </div>

        <div className="account-layout">
          
          {/* Sidebar */}
          <aside className="account-sidebar">
            <div className="sidebar-profile">
              <div className="avatar" title={currentUser.fullName || currentUser.name}>
                {currentUser.initials || 'U'}
              </div>
              <div className="info">
                <h4>{currentUser.fullName || currentUser.name}</h4>
                <span title={currentUser.email}>{currentUser.email}</span>
              </div>
            </div>
            
            <nav className="account-nav">
              <button 
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleTabClick('dashboard')}
              >
                <LayoutDashboard size={18} /> Dashboard
              </button>
              <button 
                className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => handleTabClick('orders')}
              >
                <Package size={18} /> My Orders
              </button>
              <button 
                className={`nav-item ${activeTab === 'prescriptions' ? 'active' : ''}`}
                onClick={() => navigate('/prescriptions')}
              >
                <FileText size={18} /> My Prescriptions
              </button>
              <button 
                className={`nav-item ${activeTab === 'wishlist' ? 'active' : ''}`}
                onClick={() => handleTabClick('wishlist')}
              >
                <Heart size={18} /> Wishlist
              </button>
              <button 
                className={`nav-item ${activeTab === 'addresses' ? 'active' : ''}`}
                onClick={() => handleTabClick('addresses')}
              >
                <MapPin size={18} /> Addresses
              </button>
              <button 
                className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => handleTabClick('profile')}
              >
                <User size={18} /> Profile
              </button>
              <button 
                className="nav-item text-danger"
                onClick={handleLogout}
              >
                <LogOut size={18} /> Logout
              </button>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="account-content">
            <div className="content-card">
              {renderContent()}
            </div>
          </main>

        </div>
      </div>

      {/* Customer Prescription Upload Modal */}
      {showUploadRxModal && (
        <div 
          className="modal-overlay" 
          onClick={(e) => { if (e.target === e.currentTarget && !isUploadingRx) setShowUploadRxModal(false); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}
        >
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
                Upload Medical Prescription
              </h3>
              <button 
                type="button" 
                onClick={() => setShowUploadRxModal(false)}
                disabled={isUploadingRx}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadPrescription}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                  Prescription Document (JPG, PNG, PDF up to 8MB) *
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) => setRxUploadFile(e.target.files?.[0] || null)}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px' }}
                />
                {rxUploadFile && (
                  <span style={{ display: 'block', fontSize: '12px', color: '#10B981', marginTop: '6px' }}>
                    ✓ Selected: {rxUploadFile.name} ({(rxUploadFile.size / 1024).toFixed(0)} KB)
                  </span>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                  Notes / Symptoms / Doctor Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={rxUploadMessage}
                  onChange={(e) => setRxUploadMessage(e.target.value)}
                  placeholder="E.g. Prescribed for 5 days course by Dr. Sharma..."
                  style={{ width: '100%', padding: '10px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '6px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowUploadRxModal(false)}
                  disabled={isUploadingRx}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isUploadingRx || !rxUploadFile}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {isUploadingRx ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <UploadCloud size={16} />}
                  <span>{isUploadingRx ? 'Uploading...' : 'Submit Prescription'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
