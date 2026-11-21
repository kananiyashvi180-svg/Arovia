import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
  TextInput,
  Platform,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import { Palette, Shadows } from '../constants/theme';
import {
  getNearbyHospitals,
  reverseGeocodeBackend,
} from '../services/medicalService';
import AroviaHeader from '../components/AroviaHeader';
import AroviaBottomNav from '../components/AroviaBottomNav';
import LocationSelectorModal from '../components/LocationSelectorModal';
import gujaratData from '../constants/gujaratLocations.json';
import { isValidHospitalPhone, cleanDialerPhone } from '../utils/phoneValidator';

const RADIUS_OPTIONS = [
  { label: '2 km', value: 2 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
];

export default function LiveMapScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { colors, isDark } = useAppTheme();
  const webViewRef = useRef(null);

  // Unified Location from LocationContext (Single Source of Truth)
  const {
    coords: globalCoords,
    locationDetails,
    loading: locLoading,
    gpsAccuracy,
    isGPSLocked,
    refreshLocation,
    setManualLocation,
  } = useLocation();

  const [loading, setLoading] = useState(true);
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [userLocation, setUserLocation] = useState(globalCoords || null);
  const [cityName, setCityName] = useState(locationDetails?.city || 'Gujarat');
  const [selectedRadius, setSelectedRadius] = useState(10);
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSource, setLocationSource] = useState('gps'); // 'gps' | 'manual'
  const [errorMessage, setErrorMessage] = useState(null);

  // Sync with global location when coords update
  useEffect(() => {
    if (globalCoords?.latitude && globalCoords?.longitude) {
      setUserLocation(globalCoords);
      setCityName(locationDetails?.city || 'Gujarat');
      fetchHospitalsForCoords(globalCoords.latitude, globalCoords.longitude, selectedRadius);
    } else {
      initLocation(selectedRadius);
    }
  }, [globalCoords?.latitude, globalCoords?.longitude, locationDetails?.city]);

  const initLocation = async (radius = selectedRadius) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await refreshLocation(false);
      if (res?.coords) {
        setUserLocation(res.coords);
        setCityName(res.details?.city || 'Gujarat');
        setLocationSource('gps');
        await fetchHospitalsForCoords(res.coords.latitude, res.coords.longitude, radius);
        return;
      }

      // If user profile has saved coordinates, use them
      if (user?.location?.latitude && user?.location?.longitude) {
        const uLat = user.location.latitude;
        const uLng = user.location.longitude;
        setUserLocation({ latitude: uLat, longitude: uLng });
        setCityName(user.location.city || 'Gujarat');
        setLocationSource('profile');
        await fetchHospitalsForCoords(uLat, uLng, radius);
        return;
      }

      // If no GPS yet, prompt manual city selection or fallback to state center
      setErrorMessage('GPS coordinates pending. Tap Recenter GPS or Change City.');
      setUserLocation({ latitude: 22.2587, longitude: 71.1924 });
      setCityName('Gujarat');
      await fetchHospitalsForCoords(22.2587, 71.1924, radius);
    } catch (err) {
      console.warn('Init location error:', err);
      setErrorMessage('Could not obtain accurate GPS. You can tap Change City or Recenter.');
    } finally {
      setLoading(false);
      setGpsDetecting(false);
    }
  };

  const fetchHospitalsForCoords = async (latitude, longitude, radiusKm) => {
    try {
      const res = await getNearbyHospitals({
        latitude,
        longitude,
        radiusKm,
        limit: 50,
      });

      if (res?.success && Array.isArray(res.data)) {
        setHospitals(res.data);
        if (res.data.length > 0) {
          setSelectedHospital(res.data[0]);
        } else {
          setSelectedHospital(null);
        }
      } else {
        setHospitals([]);
        setSelectedHospital(null);
      }
    } catch (err) {
      console.warn('Error fetching nearby hospitals:', err);
      setHospitals([]);
      setSelectedHospital(null);
    }
  };

  const handleRecenter = async () => {
    setGpsDetecting(true);
    try {
      const res = await refreshLocation(true);
      if (res?.coords) {
        const { latitude, longitude } = res.coords;
        setUserLocation(res.coords);
        setCityName(res.details?.city || 'Gujarat');
        setLocationSource('gps');

        await fetchHospitalsForCoords(latitude, longitude, selectedRadius);

        // Center map to new coordinates
        const jsCode = `if (window.map) { window.map.setView([${latitude}, ${longitude}], 14); } true;`;
        webViewRef.current?.injectJavaScript(jsCode);
      } else {
        Alert.alert('GPS Notice', 'Could not obtain satellite GPS fix. Please verify device GPS is on.');
      }
    } catch (err) {
      Alert.alert('GPS Error', 'Could not fetch current live GPS location. Please try again.');
    } finally {
      setGpsDetecting(false);
    }
  };

  const handleRadiusChange = (radius) => {
    setSelectedRadius(radius);
    if (userLocation) {
      fetchHospitalsForCoords(userLocation.latitude, userLocation.longitude, radius);
    }
  };

  const handleSelectManualCity = (selected) => {
    setShowLocationModal(false);
    if (!selected) return;

    const cityObj = selected.city;
    if (cityObj?.latitude && cityObj?.longitude) {
      const newCoords = { latitude: cityObj.latitude, longitude: cityObj.longitude };
      setUserLocation(newCoords);
      setCityName(cityObj.name);
      setLocationSource('manual');
      setGpsAccuracy(null);
      fetchHospitalsForCoords(newCoords.latitude, newCoords.longitude, selectedRadius);

      const jsCode = `if (window.map) { window.map.setView([${newCoords.latitude}, ${newCoords.longitude}], 13); } true;`;
      webViewRef.current?.injectJavaScript(jsCode);
    }
  };

  const filteredHospitals = hospitals.filter((h) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const nameMatch = h.name?.toLowerCase().includes(q);
    const cityMatch = h.city?.toLowerCase().includes(q);
    const areaMatch = h.area?.toLowerCase().includes(q);
    const specMatch = h.specialties?.some((s) => s.toLowerCase().includes(q));
    return nameMatch || cityMatch || areaMatch || specMatch;
  });

  // Handle marker tap message from Leaflet inside WebView
  const handleWebViewMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SELECT_HOSPITAL' && msg.id) {
        const found = hospitals.find((h) => String(h._id) === String(msg.id));
        if (found) {
          setSelectedHospital(found);
        }
      }
    } catch (err) {
      console.warn('WebView msg error:', err);
    }
  };

  // Generate Leaflet Map HTML
  const generateLeafletHtml = useCallback(() => {
    const lat = userLocation?.latitude || 22.2442;
    const lng = userLocation?.longitude || 68.9685;
    const userCity = cityName || 'Your Location';

    const safeHospitals = filteredHospitals.map((h) => {
      const hLat = h.location?.latitude || (h.geo?.coordinates ? h.geo.coordinates[1] : null);
      const hLng = h.location?.longitude || (h.geo?.coordinates ? h.geo.coordinates[0] : null);
      return {
        id: String(h._id || ''),
        name: (h.name || 'Hospital').replace(/'/g, "\\'"),
        lat: hLat,
        lng: hLng,
        dist: h.distanceFormatted || '',
        type: (h.type || 'Hospital').replace(/'/g, "\\'"),
      };
    }).filter((h) => h.lat && h.lng);

    const hospitalsJson = JSON.stringify(safeHospitals);
    const selectedId = selectedHospital ? String(selectedHospital._id) : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
            background-color: ${isDark ? '#0F172A' : '#F8FAFC'};
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          #map {
            height: 100%;
            width: 100%;
          }
          /* Custom user live marker */
          .user-pin-wrap {
            position: relative;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .user-pulse-ring {
            position: absolute;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: rgba(37, 99, 235, 0.35);
            animation: pulse-kf 2s infinite ease-out;
          }
          .user-core-dot {
            position: absolute;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #2563EB;
            border: 3px solid #FFFFFF;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          }
          @keyframes pulse-kf {
            0% { transform: scale(0.6); opacity: 1; }
            100% { transform: scale(1.8); opacity: 0; }
          }

          /* Custom hospital marker pin */
          .hosp-pin {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: #DC2626;
            border: 2.5px solid #FFFFFF;
            box-shadow: 0 3px 8px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s;
          }
          .hosp-pin.selected {
            background: #0284C7 !important;
            transform: scale(1.35);
            border-color: #FEF08A;
            box-shadow: 0 6px 14px rgba(2, 132, 199, 0.6);
            z-index: 9999 !important;
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.18);
            font-size: 13px;
          }
          .leaflet-popup-content {
            margin: 10px 14px;
            line-height: 1.4;
          }
          .pop-title {
            font-weight: 700;
            color: #0F172A;
            font-size: 14px;
            margin-bottom: 2px;
          }
          .pop-sub {
            color: #64748B;
            font-size: 11px;
            margin-bottom: 4px;
          }
          .pop-dist {
            display: inline-block;
            background: #EFF6FF;
            color: #2563EB;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 6px;
            font-size: 11px;
          }
        </style>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([${lat}, ${lng}], 13);

          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          // Add user live position marker
          var userIcon = L.divIcon({
            className: 'user-marker-container',
            html: '<div class="user-pin-wrap"><div class="user-pulse-ring"></div><div class="user-core-dot"></div></div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          var userMarker = L.marker([${lat}, ${lng}], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
          userMarker.bindPopup('<div class="pop-title">📍 You Are Here</div><div class="pop-sub">${userCity}</div>');

          // Hospital markers
          var hospitals = ${hospitalsJson};
          var selectedId = "${selectedId}";
          var markerMap = {};

          hospitals.forEach(function(h) {
            var isSel = (h.id === selectedId);
            var pinClass = isSel ? 'hosp-pin selected' : 'hosp-pin';
            var icon = L.divIcon({
              className: 'hosp-marker-container',
              html: '<div class="' + pinClass + '" id="pin-' + h.id + '">🏥</div>',
              iconSize: [34, 34],
              iconAnchor: [17, 17]
            });

            var m = L.marker([h.lat, h.lng], { icon: icon }).addTo(map);
            markerMap[h.id] = m;

            var popupContent = '<div class="pop-title">' + h.name + '</div>' +
              '<div class="pop-sub">' + h.type + '</div>' +
              (h.dist ? '<span class="pop-dist">📍 ' + h.dist + ' away</span>' : '');
            m.bindPopup(popupContent);

            m.on('click', function() {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'SELECT_HOSPITAL',
                  id: h.id
                }));
              }
            });
          });

          window.map = map;
        </script>
      </body>
      </html>
    `;
  }, [userLocation, cityName, filteredHospitals, selectedHospital, isDark]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AroviaHeader activeNav="Map Area View" />

      {/* Top Location & Filter Header Bar */}
      <View
        style={[
          styles.mapControlBar,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderBottomColor: colors.cardBorder,
          },
        ]}
      >
        {/* Location Status Bar */}
        <View style={styles.locStatusBar}>
          <View style={styles.locInfoLeft}>
            <Ionicons
              name={locationSource === 'gps' ? 'navigate-circle' : 'location-sharp'}
              size={18}
              color={locationSource === 'gps' ? '#10B981' : Palette.primaryBlue}
            />
            <View style={{ marginLeft: 6 }}>
              <Text style={[styles.locCityText, { color: colors.text }]} numberOfLines={1}>
                {cityName}, Gujarat
              </Text>
              <Text style={styles.locStatusSub}>
                {locationSource === 'gps'
                  ? `Live GPS${gpsAccuracy ? ` (±${gpsAccuracy}m)` : ''}`
                  : 'Selected City Area'}
              </Text>
            </View>
          </View>

          <View style={styles.locActionsRight}>
            <TouchableOpacity
              style={[styles.cityChangeBtn, { borderColor: colors.cardBorder }]}
              onPress={() => setShowLocationModal(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.cityChangeBtnText, { color: Palette.primaryBlue }]}>
                Change City
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.recenterBtn, { opacity: gpsDetecting ? 0.6 : 1 }]}
              onPress={handleRecenter}
              disabled={gpsDetecting}
              activeOpacity={0.8}
            >
              {gpsDetecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="locate" size={15} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarWrap}>
          <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.mapSearchInput, { color: colors.text }]}
            placeholder="Search hospitals on map..."
            placeholderTextColor="#94A3B8"
            value={searchFilter}
            onChangeText={setSearchFilter}
          />
          {searchFilter.length > 0 && (
            <TouchableOpacity onPress={() => setSearchFilter('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Radius Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.radiusPillsRow}
        >
          <Text style={[styles.radiusLabel, { color: colors.textSecondary }]}>Radius:</Text>
          {RADIUS_OPTIONS.map((opt) => {
            const active = selectedRadius === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.radiusPill,
                  {
                    backgroundColor: active ? Palette.primaryBlue : isDark ? '#334155' : '#F1F5F9',
                    borderColor: active ? Palette.primaryBlue : colors.cardBorder,
                  },
                ]}
                onPress={() => handleRadiusChange(opt.value)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.radiusPillText,
                    {
                      color: active ? '#FFFFFF' : colors.text,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Map Interactive Canvas */}
      <View style={styles.mapCanvasContainer}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Palette.primaryBlue} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Finding verified hospitals near {cityName}...
            </Text>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: generateLeafletHtml() }}
            style={styles.webView}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={true}
            bounces={false}
            scrollEnabled={false}
          />
        )}

        {/* Floating Hospital Count Badge */}
        {!loading && (
          <View style={styles.countFloatingBadge}>
            <Ionicons name="medkit" size={14} color="#0284C7" />
            <Text style={styles.countFloatingText}>
              {filteredHospitals.length} hospitals within {selectedRadius} km
            </Text>
          </View>
        )}
      </View>

      {/* Selected Hospital Bottom Card */}
      {selectedHospital && (
        <View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderTopColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.sheetBadgeRow}>
                <View style={styles.sheetSpecBadge}>
                  <Text style={styles.sheetSpecBadgeText}>
                    {selectedHospital.type || 'Healthcare Facility'}
                  </Text>
                </View>
                {selectedHospital.distanceFormatted && (
                  <View style={styles.sheetDistBadge}>
                    <Text style={styles.sheetDistBadgeText}>
                      📍 {selectedHospital.distanceFormatted}
                    </Text>
                  </View>
                )}
                {selectedHospital.verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.sheetHospitalName, { color: colors.text }]} numberOfLines={1}>
                {selectedHospital.name}
              </Text>

              <Text
                style={[styles.sheetHospitalAddress, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {selectedHospital.area ? `${selectedHospital.area}, ` : ''}
                {selectedHospital.city || cityName}
              </Text>
            </View>

            <View style={styles.sheetRating}>
              <Ionicons name="star" size={13} color="#D97706" />
              <Text style={styles.sheetRatingVal}>{selectedHospital.rating || '4.8'}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.sheetButtonsRow}>
            {selectedHospital.isPhoneVerified && isValidHospitalPhone(selectedHospital.phone || selectedHospital.contactNumber) ? (
              <TouchableOpacity
                style={[styles.callBtn, { borderColor: '#10B981' }]}
                onPress={() => {
                  const cleaned = cleanDialerPhone(selectedHospital.phone || selectedHospital.contactNumber);
                  if (cleaned) Linking.openURL(`tel:${cleaned}`);
                }}
              >
                <Ionicons name="call" size={15} color="#10B981" />
                <Text style={styles.callBtnText}>Call</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.sheetDirectionsBtn, { borderColor: Palette.primaryBlue }]}
              onPress={() => {
                const q = encodeURIComponent(
                  `${selectedHospital.name} ${selectedHospital.city || cityName}`
                );
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
              }}
            >
              <Ionicons name="navigate" size={15} color={Palette.primaryBlue} />
              <Text style={[styles.sheetDirectionsBtnText, { color: Palette.primaryBlue }]}>
                Directions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetDetailsBtn, { backgroundColor: Palette.primaryBlue }]}
              onPress={() =>
                router.push({
                  pathname: '/hospital-details',
                  params: { id: selectedHospital._id },
                })
              }
            >
              <Text style={styles.sheetDetailsBtnText}>Details →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Manual Location Selector Modal */}
      <LocationSelectorModal
        visible={showLocationModal}
        districts={gujaratData.districts || []}
        currentCity={cityName}
        onSelectLocation={handleSelectManualCity}
        onClose={() => setShowLocationModal(false)}
      />

      <AroviaBottomNav activeTab="Nearby Hospitals" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  mapControlBar: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  locStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locCityText: {
    fontSize: 14,
    fontWeight: '700',
  },
  locStatusSub: {
    fontSize: 11,
    color: '#64748B',
  },
  locActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityChangeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
  },
  cityChangeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  recenterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Palette.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    marginBottom: 8,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  radiusPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  radiusLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  radiusPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  radiusPillText: {
    fontSize: 11,
  },
  mapCanvasContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  countFloatingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  countFloatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  bottomSheet: {
    padding: 14,
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sheetBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  sheetSpecBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sheetSpecBadgeText: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: '700',
  },
  sheetDistBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sheetDistBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '700',
  },
  sheetHospitalName: {
    fontSize: 15,
    fontWeight: '800',
  },
  sheetHospitalAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  sheetRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  sheetRatingVal: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 12,
  },
  sheetButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderRadius: 10,
    gap: 4,
  },
  callBtnText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 12,
  },
  sheetDirectionsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth: 1.5,
    borderRadius: 10,
    gap: 4,
  },
  sheetDirectionsBtnText: {
    fontWeight: '700',
    fontSize: 12,
  },
  sheetDetailsBtn: {
    flex: 1.1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDetailsBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
