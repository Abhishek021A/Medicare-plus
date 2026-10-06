import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Autocomplete } from '@react-google-maps/api';
import { MapPin, Navigation, AlertCircle, Loader2 } from 'lucide-react';
import './GoogleMap.css';

const libraries = ['places'];

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '24px'
};

const defaultCenter = {
  lat: 18.9750,
  lng: 72.8258
};

export default function CustomGoogleMap({ 
  latitude, 
  longitude, 
  title = "Medicare PLUS", 
  address = "123 Health Avenue, Medical District, Mumbai, Maharashtra 400001, India",
  phone = "+91 1800 123 4567",
  showSearch = true
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    libraries,
    preventGoogleFontsLoading: true
  });

  const [map, setMap] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);
  const [center, setCenter] = useState(
    latitude && longitude ? { lat: parseFloat(latitude), lng: parseFloat(longitude) } : defaultCenter
  );
  
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [searchResult, setSearchResult] = useState(null);
  
  const autocompleteRef = useRef(null);

  // Fallback if no API key
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return (
      <div className="map-fallback-container">
        <div className="map-fallback-content">
          <AlertCircle size={48} className="text-muted mb-10" />
          <h3>Map is currently unavailable</h3>
          <p>Please configure the VITE_GOOGLE_MAPS_API_KEY in your environment.</p>
          <div className="fallback-address">
            <strong>{title}</strong><br />
            {address}
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="map-fallback-container error-state">
        <div className="map-fallback-content">
          <AlertCircle size={48} className="text-danger mb-10" />
          <h3>Unable to load Google Maps</h3>
          <p>Please try again or check your internet connection.</p>
          <button className="btn-outline mt-10" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="map-fallback-container loading-state">
        <div className="map-fallback-content">
          <Loader2 size={40} className="spinning text-primary mb-10" style={{ animation: 'spin 1s linear infinite' }} />
          <h3>Loading map...</h3>
        </div>
      </div>
    );
  }

  const onLoad = useCallback(function callback(mapInstance) {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  const handleGetDirections = () => {
    const dest = `${center.lat},${center.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleUseMyLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(pos);
        if (map) {
          map.panTo(pos);
          map.setZoom(14);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationError("Location permission was denied. Allow location access or enter your address manually.");
      }
    );
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const newLocation = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setSearchResult({
          location: newLocation,
          address: place.formatted_address || place.name
        });
        if (map) {
          map.panTo(newLocation);
          map.setZoom(15);
        }
      }
    }
  };

  return (
    <div className="location-map-card">
      
      {showSearch && (
        <div className="map-controls-bar">
          <div className="map-search-container">
            <Autocomplete
              onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }}
              onPlaceChanged={onPlaceChanged}
            >
              <input
                type="text"
                placeholder="Search location..."
                className="map-search-input"
              />
            </Autocomplete>
          </div>
          <button 
            className="btn-my-location" 
            onClick={handleUseMyLocation}
            title="Use My Current Location"
          >
            <MapPin size={18} />
            <span className="hide-on-mobile">My Location</span>
          </button>
        </div>
      )}
      
      {locationError && (
        <div className="map-error-alert">
          <AlertCircle size={16} /> {locationError}
        </div>
      )}

      <div className="map-wrapper">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={14}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            styles: [
              {
                "featureType": "poi.business",
                "stylers": [{ "visibility": "off" }]
              }
            ]
          }}
        >
          {/* Main Business Marker */}
          <Marker
            position={center}
            onClick={() => setActiveMarker('business')}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
            }}
          />

          {/* User Location Marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              onClick={() => setActiveMarker('user')}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }}
            />
          )}
          
          {/* Search Result Marker */}
          {searchResult && (
            <Marker
              position={searchResult.location}
              onClick={() => setActiveMarker('search')}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
              }}
            />
          )}

          {activeMarker === 'business' && (
            <InfoWindow position={center} onCloseClick={() => setActiveMarker(null)}>
              <div className="map-info-window">
                <h4>{title}</h4>
                <p className="trusted-badge">Your trusted online pharmacy</p>
                <div className="info-detail">
                  <MapPin size={14} /> <span>{address}</span>
                </div>
                {phone && (
                  <div className="info-detail">
                    <span>Phone: {phone}</span>
                  </div>
                )}
                <button className="btn-get-directions mt-10" onClick={handleGetDirections}>
                  <Navigation size={14} /> Get Directions
                </button>
              </div>
            </InfoWindow>
          )}

          {activeMarker === 'user' && userLocation && (
            <InfoWindow position={userLocation} onCloseClick={() => setActiveMarker(null)}>
              <div className="map-info-window">
                <h4>Your Location</h4>
                <p>Current position</p>
              </div>
            </InfoWindow>
          )}
          
          {activeMarker === 'search' && searchResult && (
            <InfoWindow position={searchResult.location} onCloseClick={() => setActiveMarker(null)}>
              <div className="map-info-window">
                <h4>Selected Location</h4>
                <p>{searchResult.address}</p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
