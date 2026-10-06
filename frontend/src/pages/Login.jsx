import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck, 
  Truck, Headphones, Loader2, ArrowLeft, HeartPulse, 
  Stethoscope, Activity, CheckCircle2 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { adminAuthService } from '../services/adminApi';
import './Login.css';

export default function Login() {
  const [role, setRole] = useState('Customer');
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    remember: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);

  const navigate = useNavigate();
  const { addToast } = useToast();
  const { login: authLogin } = useAuth();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });

    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }
    if (globalError) setGlobalError(null);
  };

  const validateForm = () => {
    let errors = {};
    let isValid = true;

    if (!formData.identifier.trim()) {
      errors.identifier = "Email or phone number is required.";
      isValid = false;
    }
    
    if (!formData.password) {
      errors.password = "Password is required.";
      isValid = false;
    } else if (formData.password.length < 6) {
      errors.password = "Password must contain at least 6 characters.";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validateForm()) {
      const formEl = document.getElementById('native-login-form');
      if (formEl) {
        formEl.classList.add('shake');
        setTimeout(() => formEl.classList.remove('shake'), 400);
      }
      return;
    }

    setIsLoading(true);

    try {
      if (role === 'Customer') {
        const response = await api.login({
          email: formData.identifier.trim().toLowerCase(),
          password: formData.password,
          rememberMe: formData.remember
        });
        if (response && response.success) {
          const userData = response.user || response.data;
          if (authLogin) {
            authLogin(userData, response.token);
          } else {
            localStorage.setItem('token', response.token);
            if (userData) {
              localStorage.setItem('user', JSON.stringify(userData));
            }
          }
          addToast('Welcome back!', 'success');
          navigate('/');
        }
      } else {
        const response = await adminAuthService.login({
          email: formData.identifier.trim().toLowerCase(),
          password: formData.password,
          rememberMe: formData.remember
        });
        if (response && response.success) {
          localStorage.setItem('adminToken', response.token);
          if (response.data) {
            localStorage.setItem('adminUser', JSON.stringify(response.data));
          }
          addToast('Welcome back, Admin!', 'success');
          navigate('/admin');
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Invalid credentials or network error.';
      setGlobalError(errorMsg);
      const formEl = document.getElementById('native-login-form');
      if (formEl) {
        formEl.classList.add('shake');
        setTimeout(() => formEl.classList.remove('shake'), 400);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-native-page">
      
      {/* --- LEFT PANEL --- */}
      <div className="login-native-left fade-in-slide">
        
        <Link to="/" className="native-back-home-mobile">
          <ArrowLeft size={18} />
        </Link>

        <div className="native-brand-header">
          <div className="native-brand-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="#087F73"/>
              <path d="M16 11H13V8C13 7.45 12.55 7 12 7C11.45 7 11 7.45 11 8V11H8C7.45 11 7 11.45 7 12C7 12.55 7.45 13 8 13H11V16C11 16.55 11.45 17 12 17C12.55 17 13 16.55 13 16V13H16C16.55 13 17 12.55 17 12C17 11.45 16.55 11 16 11Z" fill="white"/>
              <path d="M14 17C14.88 15.54 16.32 14.54 18 14.2V16.34C16.89 16.63 16 17.41 15.54 18.5H14V17Z" fill="#DDF5EF"/>
            </svg>
          </div>
          <div className="native-brand-text">
            <h2>Medicare <strong>Plus</strong></h2>
            <p>Your Health Our Priority</p>
          </div>
        </div>

        <div className="native-welcome-section">
          <h1>Welcome Back 👋</h1>
          <p>Login to your account</p>
        </div>

        <div className="native-role-toggle">
          <div className={`native-toggle-slider ${role === 'Admin' ? 'slide-right' : ''}`}></div>
          <button 
            type="button"
            className={role === 'Customer' ? 'active' : ''}
            onClick={() => { setRole('Customer'); setGlobalError(null); }}
            aria-label="Login as Customer"
          >
            Customer
          </button>
          <button 
            type="button"
            className={role === 'Admin' ? 'active' : ''}
            onClick={() => { setRole('Admin'); setGlobalError(null); }}
            aria-label="Login as Admin"
          >
            Admin
          </button>
        </div>

        {globalError && (
          <div className="native-error-msg">
            {globalError}
          </div>
        )}

        <form id="native-login-form" onSubmit={handleSubmit} noValidate>
          
          <div className="native-input-group">
            <Mail className="native-input-icon" size={18} />
            <input 
              type="text" 
              name="identifier"
              placeholder="Email or Phone Number" 
              value={formData.identifier}
              onChange={handleInputChange}
              required
              className={fieldErrors.identifier ? 'input-error' : ''}
            />
            {fieldErrors.identifier && <span className="inline-error">{fieldErrors.identifier}</span>}
          </div>

          <div className="native-input-group">
            <Lock className="native-input-icon" size={18} />
            <input 
              type={showPassword ? "text" : "password"} 
              name="password"
              placeholder="Password" 
              value={formData.password}
              onChange={handleInputChange}
              required
              className={fieldErrors.password ? 'input-error' : ''}
            />
            <button 
              type="button" 
              className="native-toggle-pwd"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            {fieldErrors.password && <span className="inline-error">{fieldErrors.password}</span>}
          </div>

          <div className="native-actions">
            <label className="native-checkbox">
              <input 
                type="checkbox" 
                name="remember"
                checked={formData.remember}
                onChange={handleInputChange}
              />
              <div className="native-check-box"></div>
              Remember me
            </label>
            
            <Link to="/forgot-password" className="native-forgot">
              Forgot Password?
            </Link>
          </div>

          <button 
            type="submit" 
            className="native-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>Signing in... <Loader2 className="spinner" size={20} /></>
            ) : (
              <>Log In <ArrowRight size={18} /></>
            )}
          </button>
          
          <div className="native-divider">
            <span>OR</span>
          </div>

          <button type="button" className="native-google-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>

        <div className="native-create-account">
          Don't have an account? <Link to="/register">Create Account</Link>
        </div>

        <div className="native-trust-badges">
          <div className="native-badge">
            <ShieldCheck size={20} className="n-badge-icon" />
            <span>Secure<br/>Login</span>
          </div>
          <div className="native-badge">
            <Truck size={20} className="n-badge-icon" />
            <span>Fast<br/>Delivery</span>
          </div>
          <div className="native-badge">
            <Headphones size={20} className="n-badge-icon" />
            <span>24/7<br/>Support</span>
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL --- */}
      <div className="login-native-right">
        
        <Link to="/" className="native-back-home">
          <ArrowLeft size={18} /> Back to Home
        </Link>
        
        <div className="native-right-content fade-in-slide-right">
          <div className="native-hero-text">
            <h1>Better Healthcare<br/>For a Healthier Tomorrow</h1>
            <p>Trusted medicines, wellness products and healthcare services delivered with care.</p>
          </div>

          <div className="native-feature-list">
            <div className="native-feature-item">
              <div className="n-feature-icon"><CheckCircle2 size={24}/></div>
              <div className="n-feature-text">
                <strong>Trusted Medicines</strong>
                <span>100% Genuine Products</span>
              </div>
            </div>
            <div className="native-feature-item">
              <div className="n-feature-icon"><Truck size={24}/></div>
              <div className="n-feature-text">
                <strong>Fast & Safe Delivery</strong>
                <span>To Your Doorstep</span>
              </div>
            </div>
            <div className="native-feature-item">
              <div className="n-feature-icon"><Headphones size={24}/></div>
              <div className="n-feature-text">
                <strong>24/7 Support</strong>
                <span>We're Always Here</span>
              </div>
            </div>
          </div>

          {/* Premium CSS Composition */}
          <div className="native-visual-composition">
            
            {/* CSS Smartphone */}
            <div className="css-smartphone float-slow">
              <div className="sp-notch"></div>
              <div className="sp-screen">
                <div className="sp-header">
                  <div className="sp-avatar"></div>
                  <div>
                    <div className="sp-greeting">Good Morning 👋</div>
                    <div className="sp-sub">Take care of your health</div>
                  </div>
                </div>
                <div className="sp-search">
                  <span className="sp-s-icon">🔍</span> Search medicines...
                </div>
                <div className="sp-grid">
                  <div className="sp-card"><div className="sp-c-icon blue">💊</div>Medicines</div>
                  <div className="sp-card"><div className="sp-c-icon purple">🧪</div>Lab Tests</div>
                  <div className="sp-card"><div className="sp-c-icon teal">🩺</div>Consult</div>
                  <div className="sp-card"><div className="sp-c-icon green">🍏</div>Health Tips</div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="float-element e-bottle float-medium">
              <div className="bottle-cap"></div>
              <div className="bottle-body">
                <HeartPulse size={20} color="#087F73" />
                <span>VITAMIN</span>
              </div>
            </div>

            <div className="float-element e-pill float-fast">
               <div className="pill-half left"></div>
               <div className="pill-half right"></div>
            </div>

            <div className="float-element e-cross float-slow">
              +
            </div>

            <div className="float-element e-heart float-medium">
              <Activity size={32} color="white" />
            </div>

          </div>

        </div>

        {/* Decorative background shapes */}
        <div className="native-bg-shape shape-1"></div>
        <div className="native-bg-shape shape-2"></div>
      </div>

    </div>
  );
}
