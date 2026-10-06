import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const LocationContext = createContext();

export function useLocationContext() {
  return useContext(LocationContext);
}

export function LocationProvider({ children }) {
  const [currentLocation, setCurrentLocation] = useState(() => {
    return localStorage.getItem('userLocation') || 'Select Location';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const setLocation = (location) => {
    setCurrentLocation(location);
    localStorage.setItem('userLocation', location);
    setError(null);
  };

  const requestGeolocation = async () => {
    setIsLoading(true);
    setError(null);
    
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser");
        setIsLoading(false);
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            // Call our PHP backend to reverse geocode
            const response = await api.reverseGeocode(latitude, longitude);
            
            if (response && response.success && response.data && response.data.formattedAddress) {
              setLocation(response.data.formattedAddress);
              resolve(true);
            } else {
              // Reverse geocoding failed (API returned false or unexpected data)
              // Fallback to showing the raw coordinates
              const coordString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
              setLocation(`Location: ${coordString}`);
              resolve(true);
            }
          } catch (err) {
            console.error("Geocoding network error:", err);
            // Fallback to showing the raw coordinates if the network request fails
            const { latitude, longitude } = position.coords;
            const coordString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setLocation(`Location: ${coordString}`);
            resolve(true);
          } finally {
            setIsLoading(false);
          }
        },
        (geoError) => {
          console.error("Geolocation error:", geoError);
          
          switch(geoError.code) {
            case geoError.PERMISSION_DENIED:
              setError("Location permission denied. Please enable it in your browser settings.");
              break;
            case geoError.POSITION_UNAVAILABLE:
              setError("Location information is currently unavailable.");
              break;
            case geoError.TIMEOUT:
              setError("The request to get your location timed out.");
              break;
            default:
              setError("An unknown error occurred while detecting your location.");
              break;
          }
          
          setIsLoading(false);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  };

  return (
    <LocationContext.Provider value={{
      currentLocation,
      setLocation,
      requestGeolocation,
      isLoading,
      error
    }}>
      {children}
    </LocationContext.Provider>
  );
}
