import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Pill } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { adminAuthService } from '../../services/adminApi';
import './AdminLogin.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      // Calls the Axios service which communicates with the PHP Backend
      const response = await adminAuthService.login({ email, password, rememberMe });
      if (response.success) {
        localStorage.setItem('adminToken', response.token);
        if (response.user) {
          localStorage.setItem('adminUser', JSON.stringify(response.user));
        }
        addToast('success', 'Welcome back to the Admin Dashboard');
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid administrator credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-layout">
      {/* Left side: Graphic */}
      <div className="admin-login-graphic">
        <div className="graphic-overlay">
          <div className="graphic-content">
            <div className="graphic-logo">
              <Pill size={32} />
              <span>Medicare Plus</span>
            </div>
            <h1>Secure Pharmacy Management</h1>
            <p>Access your central dashboard to manage inventory, process orders, and review customer prescriptions seamlessly.</p>
          </div>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="admin-login-form-container">
        <div className="admin-login-box">
          <div className="admin-login-header">
            <h2>Welcome Back</h2>
            <p>Sign in to manage your pharmacy store</p>
          </div>

          {error && (
            <div className="admin-login-error">
              {error}
            </div>
          )}

          <form className="admin-login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@medicareplus.com"
                required
              />
            </div>

            <div className="form-group">
              <div className="password-header">
                <label>Password</label>
              </div>
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button 
                  type="button" 
                  className="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-actions-row">
              <label className="remember-me">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <a href="#" className="forgot-password-link">Forgot password?</a>
            </div>

            <button type="submit" className="btn-admin-login" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spinner" /> Authenticating...
                </>
              ) : (
                'SIGN IN'
              )}
            </button>
          </form>
          
          <div className="admin-login-footer">
            <p>&copy; {new Date().getFullYear()} Medicare Plus Admin. Secure connection.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
