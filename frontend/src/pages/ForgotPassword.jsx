import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, KeyRound, 
  CheckCircle2, Loader2, ShieldCheck, HeartPulse, Stethoscope, Activity, Truck, Headphones 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import './Login.css';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password, 3: Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [devOtpHint, setDevOtpHint] = useState(null);

  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your registered email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.forgotPassword(cleanEmail);
      if (res && res.success) {
        addToast(res.message || "Verification code sent!", "success");
        if (res.token) setToken(res.token);
        if (res.otp) {
          setDevOtpHint(res.otp);
          setOtp(res.otp); // Pre-fill for instant seamless testing
        }
        setStep(2);
      } else {
        setError(res?.message || "Failed to process request.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "No account found with this email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (!otp.trim()) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        token: token,
        password: newPassword
      });

      if (res && res.success) {
        setStep(3);
        addToast("Password reset successfully! Please log in.", "success");
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(res?.message || "Invalid or expired code.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-native-page">
      
      {/* --- LEFT PANEL --- */}
      <div className="login-native-left fade-in-slide">
        
        <Link to="/login" className="native-back-home-mobile">
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

        {error && (
          <div className="native-global-error" style={{ marginBottom: '20px' }}>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <div className="native-form-container">
            <div className="native-form-heading">
              <h2>Reset Password</h2>
              <p>Enter the email address registered with your account and we'll help you reset your password.</p>
            </div>

            <form onSubmit={handleSendCode}>
              <div className="native-field-group">
                <label>Email Address</label>
                <div className="native-input-box">
                  <Mail className="native-icon-left" size={18} />
                  <input 
                    type="email" 
                    placeholder="e.g. abhi@gmail.com" 
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="native-submit-btn" 
                disabled={isLoading}
                style={{ marginTop: '25px' }}
              >
                {isLoading ? (
                  <>Sending Code... <Loader2 className="spinner" size={20} /></>
                ) : (
                  <>Send Verification Code <ArrowRight size={18} /></>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '25px' }}>
                <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                  <ArrowLeft size={16} /> Back to Log In
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Enter Verification Code & New Password */}
        {step === 2 && (
          <div className="native-form-container">
            <div className="native-form-heading">
              <h2>Enter Code & New Password</h2>
              <p>We've sent a verification code to <strong>{email}</strong>.</p>
            </div>

            {devOtpHint && (
              <div style={{
                backgroundColor: 'rgba(8, 127, 115, 0.08)',
                border: '1px dashed var(--primary)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <KeyRound size={20} className="text-primary" />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  Verification Code: <strong style={{ letterSpacing: '2px', color: 'var(--primary)' }}>{devOtpHint}</strong>
                </span>
              </div>
            )}

            <form onSubmit={handleResetPassword}>
              <div className="native-field-group">
                <label>6-Digit Verification Code</label>
                <div className="native-input-box">
                  <KeyRound className="native-icon-left" size={18} />
                  <input 
                    type="text" 
                    maxLength={10}
                    placeholder="Enter code" 
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                  />
                </div>
              </div>

              <div className="native-field-group">
                <label>New Password</label>
                <div className="native-input-box">
                  <Lock className="native-icon-left" size={18} />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="At least 6 characters" 
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                  />
                  <button 
                    type="button" 
                    className="native-icon-right"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="native-field-group">
                <label>Confirm New Password</label>
                <div className="native-input-box">
                  <Lock className="native-icon-left" size={18} />
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    placeholder="Re-enter password" 
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                  />
                  <button 
                    type="button" 
                    className="native-icon-right"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex="-1"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="native-submit-btn" 
                disabled={isLoading}
                style={{ marginTop: '20px' }}
              >
                {isLoading ? (
                  <>Resetting Password... <Loader2 className="spinner" size={20} /></>
                ) : (
                  <>Update Password <ArrowRight size={18} /></>
                )}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Change Email / Resend
                </button>
                <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
                  Back to Log In
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: Success */}
        {step === 3 && (
          <div className="native-form-container" style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div style={{ 
              width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(8, 127, 115, 0.1)', 
              color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' 
            }}>
              <CheckCircle2 size={40} />
            </div>
            <h2>Password Reset Complete!</h2>
            <p className="text-muted" style={{ margin: '12px 0 25px 0' }}>
              Your account password has been successfully updated. You can now securely log in with your new credentials.
            </p>
            <Link to="/login" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Go to Log In <ArrowRight size={16} />
            </Link>
          </div>
        )}

      </div>

      {/* --- RIGHT SHOWCASE PANEL --- */}
      <div className="login-native-right">
        <div className="native-overlay"></div>
        <div className="native-right-content fade-in-slide">
          
          <div className="native-chip-badge">
            <ShieldCheck size={16} /> Secure Verification
          </div>

          <h1>Account Recovery & Protection</h1>
          <p>
            Restoring access to your Medicare Plus account is quick and secure. Keep your prescriptions, orders, and health essentials protected at all times.
          </p>

          <div className="native-feature-cards">
            <div className="native-feat-card">
              <div className="feat-icon"><ShieldCheck size={20} /></div>
              <div className="feat-info">
                <h4>End-to-End Encryption</h4>
                <p>Industry-standard bcrypt hashing protecting your credentials.</p>
              </div>
            </div>
            
            <div className="native-feat-card">
              <div className="feat-icon"><HeartPulse size={20} /></div>
              <div className="feat-info">
                <h4>Protected Health Records</h4>
                <p>Prescriptions and medical orders safeguarded securely.</p>
              </div>
            </div>

            <div className="native-feat-card">
              <div className="feat-icon"><Headphones size={20} /></div>
              <div className="feat-info">
                <h4>24/7 Support Assistance</h4>
                <p>Need help? Our customer care team is always here for you.</p>
              </div>
            </div>
          </div>

          <div className="native-bottom-strip">
            <div className="strip-item">
              <Truck size={16} /> Express Delivery
            </div>
            <div className="strip-dot">•</div>
            <div className="strip-item">
              <Activity size={16} /> 100% Genuine Medicines
            </div>
            <div className="strip-dot">•</div>
            <div className="strip-item">
              <Stethoscope size={16} /> Certified Pharmacists
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
