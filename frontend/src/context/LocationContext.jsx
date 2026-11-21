import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reverseGeocodeLocation, findNearestGujaratDistrict } from '../utils/locationService';

export const LocationContext = createContext(null);

const CACHED_LOCATION_KEY = '@arovia_current_location';
const MANUAL_CITY_KEY = '@arovia_manual_city';

export function LocationProvider({ children }) {
  const [coords, setCoords] = useState(null);
  const [locationDetails, setLocationDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [isGPSLocked, setIsGPSLocked] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null);

  // Initialize on app start
  useEffect(() => {
    loadCachedOrInit();
  }, []);

  const loadCachedOrInit = async () => {
    try {
      // 1. Check if we have permission already
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status === 'granted') {
        // Automatically fetch fresh live GPS on startup if permission is already granted
        await refreshLocation(false);
      } else {
        // Permission not yet granted — check if a manual city was previously selected
        const savedManual = await AsyncStorage.getItem(MANUAL_CITY_KEY);
        if (savedManual) {
          try {
            const parsed = JSON.parse(savedManual);
            if (parsed && parsed.city) {
              setLocationDetails(parsed);
              if (parsed.latitude && parsed.longitude) {
                setCoords({
                  latitude: parsed.latitude,
                  longitude: parsed.longitude,
                  accuracy: null,
                });
              }
              return;
            }
          } catch (_) {
            setLocationDetails({
              city: savedManual,
              district: 'Gujarat',
              state: 'Gujarat',
              displayName: `${savedManual}, Gujarat`,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Location initialization notice:', e.message);
    }
  };

  /**
   * Refresh device GPS location with high precision and error recovery
   * @param {boolean} promptUser - whether to prompt for permission if not granted
   */
  const refreshLocation = useCallback(async (promptUser = true) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Verify device location services (GPS hardware switch)
      const isServiceEnabled = await Location.hasServicesEnabledAsync();
      if (!isServiceEnabled) {
        setError('Device GPS is turned off. Please turn on Location services in your settings.');
        setLoading(false);
        return null;
      }

      // 2. Check / Request Permissions
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (promptUser) {
          const req = await Location.requestForegroundPermissionsAsync();
          status = req.status;
        }
      }
      setPermissionStatus(status);

      if (status !== 'granted') {
        setError('Location permission denied. Please grant permission or choose your city manually.');
        setLoading(false);
        return null;
      }

      // 3. Acquire GPS Coordinates with satellite lock + timeout recovery
      let position = null;
      try {
        position = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Satellite GPS lock timed out')), 8000)
          ),
        ]);
      } catch (timeoutErr) {
        // Fallback to High accuracy (cellular/WiFi aided GPS lock)
        position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      }

      if (!position?.coords) {
        throw new Error('Device GPS returned empty coordinates.');
      }

      let { latitude, longitude, accuracy } = position.coords;
      let accMeters = typeof accuracy === 'number' ? Math.round(accuracy) : null;

      // 4. Accuracy Check: If accuracy is poor (>500m), retry once to refine satellite fix
      if (accMeters && accMeters > 500) {
        try {
          const refined = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          if (refined?.coords) {
            latitude = refined.coords.latitude;
            longitude = refined.coords.longitude;
            accMeters = typeof refined.coords.accuracy === 'number' ? Math.round(refined.coords.accuracy) : accMeters;
          }
        } catch (_) {}
      }

      const activeCoords = {
        latitude,
        longitude,
        accuracy: accMeters,
        timestamp: position.timestamp || Date.now(),
      };

      setCoords(activeCoords);
      setGpsAccuracy(accMeters);
      setIsGPSLocked(true);

      // 5. Accurate Reverse Geocoding
      const resolved = await reverseGeocodeLocation(latitude, longitude);

      setLocationDetails(resolved);
      setError(null);

      // 6. Cache latest verified location
      await AsyncStorage.setItem(
        CACHED_LOCATION_KEY,
        JSON.stringify({ coords: activeCoords, details: resolved })
      );
      await AsyncStorage.setItem(MANUAL_CITY_KEY, resolved.city);

      setLoading(false);
      return { coords: activeCoords, details: resolved };
    } catch (err) {
      console.warn('GPS acquisition error:', err.message);
      setError('Unable to acquire satellite GPS fix. Please verify device GPS or select manually.');
      setLoading(false);
      return null;
    }
  }, []);

  /**
   * Set a manual location as fallback if user prefers or GPS is unavailable
   */
  const setManualLocation = useCallback(async (cityName, districtName = 'Gujarat', explicitCoords = null) => {
    let finalCoords = explicitCoords;

    if (!finalCoords && cityName) {
      try {
        const geo = await Location.geocodeAsync(`${cityName}, Gujarat, India`);
        if (geo && geo[0]) {
          finalCoords = {
            latitude: geo[0].latitude,
            longitude: geo[0].longitude,
            accuracy: null,
          };
        }
      } catch (e) {
        console.warn('Geocoding manual city note:', e.message);
      }
    }

    if (!finalCoords && districtName) {
      const nearest = findNearestGujaratDistrict(22.25, 71.0); // Gujarat centroid search
      if (nearest) {
        finalCoords = { latitude: nearest.lat, longitude: nearest.lon, accuracy: null };
      }
    }

    const details = {
      city: cityName,
      district: districtName,
      state: 'Gujarat',
      taluka: cityName,
      villageArea: '',
      postalCode: '',
      country: 'India',
      displayName: `${cityName}, ${districtName}, Gujarat`,
      formattedAddress: `${cityName}, ${districtName}, Gujarat`,
      latitude: finalCoords?.latitude || null,
      longitude: finalCoords?.longitude || null,
    };

    setLocationDetails(details);
    if (finalCoords) {
      setCoords(finalCoords);
    }
    setGpsAccuracy(null);
    setIsGPSLocked(false);
    setError(null);

    await AsyncStorage.setItem(MANUAL_CITY_KEY, JSON.stringify(details));
  }, []);

  return (
    <LocationContext.Provider
      value={{
        coords,
        locationDetails,
        loading,
        error,
        gpsAccuracy,
        isGPSLocked,
        permissionStatus,
        refreshLocation,
        setManualLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
