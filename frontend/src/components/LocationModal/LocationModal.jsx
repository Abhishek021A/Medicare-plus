import { useState, useEffect } from 'react';
import { X, MapPin, Search, Crosshair, AlertCircle } from 'lucide-react';
import { useLocationContext } from '../../context/LocationContext';
import './LocationModal.css';

export default function LocationModal({ isOpen, onClose }) {
  const { currentLocation, setLocation, requestGeolocation, isLoading, error } = useLocationContext();
  const [pincode, setPincode] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);

  // Load saved addresses from local storage (mock for now, could be an API call)
  useEffect(() => {
    const saved = localStorage.getItem('savedAddresses');
    if (saved) {
      try {
        setSavedAddresses(JSON.parse(saved));
      } catch (e) {
        setSavedAddresses([]);
      }
    } else {
      // Mock some default saved addresses if logged in
      setSavedAddresses([
        { id: 1, type: 'Home', address: '123 Park Street, Kolkata, West Bengal' },
        { id: 2, type: 'Office', address: 'DLF IT Park, Newtown, Kolkata' }
      ]);
    }
  }, []);
  
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // The modal now relies on the individual button handlers to close.

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pincode.trim().length > 3) {
      setLocation(`Pincode: ${pincode}`);
      onClose();
    }
  };

  const handleCitySelect = (city) => {
    setLocation(city);
    onClose();
  };

  const handleUseCurrentLocation = async () => {
    const success = await requestGeolocation();
    if (success) {
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  const handleSavedAddressSelect = (address) => {
    setLocation(address);
    onClose();
  }

  const popularCities = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata'];

  return (
    <div className="location-modal-overlay" onClick={onClose}>
      <div className="location-modal" onClick={e => e.stopPropagation()}>
        <div className="location-modal-header">
          <h3>Choose your location</h3>
          <button className="close-modal-btn" onClick={onClose} disabled={isLoading}>
            <X size={20} />
          </button>
        </div>
        
        <div className="location-modal-content">
          <p className="location-subtitle">
            Delivery options and delivery speeds may vary for different locations
          </p>
          
          {error && (
            <div className="location-error-alert">
              <AlertCircle size={18} />
              <div className="error-content">
                <strong>{error}</strong>
                <div className="error-actions">
                  <button onClick={handleUseCurrentLocation} className="text-btn">Try Again</button>
                  <button onClick={() => document.getElementById('pincode-input').focus()} className="text-btn outline">Enter Address Manually</button>
                </div>
              </div>
            </div>
          )}

          <form className="pincode-form" onSubmit={handleSubmit}>
            <div className="pincode-input-group">
              <input 
                id="pincode-input"
                type="text" 
                placeholder="Enter your pincode or area" 
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                maxLength={6}
                disabled={isLoading}
              />
              <button type="submit" className="btn-primary" disabled={pincode.length < 4 || isLoading}>
                Apply
              </button>
            </div>
          </form>
          
          <div className="location-divider">
            <span>or</span>
          </div>
          
          <button 
            className="use-current-location-btn" 
            onClick={handleUseCurrentLocation}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="loading-spinner"></div>
            ) : (
              <Crosshair size={18} />
            )}
            {isLoading ? "Detecting Location..." : "Use my current location"}
          </button>

          {savedAddresses.length > 0 && (
            <div className="saved-addresses-section">
              <h4>📌 Saved Addresses</h4>
              <div className="saved-addresses-list">
                {savedAddresses.map(addr => (
                  <button 
                    key={addr.id} 
                    className="saved-address-btn"
                    onClick={() => handleSavedAddressSelect(addr.address)}
                  >
                    <strong>{addr.type}</strong>
                    <span className="address-text">{addr.address}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="popular-cities-section">
            <h4>🔎 Popular Cities</h4>
            <div className="cities-grid">
              {popularCities.map(city => (
                <button 
                  key={city} 
                  className={`city-btn ${currentLocation === city ? 'active' : ''}`}
                  onClick={() => handleCitySelect(city)}
                  disabled={isLoading}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
