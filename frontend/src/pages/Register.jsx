import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, ShieldCheck, 
  Truck, Headphones, Loader2, ArrowLeft, HeartPulse, 
  Activity, CheckCircle2 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import './Login.css';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    termsAgreed: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);

  const navigate = useNavigate();
  const { addToast } = useToast();

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

    if (!formData.fullName.trim()) {
      errors.fullName = "Full name is required.";
      isValid = false;
    }
    if (!formData.email.trim()) {
      errors.email = "Email is required.";
      isValid = false;
    }
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required.";
      isValid = false;
    }
    if (!formData.password) {
      errors.password = "Password is required.";
      isValid = false;
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
      isValid = false;
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
      isValid = false;
    }
    if (!formData.termsAgreed) {
      errors.termsAgreed = "You must agree to the Terms & Conditions.";
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validateForm()) {
      const formEl = document.getElementById('native-register-form');
      if (formEl) {
        formEl.classList.add('shake');
        setTimeout(() => formEl.classList.remove('shake'), 400);
      }
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password
      };
      
      const response = await api.register(payload);
      if (response && response.success) {
        addToast(response.message || 'Account created successfully! Please log in.', 'success');
        navigate('/login');
      } else {
        setGlobalError(response?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      setGlobalError(errorMsg);
      const formEl = document.getElementById('native-register-form');
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
      <div className="login-native-left fade-in-slide" style={{ padding: '30px 60px' }}>
        
        <Link to="/" className="native-back-home-mobile">
          <ArrowLeft size={18} />
        </Link>

        <div className="native-brand-header" style={{ marginBottom: '20px' }}>
          <div className="native-brand-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="#087F73"/>
              <path d="M16 11H13V8C13 7.45 12.55 7 12 7C11.45 7 11 7.45 11 8V11H8C7.45 11 7 11.45 7 12C7 12.55 7.45 13 8 13H11V16C11 16.55 11.45 17 12 17C12.55 17 13 16.55 13 16V13H16C16.55 13 17 12.55 17 12C17 11.45 16.55 11 16 11Z" fill="white"/>
              <path d="M14 17C14.88 15.54 16.32 14.54 18 14.2V16.34C16.89 16.63 16 17.41 15.54 18.5H14V17Z" fill="#DDF5EF"/>
            </svg>
          </div>
          <div className="native-brand-text">
            <h2>Medicare <strong>Plus</strong></h2>
          </div>
        </div>

        <div className="native-welcome-section">
          <h1 style={{ fontSize: '1.75rem' }}>Create an Account</h1>
          <p style={{ marginBottom: '15px' }}>Join us for a healthier lifestyle</p>
        </div>

        {globalError && (
          <div className="native-error-msg">
            {globalError}
          </div>
        )}

        <form id="native-register-form" onSubmit={handleSubmit} noValidate>
          
          <div className="native-input-group" style={{ marginBottom: '15px' }}>
            <User className="native-input-icon" size={18} />
            <input 
              type="text" 
              name="fullName"
              placeholder="Full Name" 
              value={formData.fullName}
              onChange={handleInputChange}
              required
              className={fieldErrors.fullName ? 'input-error' : ''}
              style={{ padding: '14px 14px 14px 45px' }}
            />
            {fieldErrors.fullName && <span className="inline-error">{fieldErrors.fullName}</span>}
          </div>

          <div className="native-input-group" style={{ marginBottom: '15px' }}>
            <Mail className="native-input-icon" size={18} />
            <input 
              type="email" 
              name="email"
              placeholder="Email Address" 
              value={formData.email}
              onChange={handleInputChange}
              required
              className={fieldErrors.email ? 'input-error' : ''}
              style={{ padding: '14px 14px 14px 45px' }}
            />
            {fieldErrors.email && <span className="inline-error">{fieldErrors.email}</span>}
          </div>

          <div className="native-input-group" style={{ marginBottom: '15px' }}>
            <Phone className="native-input-icon" size={18} />
            <input 
              type="tel" 
              name="phone"
              placeholder="Phone Number" 
              value={formData.phone}
              onChange={handleInputChange}
              required
              className={fieldErrors.phone ? 'input-error' : ''}
              style={{ padding: '14px 14px 14px 45px' }}
            />
            {fieldErrors.phone && <span className="inline-error">{fieldErrors.phone}</span>}
          </div>

          <div className="native-input-group" style={{ marginBottom: '15px' }}>
            <Lock className="native-input-icon" size={18} />
            <input 
              type={showPassword ? "text" : "password"} 
              name="password"
              placeholder="Create Password (min 8 chars)" 
              value={formData.password}
              onChange={handleInputChange}
              required
              className={fieldErrors.password ? 'input-error' : ''}
              style={{ padding: '14px 14px 14px 45px' }}
            />
            <button 
              type="button" 
              className="native-toggle-pwd"
              style={{ top: '15px' }}
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            {fieldErrors.password && <span className="inline-error">{fieldErrors.password}</span>}
          </div>

          <div className="native-input-group" style={{ marginBottom: '15px' }}>
            <Lock className="native-input-icon" size={18} />
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              name="confirmPassword"
              placeholder="Confirm Password" 
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              className={fieldErrors.confirmPassword ? 'input-error' : ''}
              style={{ padding: '14px 14px 14px 45px' }}
            />
            <button 
              type="button" 
              className="native-toggle-pwd"
              style={{ top: '15px' }}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex="-1"
            >
              {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            {fieldErrors.confirmPassword && <span className="inline-error">{fieldErrors.confirmPassword}</span>}
          </div>

          <div className="native-actions" style={{ marginBottom: '20px' }}>
            <label className="native-checkbox">
              <input 
                type="checkbox" 
                name="termsAgreed"
                checked={formData.termsAgreed}
                onChange={handleInputChange}
              />
              <div className="native-check-box"></div>
              <span>I agree to the <Link to="/terms" className="native-forgot">Terms & Conditions</Link></span>
            </label>
          </div>
          {fieldErrors.termsAgreed && <div className="inline-error" style={{ marginTop: '-15px', marginBottom: '15px' }}>{fieldErrors.termsAgreed}</div>}

          <button 
            type="submit" 
            className="native-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>Creating Account... <Loader2 className="spinner" size={20} /></>
            ) : (
              <>Create Account <ArrowRight size={18} /></>
            )}
          </button>
          
        </form>

        <div className="native-create-account" style={{ marginTop: '20px' }}>
          Already have an account? <Link to="/login">Log In Here</Link>
        </div>

        <div className="native-trust-badges" style={{ marginTop: '20px', paddingTop: '15px' }}>
          <div className="native-badge">
            <ShieldCheck size={20} className="n-badge-icon" />
            <span>Secure<br/>Signup</span>
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

      {/* --- RIGHT PANEL --- (Exact reuse of Login visual) */}
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

          <div className="native-visual-composition">
            
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

        <div className="native-bg-shape shape-1"></div>
        <div className="native-bg-shape shape-2"></div>
      </div>

    </div>
  );
}
