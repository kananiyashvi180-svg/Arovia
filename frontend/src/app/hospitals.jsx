import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import { Palette, Shadows } from '../constants/theme';
import {
  getHospitals,
  getNearbyHospitals,
  reverseGeocodeBackend,
} from '../services/medicalService';
import gujaratData from '../constants/gujaratLocations.json';
import AroviaHeader from '../components/AroviaHeader';
import AroviaBottomNav from '../components/AroviaBottomNav';
import LocationSelectorModal from '../components/LocationSelectorModal';
import { isValidHospitalPhone, cleanDialerPhone } from '../utils/phoneValidator';

const FACILITY_CATEGORIES = [
  'All Hospitals',
  'Multi-Specialty',
  'Government',
  'General',
  'Emergency',
  'Cardiology',
  'Children\'s Hospital',
  'Eye Hospital',
  'Dental Hospital',
  'Orthopedics',
  'Maternity',
  'Cancer Care',
  'Neurology',
  'Diagnostic Centre',
];

const DISTANCE_FILTERS = [
  { label: 'Within 2 km', value: 2 },
  { label: 'Within 5 km', value: 5 },
  { label: 'Within 10 km', value: 10 },
  { label: 'Within 25 km', value: 25 },
  { label: 'Within 50 km', value: 50 },
  { label: 'Within 100 km', value: 100 },
  { label: 'All Results', value: 150 },
];

const SORT_OPTIONS = [
  { label: 'Nearest First', value: 'distance' },
  { label: 'Highest Rated', value: 'rating' },
];

// Flatten cities across all Gujarat districts for manual search
const ALL_GUJARAT_CITIES = gujaratData.districts.flatMap((d) =>
  d.cities.map((c) => ({
    name: `${c.name}, ${d.name}`,
    cityName: c.name,
    districtName: d.name,
    taluka: c.taluka,
  }))
);

export default function NearbyHospitalsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { colors, isDark } = useAppTheme();

  // Protect screen from unauthenticated access
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace({
        pathname: '/(auth)/login',
        params: {
          redirect: '/hospitals',
          message: 'Please sign in to discover nearby hospitals.',
        },
      });
    }
  }, [isAuthenticated, authLoading]);

  // Search, Category, and Radius states
  const [searchQuery, setSearchQuery] = useState(params.search ? String(params.search) : '');
  const [selectedCategory, setSelectedCategory] = useState(
    params.specialty ? String(params.specialty) : 'All Hospitals'
  );
  const [selectedRadius, setSelectedRadius] = useState(25);
  const [sortBy, setSortBy] = useState('distance');

  // Unified Location from LocationContext (Single Source of Truth)
  const {
    coords,
    locationDetails,
    loading: locLoading,
    error: locError,
    gpsAccuracy,
    isGPSLocked,
    refreshLocation,
    setManualLocation,
  } = useLocation();

  const [showCityPicker, setShowCityPicker] = useState(false);

  // Hospital List Data
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Automatically fetch hospitals whenever coordinates, category, sorting or radius change
  useEffect(() => {
    fetchNearbyHospitals(coords);
  }, [selectedCategory, sortBy, selectedRadius, coords?.latitude, coords?.longitude]);

  const fetchNearbyHospitals = async (explicitCoords = null) => {
    try {
      setLoading(true);
      const activeCoords = explicitCoords || coords;

      const apiParams = {
        sortBy,
        radiusKm: selectedRadius,
      };

      if (searchQuery.trim()) {
        apiParams.search = searchQuery.trim();
      }

      if (selectedCategory && selectedCategory !== 'All Hospitals') {
        apiParams.category = selectedCategory;
      }

      let res = null;
      if (activeCoords?.latitude && activeCoords?.longitude) {
        apiParams.latitude = activeCoords.latitude;
        apiParams.longitude = activeCoords.longitude;
        res = await getNearbyHospitals(apiParams);
      } else {
        if (locationDetails?.city) {
          apiParams.city = locationDetails.city;
        } else if (user?.location?.city) {
          apiParams.city = user.location.city;
        }
        res = await getHospitals(apiParams);
      }

      if (res && res.data) {
        setHospitals(res.data);
      }
    } catch (err) {
      console.warn('Failed to load nearby hospitals:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await refreshLocation(true);
      if (res?.coords) {
        await fetchNearbyHospitals(res.coords);
      } else {
        await fetchNearbyHospitals();
      }
    } catch (e) {
      await fetchNearbyHospitals();
    }
  };

  const handleSelectManualCity = async (selectedOption) => {
    const cityName = typeof selectedOption === 'string' ? selectedOption : selectedOption.name;
    setShowCityPicker(false);

    try {
      await setManualLocation(cityName);
    } catch (e) {
      console.warn('Manual city selection notice:', e.message);
    }
  };
    } catch (e) {}

    // Fallback search by city text
    getHospitals({
      city: cityName,
      category: selectedCategory !== 'All Hospitals' ? selectedCategory : undefined,
    })
      .then((res) => {
        if (res?.data) setHospitals(res.data);
      })
      .catch((e) => console.warn(e));
  };

  const handleHospitalAction = (hospitalId, action = 'view') => {
    if (action === 'save' && !isAuthenticated) {
      router.push({
        pathname: '/(auth)/login',
        params: { message: 'Please sign in to save this hospital to your favorites.' },
      });
      return;
    }
    router.push({
      pathname: '/hospital-details',
      params: { id: hospitalId },
    });
  };

  return (
    <View style={[styles.mainScreen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      <AroviaHeader activeNav="Nearby Hospitals" />

      {/* ── 1. REAL-TIME LOCATION & ACCURACY BANNER ──────────────────── */}
      <View
        style={[
          styles.locationBanner,
          {
            backgroundColor: isDark ? '#1E293B' : '#EFF6FF',
            borderBottomColor: colors.cardBorder,
          },
        ]}
      >
        <View style={styles.locationBannerLeft}>
          <View style={[styles.pinIconWrap, { backgroundColor: isDark ? '#0B132B' : '#DBEAFE' }]}>
            <Ionicons name="location" size={17} color={Palette.primaryBlue} />
          </View>
          <View style={styles.locationTextWrap}>
            <View style={styles.statusLabelRow}>
              <Text style={styles.locStatusLabel}>
                {isGPSLocked ? 'LIVE GPS ACTIVE • GUJARAT' : 'LOCATION • GUJARAT'}
              </Text>
              {gpsAccuracy !== null && (
                <View
                  style={[
                    styles.accuracyBadge,
                    {
                      backgroundColor:
                        gpsAccuracy <= 100
                          ? '#DCFCE7'
                          : gpsAccuracy <= 500
                          ? '#FEF3C7'
                          : '#FEE2E2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.accuracyBadgeText,
                      {
                        color:
                          gpsAccuracy <= 100
                            ? '#15803D'
                            : gpsAccuracy <= 500
                            ? '#B45309'
                            : '#B91C1C',
                      },
                    ]}
                  >
                    ±{gpsAccuracy}m
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.locAddress, { color: colors.text }]} numberOfLines={1}>
              {locLoading
                ? 'Locking high-accuracy GPS coordinates...'
                : (locationDetails?.displayName || locationDetails?.city || 'Select Gujarat Location')}
            </Text>
          </View>
        </View>

        <View style={styles.locationBannerActions}>
          <TouchableOpacity
            style={styles.changeCityBtn}
            onPress={() => setShowCityPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.changeCityText}>Browse</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshGpsBtn}
            onPress={onRefresh}
            hitSlop={6}
            activeOpacity={0.8}
            disabled={locLoading}
          >
            {locLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="refresh" size={14} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. SEARCH & CONTROLS ─────────────────────────────────────── */}
      <View
        style={[
          styles.searchFilterBox,
          {
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            borderBottomColor: colors.cardBorder,
          },
        ]}
      >
        <View style={[styles.searchField, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search hospital name, city, specialty..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchNearbyHospitals()}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchNearbyHospitals(); }}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Sort & Map View Shortcut */}
        <View style={styles.sortRow}>
          <View style={styles.sortOptionsWrap}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.sortPill,
                  sortBy === opt.value && { backgroundColor: Palette.primaryBlue },
                ]}
                onPress={() => setSortBy(opt.value)}
              >
                <Text
                  style={[
                    styles.sortPillText,
                    { color: sortBy === opt.value ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.mapViewShortcutBtn}
            onPress={() => router.push('/live-map')}
            activeOpacity={0.8}
          >
            <Ionicons name="map-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.mapViewShortcutText}>Map View</Text>
          </TouchableOpacity>
        </View>

        {/* ── 3. DISTANCE RADIUS FILTER PILLS ───────────────────────── */}
        <View style={styles.radiusSection}>
          <Text style={[styles.radiusLabel, { color: colors.textSecondary }]}>
            Distance Radius:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radiusScroll}>
            {DISTANCE_FILTERS.map((rf) => {
              const isSelected = selectedRadius === rf.value;
              return (
                <TouchableOpacity
                  key={rf.value}
                  style={[
                    styles.radiusChip,
                    {
                      backgroundColor: isSelected
                        ? Palette.primaryBlue
                        : isDark
                        ? '#1E293B'
                        : '#F1F5F9',
                      borderColor: isSelected ? Palette.primaryBlue : colors.cardBorder,
                    },
                  ]}
                  onPress={() => setSelectedRadius(rf.value)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      { color: isSelected ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {rf.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Horizontal Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {FACILITY_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? '#1E3A5F'
                        : '#EFF6FF'
                      : isDark
                      ? '#1E293B'
                      : '#F8FAFC',
                    borderColor: isSelected ? Palette.primaryBlue : colors.cardBorder,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.catChipText,
                    { color: isSelected ? Palette.primaryBlue : colors.text },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── 4. HOSPITALS LIST / DISCOVERY RESULTS ────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Palette.primaryBlue}
            colors={[Palette.primaryBlue]}
          />
        }
      >
        <View style={styles.resultsHeaderRow}>
          <Text style={[styles.resultsCountText, { color: colors.text }]}>
            Found <Text style={{ color: Palette.primaryBlue, fontWeight: '800' }}>{hospitals.length}</Text> Healthcare Facilities
          </Text>
          <Text style={[styles.radiusInfoText, { color: colors.textSecondary }]}>
            Within {selectedRadius} km of current location
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Palette.primaryBlue} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Discovering real nearby hospitals and calculating distances...
            </Text>
          </View>
        ) : hospitals.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Ionicons name="medkit-outline" size={44} color="#94A3B8" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Hospitals Found in this Radius
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              No healthcare facilities were found within {selectedRadius} km of {locationDetails?.displayName || locationDetails?.city || 'your area'}. Try expanding your search radius to 50 km or 100 km.
            </Text>
            <TouchableOpacity
              style={styles.expandRadiusBtn}
              onPress={() => setSelectedRadius(50)}
              activeOpacity={0.8}
            >
              <Text style={styles.expandRadiusBtnText}>Expand Search to 50 km</Text>
            </TouchableOpacity>
          </View>
        ) : (
          hospitals.map((item) => (
            <View
              key={item._id}
              style={[
                styles.hospitalCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              {/* Card Image Banner */}
              <View style={styles.imageWrap}>
                {item.image || (item.images && item.images[0]) ? (
                  <Image
                    source={{ uri: item.image || item.images[0] }}
                    style={styles.cardImage}
                  />
                ) : (
                  <View style={styles.cardPlaceholder}>
                    <Ionicons name="business-outline" size={36} color="#94A3B8" />
                  </View>
                )}

                {/* Facility Category & Verified Badges */}
                <View style={styles.imageBadges}>
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText}>{item.type || 'Hospital'}</Text>
                  </View>
                  {item.isVerified ? (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
                      <Text style={styles.verifiedBadgeText}>Verified</Text>
                    </View>
                  ) : null}
                </View>

                {/* Real GPS Calculated Distance Badge */}
                {item.distanceFormatted ? (
                  <View style={styles.distanceBadge}>
                    <Ionicons name="navigate" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
                    <Text style={styles.distanceBadgeText}>{item.distanceFormatted}</Text>
                  </View>
                ) : null}

                {/* Favorite Heart Button */}
                <TouchableOpacity
                  style={styles.favBtn}
                  onPress={() => handleHospitalAction(item._id, 'save')}
                  hitSlop={6}
                  activeOpacity={0.8}
                >
                  <Ionicons name="heart-outline" size={16} color="#E11D48" />
                </TouchableOpacity>
              </View>

              {/* Card Body */}
              <View style={styles.cardBody}>
                <View style={styles.titleRatingRow}>
                  <Text style={[styles.hospitalTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.ratingBox}>
                    <Text style={styles.starIcon}>★</Text>
                    <Text style={styles.ratingVal}>{item.rating || '4.6'}</Text>
                    {item.reviewsCount ? (
                      <Text style={styles.reviewsCount}>({item.reviewsCount})</Text>
                    ) : null}
                  </View>
                </View>

                {/* Address */}
                <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.address || `${item.area ? `${item.area}, ` : ''}${item.city}, Gujarat`}
                </Text>

                {/* Specialties tags */}
                {item.specialties && item.specialties.length > 0 && (
                  <View style={styles.specTagsRow}>
                    {item.specialties.slice(0, 3).map((spec, i) => (
                      <View key={i} style={styles.specTag}>
                        <Text style={styles.specTagText}>{spec}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Emergency status pill */}
                {item.is24x7Emergency && (
                  <View style={styles.emergencyAvailabilityPill}>
                    <Ionicons name="flash" size={12} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text style={styles.emergencyAvailabilityText}>24x7 Emergency Trauma Unit Available</Text>
                  </View>
                )}

                {/* Action Buttons: View Details, Directions, Call */}
                <View style={styles.buttonRow}>
                  {item.isPhoneVerified && isValidHospitalPhone(item.contactNumber || item.phone) ? (
                    <TouchableOpacity
                      style={[styles.callBtn, { borderColor: '#10B981' }]}
                      onPress={() => {
                        const dialerNum = cleanDialerPhone(item.contactNumber || item.phone);
                        if (dialerNum) {
                          Linking.openURL(`tel:${dialerNum}`);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={13} color="#10B981" style={{ marginRight: 4 }} />
                      <Text style={[styles.callBtnText, { color: '#10B981' }]}>Call</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.callBtnDisabled, { borderColor: colors.cardBorder }]}>
                      <Ionicons name="call-outline" size={12} color="#94A3B8" style={{ marginRight: 3 }} />
                      <Text style={styles.callBtnDisabledText}>Unavailable</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.directionsBtn, { borderColor: Palette.primaryBlue }]}
                    onPress={() => {
                      if (item.directionsUrl) {
                        Linking.openURL(item.directionsUrl);
                      } else {
                        const q = encodeURIComponent(`${item.name} ${item.city}`);
                        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="navigate" size={13} color={Palette.primaryBlue} style={{ marginRight: 4 }} />
                    <Text style={[styles.directionsBtnText, { color: Palette.primaryBlue }]}>Directions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.detailsBtn, { backgroundColor: Palette.primaryBlue }]}
                    onPress={() => handleHospitalAction(item._id, 'view')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.detailsBtnText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Manual City Selector Modal (All Gujarat Districts & Cities) */}
      <LocationSelectorModal
        visible={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        title="Select Gujarat City / Town"
        data={ALL_GUJARAT_CITIES}
        selectedItem={locationDetails?.displayName || locationDetails?.city || ''}
        onSelect={handleSelectManualCity}
        placeholder="Search cities across Gujarat (Dwarka, Jamnagar, Surat, Rajkot...)"
      />

      <AroviaBottomNav activeTab="Nearby Hospitals" />
    </View>
  );
}

const styles = StyleSheet.create({
  mainScreen: {
    flex: 1,
  },
  locationBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  locationBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 8,
  },
  pinIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextWrap: {
    flex: 1,
  },
  statusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locStatusLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.primaryBlue,
    letterSpacing: 0.3,
  },
  accuracyBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  accuracyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  locAddress: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  locationBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changeCityBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: Palette.primaryBlue,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  changeCityText: {
    color: Palette.primaryBlue,
    fontSize: 11,
    fontWeight: '700',
  },
  refreshGpsBtn: {
    backgroundColor: Palette.primaryBlue,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchFilterBox: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sortOptionsWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  sortPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mapViewShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mapViewShortcutText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  radiusSection: {
    marginTop: 8,
  },
  radiusLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  radiusScroll: {
    gap: 6,
  },
  radiusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  radiusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryScroll: {
    gap: 6,
    paddingTop: 8,
    paddingBottom: 2,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 24,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultsCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  radiusInfoText: {
    fontSize: 11,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  expandRadiusBtn: {
    backgroundColor: Palette.primaryBlue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  expandRadiusBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  hospitalCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    ...Shadows.card,
  },
  imageWrap: {
    height: 140,
    width: '100%',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  imageBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  catBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  catBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  distanceBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: Palette.primaryBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  favBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.soft,
  },
  cardBody: {
    padding: 14,
  },
  titleRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hospitalTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  starIcon: {
    color: '#D97706',
    fontSize: 11,
  },
  ratingVal: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800',
  },
  reviewsCount: {
    color: '#92400E',
    fontSize: 10,
  },
  addressText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  specTagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  specTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  specTagText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  emergencyAvailabilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  emergencyAvailabilityText: {
    color: '#991B1B',
    fontSize: 10,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  callBtn: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  callBtnDisabled: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
  callBtnDisabledText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  directionsBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionsBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
