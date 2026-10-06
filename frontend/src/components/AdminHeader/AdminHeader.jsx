import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Search, Bell, ChevronDown, Menu, ChevronRight, 
  ShoppingCart, Pill, Package, Star, Users, AlertTriangle, 
  Settings as SettingsIcon, CheckCheck, ExternalLink, Loader2,
  User, LogOut
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminNotificationService } from '../../services/adminApi';
import { formatRelativeTime } from '../../utils/dateUtils';
import './AdminHeader.css';

export default function AdminHeader({ toggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  const { currentAdmin, logout } = useAdminAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Generate breadcrumbs from path
  const pathnames = location.pathname.split('/').filter(x => x);
  
  // Format page title from current path
  const formatTitle = (str) => {
    if (str === 'admin') return 'Dashboard';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
  };
  
  const currentPageTitle = pathnames.length === 1 
    ? 'Dashboard' 
    : formatTitle(pathnames[pathnames.length - 1]);

  // Fetch unread count & recent list from MySQL API
  const fetchHeaderNotifications = useCallback(async () => {
    try {
      const response = await adminNotificationService.getRecentNotifications();
      if (response && response.success) {
        setRecentNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unread_count || 0);
      }
    } catch (err) {
      // Suppress noisy logs on polling if unauthenticated
      console.warn('Could not fetch notifications for header bell:', err?.message);
    }
  }, []);

  useEffect(() => {
    fetchHeaderNotifications();

    // Listen for custom event triggered across the application
    const handleSync = () => {
      fetchHeaderNotifications();
    };
    window.addEventListener('medicare_notifications_updated', handleSync);

    // Periodic poll every 45 seconds (as per specification)
    const interval = setInterval(fetchHeaderNotifications, 45000);

    return () => {
      window.removeEventListener('medicare_notifications_updated', handleSync);
      clearInterval(interval);
    };
  }, [fetchHeaderNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Handle clicking a notification item in dropdown
  const handleNotificationClick = async (notif) => {
    setShowNotifications(false);

    // If unread, mark read optimistically and on backend
    if (!notif.is_read) {
      try {
        await adminNotificationService.markAsRead(notif.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        window.dispatchEvent(new CustomEvent('medicare_notifications_updated'));
      } catch (e) {
        console.error('Error marking notification read:', e);
      }
    }

    const targetUrl = notif.action_url || '/admin/notifications';
    navigate(targetUrl);
  };

  // Mark all as read from dropdown
  const handleMarkAllRead = async () => {
    try {
      await adminNotificationService.markAllAsRead();
      setUnreadCount(0);
      setRecentNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      window.dispatchEvent(new CustomEvent('medicare_notifications_updated'));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Helper for notification type icons
  const renderNotifIcon = (type) => {
    const t = String(type || '').toUpperCase();
    switch (t) {
      case 'ORDER':
        return <ShoppingCart size={15} style={{ color: '#2563EB' }} />;
      case 'PRESCRIPTION':
        return <Pill size={15} style={{ color: '#087F73' }} />;
      case 'INVENTORY':
        return <Package size={15} style={{ color: '#EF4444' }} />;
      case 'REVIEW':
        return <Star size={15} style={{ color: '#F59E0B' }} />;
      case 'CUSTOMER':
        return <Users size={15} style={{ color: '#7C3AED' }} />;
      default:
        return <AlertTriangle size={15} style={{ color: '#64748B' }} />;
    }
  };

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Toggle Sidebar">
          <Menu size={24} />
        </button>
        
        <div className="page-header-info">
          <h2 className="page-title">{currentPageTitle}</h2>
          <div className="breadcrumbs">
            <Link to="/admin">Admin</Link>
            {pathnames.length > 1 && pathnames.slice(1).map((name, index) => {
              const routeTo = `/admin/${pathnames.slice(1, index + 2).join('/')}`;
              const isLast = index === pathnames.slice(1).length - 1;
              return (
                <div key={name} className="breadcrumb-item">
                  <ChevronRight size={14} className="breadcrumb-separator" />
                  {isLast ? (
                    <span className="breadcrumb-active">{formatTitle(name)}</span>
                  ) : (
                    <Link to={routeTo}>{formatTitle(name)}</Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="admin-header-right">
        <div className="admin-search">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Search orders, products..." aria-label="Global Search" />
        </div>

        {/* Notifications Bell Dropdown */}
        <div className="notification-container" ref={dropdownRef}>
          <button 
            className="notification-btn" 
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label={`Notifications, ${unreadCount} unread`}
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
          
          {showNotifications && (
            <div className="notification-dropdown" role="dialog" aria-label="Notifications Dropdown">
              <div className="dropdown-header">
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Notifications</h3>
                  <div style={{ fontSize: '11px', color: '#6B7774', marginTop: '2px' }}>
                    Real-time application activity
                  </div>
                </div>
                {unreadCount > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 700 }}>
                    {unreadCount} New
                  </span>
                )}
              </div>

              <div className="notification-list">
                {recentNotifications.length === 0 ? (
                  <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    No recent notifications
                  </div>
                ) : (
                  recentNotifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`notification-item type-${String(notif.type || '').toLowerCase()} ${!notif.is_read ? 'is-unread' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                      style={{
                        backgroundColor: !notif.is_read ? '#F0FDF4' : '#FFFFFF',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start'
                      }}
                    >
                      <div style={{
                        marginTop: '2px',
                        padding: '6px',
                        borderRadius: '6px',
                        backgroundColor: '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {renderNotifIcon(notif.type)}
                      </div>
                      <div className="notif-content" style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span className="notif-title" style={{ fontWeight: !notif.is_read ? 700 : 600 }}>
                            {notif.title}
                          </span>
                          {!notif.is_read && (
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#087F73', display: 'inline-block' }} />
                          )}
                        </div>
                        <div className="notif-message" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {notif.message}
                        </div>
                        <div className="notif-time">{formatRelativeTime(notif.created_at)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="dropdown-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#F8FAFC' }}>
                {unreadCount > 0 ? (
                  <button 
                    type="button" 
                    onClick={handleMarkAllRead}
                    style={{ background: 'none', border: 'none', color: '#087F73', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                ) : (
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>All caught up!</span>
                )}

                <button 
                  type="button"
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/admin/notifications');
                  }}
                  style={{ background: 'none', border: 'none', color: '#087F73', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  View All <ExternalLink size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Admin Profile & Dropdown */}
        <div className="admin-profile-container" ref={profileDropdownRef}>
          <div 
            className="admin-profile"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            role="button"
            tabIndex={0}
            aria-label="Admin Profile Menu"
          >
            <div className="admin-avatar">
              {currentAdmin?.avatar ? (
                <img src={currentAdmin.avatar} alt={currentAdmin.name || 'Admin'} className="admin-avatar-img" />
              ) : (
                <span>{currentAdmin?.initials || 'A'}</span>
              )}
            </div>
            <div className="admin-info">
              <span className="admin-name">{currentAdmin?.name || 'Administrator'}</span>
              <span className="admin-role">{currentAdmin?.role_label || 'Super Admin'}</span>
            </div>
            <ChevronDown size={16} className={`profile-icon ${showProfileDropdown ? 'rotated' : ''}`} />
          </div>

          {showProfileDropdown && (
            <div className="admin-user-dropdown" role="menu">
              <div className="user-dropdown-header">
                <div className="admin-avatar">
                  {currentAdmin?.avatar ? (
                    <img src={currentAdmin.avatar} alt={currentAdmin.name} className="admin-avatar-img" />
                  ) : (
                    <span>{currentAdmin?.initials || 'A'}</span>
                  )}
                </div>
                <div className="user-dropdown-info">
                  <span className="user-dropdown-name">{currentAdmin?.name || 'Administrator'}</span>
                  <span className="user-dropdown-email">{currentAdmin?.email || ''}</span>
                  <span className="user-dropdown-role">{currentAdmin?.role_label || 'Super Admin'}</span>
                </div>
              </div>

              <div className="user-dropdown-menu">
                <Link 
                  to="/admin/profile" 
                  className="user-dropdown-item"
                  onClick={() => setShowProfileDropdown(false)}
                >
                  <User size={15} />
                  <span>My Profile</span>
                </Link>

                <Link 
                  to="/admin/settings" 
                  className="user-dropdown-item"
                  onClick={() => setShowProfileDropdown(false)}
                >
                  <SettingsIcon size={15} />
                  <span>Store Settings</span>
                </Link>

                <div className="user-dropdown-divider" />

                <button 
                  type="button" 
                  className="user-dropdown-item danger"
                  onClick={() => {
                    setShowProfileDropdown(false);
                    logout();
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
