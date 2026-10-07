import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useLocationContext } from '../context/LocationContext';
import { useSettings } from '../context/SettingsContext';
import { CheckCircle2, UploadCloud, CreditCard, Banknote, ShieldCheck, MapPin, Loader2 } from 'lucide-react';
import api from '../services/api';
import './Checkout.css';

export default function Checkout() {
  const { items: cartItems, subtotal, clearCart, appliedCoupon } = useCart();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { currentLocation } = useLocationContext();
  const { settings } = useSettings();

  // Settings from Backend
  const FREE_DELIVERY_THRESHOLD = settings?.free_delivery_above !== undefined ? Number(settings.free_delivery_above) : 499;
  const standardDeliveryFee = settings?.delivery_charge !== undefined ? Number(settings.delivery_charge) : 50;
  const enableCod = settings?.enable_cod !== false;
  const enableOnline = settings?.enable_online_payment !== false;
  const codFee = (enableCod && settings?.cod_fee) ? Number(settings.cod_fee) : 0;
  const freeCodAbove = (settings?.free_cod_above !== undefined) ? Number(settings.free_cod_above) : 999;

  // --- STATE ---
  const [step, setStep] = useState(1); // 1: Delivery, 2: Prescription, 3: Payment
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: currentLocation !== 'Select Location' ? currentLocation : '',
    city: '',
    state: '',
    pin: '',
    landmark: ''
  });

  // Initial payment method selection based on enabled methods
  const initialPaymentMethod = enableOnline ? 'online' : (enableCod ? 'cod' : 'online');
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod);

  // Delivery fee calculation
  const deliveryFee = subtotal > 0 ? (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : standardDeliveryFee) : 0;
  // Apply COD fee if COD is selected and subtotal below freeCodAbove
  const appliedCodFee = (paymentMethod === 'cod' && subtotal < freeCodAbove) ? codFee : 0;
  const discountAmount = appliedCoupon ? (parseFloat(appliedCoupon.discount_amount) || 0) : 0;
  const finalTotal = Math.max(0, subtotal + deliveryFee + appliedCodFee - discountAmount);

  // Redirect if cart is empty
  if (cartItems.length === 0) {
    return (
      <div className="section-padding text-center">
        <h2>Your cart is empty</h2>
        <p>Please add items to your cart before proceeding to checkout.</p>
        <Link to="/shop" className="btn-primary mt-20" style={{display: 'inline-block'}}>Back to Shop</Link>
      </div>
    );
  }

  // Check if prescription is required
  // (In a real app, this property exists on the backend product data. We check if any item needs it.)
  const requiresPrescription = cartItems.some(item => item.category === 'Medicines' || item.requiresPrescription);

  // --- HANDLERS ---
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDeliverySubmit = (e) => {
    e.preventDefault();
    // Move to next step depending on prescription requirement
    if (requiresPrescription) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePrescriptionSubmit = () => {
    if (file) {
      setStep(3);
    } else {
      alert("Please upload a valid prescription to proceed.");
    }
  };

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const handlePlaceOrder = async () => {
    setIsSubmittingOrder(true);
    try {
      let uploadedPrescriptionId = null;

      // 1. If prescription required, upload it first
      if (requiresPrescription && file) {
        const rxFormData = new FormData();
        rxFormData.append('file', file);
        rxFormData.append('message', `Order checkout prescription for ${formData.fullName}`);

        const rxRes = await api.uploadPrescription(rxFormData);
        if (rxRes && rxRes.success) {
          uploadedPrescriptionId = rxRes.data?.prescription_id || rxRes.data?.id;
        } else {
          throw new Error(rxRes?.message || 'Failed to upload prescription.');
        }
      }

      // 2. Submit order to backend
      const deliveryAddress = `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pin}${formData.landmark ? ` (Landmark: ${formData.landmark})` : ''}`;
      
      const orderPayload = {
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        paymentMethod: paymentMethod.toUpperCase(),
        address: deliveryAddress,
        prescription_id: uploadedPrescriptionId,
        coupon_id: appliedCoupon ? appliedCoupon.coupon_id : null,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        discount_amount: discountAmount
      };

      const res = await api.createOrder(orderPayload);
      if (res && res.success) {
        clearCart();
        addToast('✓ Order placed successfully! Our pharmacy team is processing it.', 'success');
        navigate('/account/orders');
      } else {
        throw new Error(res?.message || 'Failed to place order.');
      }
    } catch (err) {
      console.error('Order placement failed:', err);
      alert(err.response?.data?.message || err.message || 'Unable to place order at this time. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="checkout-page section-padding">
      <div className="checkout-container">
        <h1 className="checkout-title">Checkout</h1>

        <div className="checkout-layout">
          
          {/* LEFT: Checkout Steps */}
          <div className="checkout-steps-column">
            
            {/* STEP 1: Delivery Information */}
            <div className={`checkout-step-card ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              <div className="step-header">
                <div className="step-number">1</div>
                <h3>Delivery Information</h3>
                {step > 1 && <CheckCircle2 className="step-check text-success" />}
              </div>
              
              {step === 1 && (
                <div className="step-content">
                  <form onSubmit={handleDeliverySubmit} className="checkout-form">
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Full Name *</label>
                        <input type="text" name="fullName" required value={formData.fullName} onChange={handleInputChange} />
                      </div>
                      <div className="form-group">
                        <label>Phone Number *</label>
                        <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Email Address *</label>
                      <input type="email" name="email" required value={formData.email} onChange={handleInputChange} />
                    </div>

                    <div className="form-group">
                      <label>Delivery Address *</label>
                      <input type="text" name="address" required value={formData.address} onChange={handleInputChange} placeholder="House No, Building, Street" />
                    </div>

                    <div className="form-row three-cols">
                      <div className="form-group">
                        <label>City *</label>
                        <input type="text" name="city" required value={formData.city} onChange={handleInputChange} />
                      </div>
                      <div className="form-group">
                        <label>State *</label>
                        <input type="text" name="state" required value={formData.state} onChange={handleInputChange} />
                      </div>
                      <div className="form-group">
                        <label>PIN Code *</label>
                        <input type="text" name="pin" required value={formData.pin} onChange={handleInputChange} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Landmark (Optional)</label>
                      <input type="text" name="landmark" value={formData.landmark} onChange={handleInputChange} />
                    </div>

                    <div className="step-actions flex-between">
                      <button type="submit" className="checkout-btn btn-primary">
                        CONTINUE TO {requiresPrescription ? 'PRESCRIPTION' : 'PAYMENT'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {step > 1 && (
                <div className="step-summary">
                  <p><strong>{formData.fullName}</strong> | {formData.phone}</p>
                  <p>{formData.address}, {formData.city}, {formData.state} - {formData.pin}</p>
                  <button className="text-btn text-primary mt-10" onClick={() => setStep(1)}>Edit Delivery Info</button>
                </div>
              )}
            </div>

            {/* STEP 2: Prescription (Conditional) */}
            {requiresPrescription && (
              <div className={`checkout-step-card ${step === 2 ? 'active' : step > 2 ? 'completed' : 'disabled'}`}>
                <div className="step-header">
                  <div className="step-number">2</div>
                  <h3>Prescription Upload</h3>
                  {step > 2 && <CheckCircle2 className="step-check text-success" />}
                </div>
                
                {step === 2 && (
                  <div className="step-content">
                    <div className="prescription-alert">
                      <ShieldCheck size={20} className="alert-icon" />
                      <div>
                        <strong>Prescription required for this order</strong>
                        <p>One or more items in your cart require a valid medical prescription.</p>
                      </div>
                    </div>

                    <div className="upload-dropzone">
                      <input 
                        type="file" 
                        id="prescription-file" 
                        accept=".jpg,.jpeg,.png,.pdf" 
                        onChange={handleFileUpload} 
                        className="file-input-hidden"
                      />
                      <label htmlFor="prescription-file" className="upload-label">
                        <UploadCloud size={40} className="upload-icon" />
                        <span className="upload-text">Click to upload or drag and drop</span>
                        <span className="upload-hint">Supported formats: JPG, PNG, PDF (Max 5MB)</span>
                      </label>
                      {file && (
                        <div className="file-preview">
                          <span className="file-name text-success">✓ {file.name} uploaded successfully.</span>
                        </div>
                      )}
                    </div>

                    <div className="step-actions flex-between">
                      <button className="checkout-btn checkout-btn-outline" onClick={() => setStep(1)}>BACK</button>
                      <button className="checkout-btn btn-primary" onClick={handlePrescriptionSubmit} disabled={!file}>CONTINUE TO PAYMENT</button>
                    </div>
                  </div>
                )}
                {step > 2 && (
                  <div className="step-summary">
                    <p className="text-success">✓ Prescription document uploaded.</p>
                    <button className="text-btn text-primary mt-10" onClick={() => setStep(2)}>Re-upload Document</button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Payment */}
            <div className={`checkout-step-card ${step === 3 ? 'active' : 'disabled'}`}>
              <div className="step-header">
                <div className="step-number">{requiresPrescription ? '3' : '2'}</div>
                <h3>Payment Method</h3>
              </div>
              
              {step === 3 && (
                <div className="step-content">
                  
                  <div className="payment-options">
                    {enableOnline && (
                      <label className={`payment-option-card ${paymentMethod === 'online' ? 'selected' : ''}`}>
                        <input 
                          type="radio" 
                          name="payment" 
                          value="online" 
                          checked={paymentMethod === 'online'} 
                          onChange={() => setPaymentMethod('online')} 
                        />
                        <CreditCard size={24} className="payment-icon" />
                        <div className="payment-info">
                          <strong>Online Payment (Credit/Debit/UPI)</strong>
                          <span>Pay securely via our payment gateway.</span>
                        </div>
                      </label>
                    )}

                    {enableCod && (
                      <label className={`payment-option-card ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                        <input 
                          type="radio" 
                          name="payment" 
                          value="cod" 
                          checked={paymentMethod === 'cod'} 
                          onChange={() => setPaymentMethod('cod')} 
                        />
                        <Banknote size={24} className="payment-icon" />
                        <div className="payment-info">
                          <strong>Cash on Delivery (COD)</strong>
                          <span>
                            Pay with cash upon delivery.
                            {appliedCodFee > 0 && ` (₹${appliedCodFee} handling fee)`}
                          </span>
                        </div>
                      </label>
                    )}

                    {!enableOnline && !enableCod && (
                      <div className="p-16 text-center text-muted" style={{ background: '#f8fafc', borderRadius: '10px' }}>
                        No payment methods are currently active. Please contact support.
                      </div>
                    )}
                  </div>

                  {/* Integration-Ready UI Box */}
                  {paymentMethod === 'online' && (
                    <div className="payment-gateway-placeholder">
                      <p>Payment Gateway Element loads here (Stripe / Razorpay)</p>
                    </div>
                  )}

                  <div className="step-actions flex-between mt-20">
                    <button className="checkout-btn checkout-btn-outline" onClick={() => setStep(requiresPrescription ? 2 : 1)}>BACK</button>
                    <button 
                      className="checkout-btn btn-primary" 
                      onClick={handlePlaceOrder}
                      disabled={isSubmittingOrder}
                    >
                      {isSubmittingOrder && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                      <span>{isSubmittingOrder ? 'Processing Order...' : `PLACE ORDER (₹${finalTotal.toFixed(2)})`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT: Order Summary */}
          <div className="checkout-summary-column">
            <div className="order-summary-box">
              <h3 className="order-details-title">Order Details</h3>
              
              <div className="checkout-items-list">
                {cartItems.map(item => (
                  <div key={item.id} className="order-item">
                    <div className="checkout-item-info">
                      <span className="product-name">{item.name}</span>
                      <span className="product-qty">Qty: {item.quantity}</span>
                    </div>
                    <span className="product-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="summary-row">
                <span>Subtotal</span>
                <strong>₹{subtotal.toFixed(2)}</strong>
              </div>
              {discountAmount > 0 && (
                <div className="summary-row" style={{ color: 'var(--primary-dark)' }}>
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <strong>-₹{discountAmount.toFixed(2)}</strong>
                </div>
              )}
              <div className="summary-row">
                <span>Delivery</span>
                <strong>{deliveryFee === 0 ? <span className="text-success">FREE</span> : `₹${deliveryFee.toFixed(2)}`}</strong>
              </div>
              {appliedCodFee > 0 && (
                <div className="summary-row">
                  <span>COD Handling Fee</span>
                  <strong>₹{appliedCodFee.toFixed(2)}</strong>
                </div>
              )}
              
              {currentLocation !== 'Select Location' && (
                <div className="delivery-zone">
                  <MapPin size={16} color="var(--primary-dark)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    Selected Zone: <strong>{currentLocation}</strong>
                  </span>
                </div>
              )}
              
              <div className="summary-divider"></div>
              
              <div className="summary-row total-row">
                <span>Total</span>
                <strong>₹{finalTotal.toFixed(2)}</strong>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
