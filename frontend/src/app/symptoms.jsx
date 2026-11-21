import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import { Palette, Shadows } from '../constants/theme';
import AroviaHeader from '../components/AroviaHeader';
import AroviaBottomNav from '../components/AroviaBottomNav';
import LocationSelectorModal from '../components/LocationSelectorModal';
import gujaratData from '../constants/gujaratLocations.json';
import { analyzeSymptoms, reverseGeocodeBackend } from '../services/medicalService';
import {
  SUPPORTED_SYMPTOMS_CATALOG,
  isImmediateEmergency,
  deriveRelevantSpecialties,
} from '../services/symptomSpecialtyMapper';
import { fetchHospitalRecommendations } from '../services/recommendationService';
import { isValidHospitalPhone, cleanDialerPhone } from '../utils/phoneValidator';
import { useTranslation } from 'react-i18next';

const RADIUS_OPTIONS = [
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
  { label: '100 km', value: 100 },
];

export default function SymptomCheckerScreen() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const scrollRef = useRef(null);

  // Protect screen from unauthenticated access
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace({
        pathname: '/(auth)/login',
        params: {
          redirect: '/symptoms',
          message: 'Please sign in to access the AI Symptom Navigator.',
        },
      });
    }
  }, [isAuthenticated, authLoading]);

  // Symptom Selection States
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [customSymptom, setCustomSymptom] = useState('');

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

  const [userCoords, setUserCoords] = useState(globalCoords || null);
  const [detectedCity, setDetectedCity] = useState(locationDetails?.displayName || locationDetails?.city || 'Gujarat');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSource, setLocationSource] = useState('gps'); // 'gps' | 'profile' | 'manual'

  // Evaluation & Recommendation States
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(15);
  const [sortBy, setSortBy] = useState('distance'); // 'distance' | 'rating'
  const [error, setError] = useState('');

  // Sync with global location when coords update
  useEffect(() => {
    if (globalCoords?.latitude && globalCoords?.longitude) {
      setUserCoords(globalCoords);
      setDetectedCity(locationDetails?.displayName || locationDetails?.city || 'Gujarat');
      setLocationSource('gps');
    }
  }, [globalCoords?.latitude, globalCoords?.longitude, locationDetails?.displayName]);

  const initUserLocation = async () => {
    try {
      const res = await refreshLocation(false);
      if (res?.coords) {
        setUserCoords(res.coords);
        setDetectedCity(res.details?.displayName || res.details?.city || 'Gujarat');
        setLocationSource('gps');
      }
    } catch (e) {}
  };

  const handleRefreshLocation = async () => {
    try {
      const res = await refreshLocation(true);
      if (res?.coords) {
        setUserCoords(res.coords);
        setDetectedCity(res.details?.displayName || res.details?.city || 'Gujarat');
        setLocationSource('gps');
        if (analysisResult) {
          loadHospitalRecommendations(selectedRadius, sortBy, res.coords);
        }
      }
    } catch (e) {}
  };

  const handleSelectManualCity = (selected) => {
    setShowLocationModal(false);
    if (!selected) return;
    const cityObj = selected.city;
    if (cityObj?.latitude && cityObj?.longitude) {
      const newCoords = { latitude: cityObj.latitude, longitude: cityObj.longitude };
      setUserCoords(newCoords);
      setDetectedCity(cityObj.name);
      setLocationSource('manual');
      setGpsAccuracy(null);
      if (analysisResult) {
        loadHospitalRecommendations(selectedRadius, sortBy, newCoords);
      }
    }
  };

  const toggleSymptom = (sym) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms((prev) => prev.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms((prev) => [...prev, sym]);
    }
  };

  const addCustomSymptom = () => {
    const trimmed = customSymptom.trim();
    if (trimmed && !selectedSymptoms.includes(trimmed)) {
      setSelectedSymptoms((prev) => [...prev, trimmed]);
      setCustomSymptom('');
    }
  };

  // ── Analyze Clinical Urgency & Automatically Fetch Nearby Hospitals ──
  const handleAnalyze = async () => {
    if (selectedSymptoms.length === 0) {
      setError('Please select or type at least one symptom.');
      return;
    }

    setError('');
    setAnalyzing(true);
    setAnalysisResult(null);
    setRecommendations(null);

    try {
      // 1. Analyze symptoms through clinical triage engine
      const res = await analyzeSymptoms(selectedSymptoms);
      if (res?.success && res?.data) {
        const evalData = res.data;
        setAnalysisResult(evalData);

        // 2. Derive relevant medical departments
        const specialties = evalData.relevantSpecialties && evalData.relevantSpecialties.length > 0
          ? evalData.relevantSpecialties
          : deriveRelevantSpecialties(selectedSymptoms);

        // 3. Automatically fetch nearby hospitals offering these departments
        await loadHospitalRecommendations(selectedRadius, sortBy, userCoords, specialties);

        // Smooth scroll to results
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: 350, animated: true });
        }, 300);
      } else {
        setError('Could not evaluate symptoms. Please try again.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to connect to clinical triage server.');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadHospitalRecommendations = async (
    radius = selectedRadius,
    sort = sortBy,
    coords = userCoords,
    specialtiesList = null
  ) => {
    const activeCoords = coords || userCoords || { latitude: 22.2442, longitude: 68.9685 };
    const specs = specialtiesList ||
      (analysisResult?.relevantSpecialties?.length ? analysisResult.relevantSpecialties : deriveRelevantSpecialties(selectedSymptoms));

    setRecLoading(true);
    try {
      const recData = await fetchHospitalRecommendations({
        latitude: activeCoords.latitude,
        longitude: activeCoords.longitude,
        specialties: specs,
        radiusKm: radius,
        sortBy: sort,
      });

      if (recData?.success) {
        setRecommendations(recData);
      }
    } catch (e) {
      console.warn('Error fetching recommendations:', e);
    } finally {
      setRecLoading(false);
    }
  };

  const handleRadiusChange = (radius) => {
    setSelectedRadius(radius);
    if (analysisResult) {
      loadHospitalRecommendations(radius, sortBy);
    }
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    if (analysisResult) {
      loadHospitalRecommendations(selectedRadius, newSort);
    }
  };

  const hasImmediateEmergency = isImmediateEmergency(selectedSymptoms);
  const isEmergencyEvaluation = analysisResult?.isEmergency || analysisResult?.urgencyLevel === 'Emergency';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AroviaHeader activeNav="Symptoms" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Real-Time Immediate Emergency Alert (Always Visible for Critical Symptoms) ── */}
        {(hasImmediateEmergency || isEmergencyEvaluation) && (
          <View style={styles.emergencyBannerWrap}>
            <View style={styles.emergencyTopRow}>
              <Ionicons name="warning" size={24} color="#FFFFFF" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.emergencyBannerTitle}>
                  POTENTIAL MEDICAL EMERGENCY — DO NOT DELAY
                </Text>
                <Text style={styles.emergencyBannerSub}>
                  Severe chest discomfort, breathing trouble, or acute neurological signs require immediate clinical intervention.
                </Text>
              </View>
            </View>

            <View style={styles.emergencyActionsRow}>
              <TouchableOpacity
                style={styles.call108Btn}
                onPress={() => Linking.openURL('tel:108')}
                activeOpacity={0.85}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
                <Text style={styles.callBtnText}>Call 108 (Ambulance)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.call112Btn}
                onPress={() => Linking.openURL('tel:112')}
                activeOpacity={0.85}
              >
                <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.callBtnText}>Call 112 (Emergency)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Location Context Bar ── */}
        <View style={[styles.locationBar, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: colors.cardBorder }]}>
          <View style={styles.locLeft}>
            <Ionicons
              name={locationSource === 'gps' ? 'navigate-circle' : 'location-sharp'}
              size={18}
              color={locationSource === 'gps' ? '#10B981' : Palette.primaryBlue}
            />
            <View style={{ marginLeft: 6 }}>
              <Text style={[styles.locCity, { color: colors.text }]} numberOfLines={1}>
                {detectedCity}, Gujarat
              </Text>
              <Text style={styles.locSub}>
                {locLoading
                  ? 'Detecting GPS coordinates...'
                  : locationSource === 'gps'
                  ? `Live Satellite GPS${gpsAccuracy ? ` (±${gpsAccuracy}m)` : ''}`
                  : 'Selected City Area'}
              </Text>
            </View>
          </View>

          <View style={styles.locRight}>
            <TouchableOpacity
              style={[styles.cityChangeBtn, { borderColor: colors.cardBorder }]}
              onPress={() => setShowLocationModal(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.cityChangeBtnText, { color: Palette.primaryBlue }]}>Change City</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.recenterBtn}
              onPress={handleRefreshLocation}
              disabled={locLoading}
              activeOpacity={0.8}
            >
              {locLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="locate" size={15} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Header Title */}
        <View style={styles.titleWrap}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>Smart Symptom Analysis</Text>
          <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
            Select your health symptoms to receive clinical urgency triaging and automatically discover relevant nearby hospitals offering the right department.
          </Text>
        </View>

        {/* Medical Disclaimer Banner */}
        <View style={styles.disclaimerPill}>
          <Ionicons name="shield-checkmark" size={16} color="#D97706" style={{ marginRight: 6 }} />
          <Text style={styles.disclaimerText}>
            Medical Notice: Symptom analysis is informational triage guidance, not a diagnosis. Always consult a licensed physician.
          </Text>
        </View>

        {/* ── Selected Symptoms Section ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Selected Symptoms ({selectedSymptoms.length})
            </Text>
            {selectedSymptoms.length > 0 && (
              <TouchableOpacity onPress={() => setSelectedSymptoms([])}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedSymptoms.length > 0 ? (
            <View style={styles.chipsRow}>
              {selectedSymptoms.map((sym) => (
                <TouchableOpacity
                  key={sym}
                  style={styles.selectedChip}
                  onPress={() => toggleSymptom(sym)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectedChipText}>{sym}</Text>
                  <Text style={styles.removeChipText}>✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={[styles.noSymptomsText, { color: colors.textSecondary }]}>
              No symptoms selected yet. Tap from the common symptoms catalog below or type your custom symptom.
            </Text>
          )}

          {/* Custom Symptom Input */}
          <View style={[styles.inputRow, { backgroundColor: isDark ? '#0B132B' : '#F1F5F9', borderColor: colors.cardBorder }]}>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Type other symptom (e.g. ear pain, blurred vision)..."
              placeholderTextColor={colors.textSecondary}
              value={customSymptom}
              onChangeText={setCustomSymptom}
              onSubmitEditing={addCustomSymptom}
            />
            <TouchableOpacity style={styles.addBtn} onPress={addCustomSymptom} activeOpacity={0.8}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Supported Symptoms Catalog ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Common Health Symptoms</Text>
          <Text style={[styles.catalogSub, { color: colors.textSecondary }]}>
            Tap symptoms you are currently experiencing:
          </Text>
          <View style={styles.symptomsGrid}>
            {SUPPORTED_SYMPTOMS_CATALOG.map((item) => {
              const selected = selectedSymptoms.includes(item.label);
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.symptomGridChip,
                    {
                      backgroundColor: selected ? Palette.primaryBlue : (isDark ? '#0B132B' : '#F8FAFC'),
                      borderColor: selected ? Palette.primaryBlue : colors.cardBorder,
                    },
                  ]}
                  onPress={() => toggleSymptom(item.label)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.symptomGridIcon}>{item.icon}</Text>
                  <Text style={[styles.symptomGridText, { color: selected ? '#FFFFFF' : colors.text }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Error Notice */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Analyze Clinical Urgency Button ── */}
        <TouchableOpacity
          style={[styles.analyzeBtn, (analyzing || selectedSymptoms.length === 0) && styles.analyzeBtnDisabled]}
          onPress={handleAnalyze}
          disabled={analyzing || selectedSymptoms.length === 0}
          activeOpacity={0.85}
        >
          {analyzing ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.analyzeBtnText}>Analyzing Symptoms & Locating Hospitals...</Text>
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <Ionicons name="pulse" size={18} color="#FFFFFF" />
              <Text style={styles.analyzeBtnText}>Analyze Clinical Urgency & Find Hospitals</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════════════
            PART A: CLINICAL EVALUATION RESULTS
        ═══════════════════════════════════════════════════════════════ */}
        {analysisResult && (
          <View style={[styles.resultsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.resultsHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.resultsTitle, { color: colors.text }]}>Clinical Evaluation</Text>
                <Text style={[styles.resultsSub, { color: colors.textSecondary }]}>
                  Triaged based on {analysisResult.analyzedSymptoms?.length} reported symptom(s)
                </Text>
              </View>
              <View
                style={[
                  styles.urgencyBadge,
                  isEmergencyEvaluation
                    ? styles.urgencyEmergency
                    : analysisResult.urgencyLevel === 'Urgent Care'
                    ? styles.urgencyUrgent
                    : styles.urgencyStandard,
                ]}
              >
                <Text
                  style={[
                    styles.urgencyBadgeText,
                    {
                      color: isEmergencyEvaluation
                        ? '#DC2626'
                        : analysisResult.urgencyLevel === 'Urgent Care'
                        ? '#D97706'
                        : '#059669',
                    },
                  ]}
                >
                  {analysisResult.urgencyLevel?.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Relevant Medical Departments (Specialties) */}
            <View style={styles.specialtiesBlock}>
              <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
                🏥 Relevant Medical Department(s):
              </Text>
              <View style={styles.deptBadgeRow}>
                {analysisResult.relevantSpecialties?.map((dept, idx) => (
                  <View key={idx} style={styles.deptBadge}>
                    <Ionicons name="medical" size={12} color="#0284C7" />
                    <Text style={styles.deptBadgeText}>{dept}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Possible Explanations / Conditions */}
            <Text style={[styles.sectionSubtitle, { color: colors.text, marginBottom: 8 }]}>
              📋 Possible Clinical Explanations:
            </Text>
            {analysisResult.possibleConditions?.map((cond, idx) => (
              <View key={idx} style={[styles.conditionBlock, { backgroundColor: isDark ? '#0B132B' : '#F8FAFC', borderColor: colors.cardBorder }]}>
                <View style={styles.condHeaderRow}>
                  <Text style={[styles.condName, { color: colors.text }]}>{cond.name}</Text>
                  <View style={styles.probPill}>
                    <Text style={styles.probText}>{cond.probability}</Text>
                  </View>
                </View>

                <Text style={[styles.condExplanation, { color: colors.textSecondary }]}>
                  {cond.explanation}
                </Text>

                <View style={styles.specialistRow}>
                  <Text style={styles.specialistLabel}>Specialist: </Text>
                  <Text style={styles.specialistValue}>{cond.recommendedSpecialist}</Text>
                </View>

                {cond.nextSteps && cond.nextSteps.length > 0 && (
                  <View style={styles.stepsWrap}>
                    <Text style={styles.nextStepsLabel}>Recommended Next Steps:</Text>
                    {cond.nextSteps.map((step, sIdx) => (
                      <View key={sIdx} style={styles.stepItemRow}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginTop: 2 }} />
                        <Text style={[styles.stepItemText, { color: colors.text }]}>{step}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            <Text style={styles.disclaimerBottom}>
              ⚕️ {analysisResult.medicalDisclaimer || 'Arovia informational triage guidance only.'}
            </Text>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            PART B: RECOMMENDED HOSPITALS NEAR YOU (CONFIRMED SPECIALTY)
        ═══════════════════════════════════════════════════════════════ */}
        {analysisResult && (
          <View style={[styles.hospSectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.hospSectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.hospSectionTitle, { color: colors.text }]}>
                  Recommended Hospitals Near You
                </Text>
                <Text style={[styles.hospSectionSub, { color: colors.textSecondary }]}>
                  Facilities near {detectedCity} offering{' '}
                  <Text style={{ fontWeight: '700', color: Palette.primaryBlue }}>
                    {analysisResult.relevantSpecialties?.join(', ') || 'Relevant Departments'}
                  </Text>
                </Text>
              </View>
            </View>

            {/* Filter and Radius Controls */}
            <View style={styles.hospControlsRow}>
              {/* Radius Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radiusPillsRow}>
                <Text style={[styles.radiusPrefix, { color: colors.textSecondary }]}>Radius:</Text>
                {RADIUS_OPTIONS.map((opt) => {
                  const active = selectedRadius === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.radiusPill,
                        {
                          backgroundColor: active ? Palette.primaryBlue : (isDark ? '#334155' : '#F1F5F9'),
                          borderColor: active ? Palette.primaryBlue : colors.cardBorder,
                        },
                      ]}
                      onPress={() => handleRadiusChange(opt.value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.radiusPillText,
                          { color: active ? '#FFFFFF' : colors.text, fontWeight: active ? '700' : '500' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Sort Toggle */}
              <View style={styles.sortToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.sortPill,
                    sortBy === 'distance' && styles.sortPillActive,
                  ]}
                  onPress={() => handleSortChange('distance')}
                >
                  <Text style={[styles.sortPillText, sortBy === 'distance' && styles.sortPillTextActive]}>
                    Nearest First
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sortPill,
                    sortBy === 'rating' && styles.sortPillActive,
                  ]}
                  onPress={() => handleSortChange('rating')}
                >
                  <Text style={[styles.sortPillText, sortBy === 'rating' && styles.sortPillTextActive]}>
                    Highest Rated
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Radius Auto-Expansion Banner (if applicable) */}
            {recommendations?.expanded && (
              <View style={styles.expandedBanner}>
                <Ionicons name="information-circle" size={16} color="#0284C7" />
                <Text style={styles.expandedBannerText}>
                  {recommendations.expandedNote || `Search radius expanded to ${recommendations.radiusKm} km to locate available healthcare centers.`}
                </Text>
              </View>
            )}

            {/* Hospital Recommendations List */}
            {recLoading ? (
              <View style={styles.hospLoadingBox}>
                <ActivityIndicator size="small" color={Palette.primaryBlue} />
                <Text style={[styles.hospLoadingText, { color: colors.textSecondary }]}>
                  Locating verified hospitals near {detectedCity}...
                </Text>
              </View>
            ) : recommendations?.specialtyMatches && recommendations.specialtyMatches.length > 0 ? (
              <View style={styles.hospList}>
                {recommendations.specialtyMatches.map((hosp, idx) => (
                  <View
                    key={hosp._id || idx}
                    style={[
                      styles.hospitalCard,
                      { backgroundColor: isDark ? '#0B132B' : '#FFFFFF', borderColor: colors.cardBorder },
                    ]}
                  >
                    {/* Hospital Image & Badges */}
                    <View style={styles.cardTopImageRow}>
                      <Image
                        source={{ uri: hosp.image || 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80' }}
                        style={styles.hospitalCardImage}
                      />
                      <View style={styles.imageOverlayBadges}>
                        {hosp.distanceFormatted && (
                          <View style={styles.distanceBadge}>
                            <Text style={styles.distanceBadgeText}>📍 {hosp.distanceFormatted}</Text>
                          </View>
                        )}
                        {hosp.isVerified && (
                          <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Hospital Body Info */}
                    <View style={styles.cardBody}>
                      <View style={styles.titleAndRatingRow}>
                        <Text style={[styles.hospCardName, { color: colors.text }]} numberOfLines={1}>
                          {hosp.name}
                        </Text>
                        <View style={styles.ratingBox}>
                          <Ionicons name="star" size={12} color="#D97706" />
                          <Text style={styles.ratingVal}>{hosp.rating || '4.6'}</Text>
                        </View>
                      </View>

                      <Text style={[styles.hospAddress, { color: colors.textSecondary }]} numberOfLines={2}>
                        {hosp.address || `${hosp.area ? `${hosp.area}, ` : ''}${hosp.city}`}
                      </Text>

                      {/* Confirmed Matching Department Tag */}
                      <View style={styles.matchedSpecPill}>
                        <Ionicons name="checkmark-done-circle" size={13} color="#16A34A" />
                        <Text style={styles.matchedSpecText}>
                          Confirmed: {hosp.matchedSpecialty || hosp.type || 'Department Available'}
                        </Text>
                      </View>

                      {/* Action Buttons: Directions, Call, Details */}
                      <View style={styles.hospActionsRow}>
                        <TouchableOpacity
                          style={[styles.directionsBtn, { borderColor: Palette.primaryBlue }]}
                          onPress={() => {
                            const dest = hosp.location?.latitude && hosp.location?.longitude
                              ? `${hosp.location.latitude},${hosp.location.longitude}`
                              : encodeURIComponent(`${hosp.name} ${hosp.city}`);
                            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="navigate" size={14} color={Palette.primaryBlue} />
                          <Text style={[styles.directionsBtnText, { color: Palette.primaryBlue }]}>
                            Directions
                          </Text>
                        </TouchableOpacity>

                        {hosp.isPhoneVerified && isValidHospitalPhone(hosp.phone || hosp.contactNumber) ? (
                          <TouchableOpacity
                            style={[styles.callHospBtn, { borderColor: '#10B981' }]}
                            onPress={() => {
                              const cleaned = cleanDialerPhone(hosp.phone || hosp.contactNumber);
                              if (cleaned) Linking.openURL(`tel:${cleaned}`);
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="call" size={14} color="#10B981" />
                            <Text style={styles.callHospBtnText}>Call</Text>
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          style={[styles.detailsBtn, { backgroundColor: Palette.primaryBlue }]}
                          onPress={() =>
                            router.push({
                              pathname: '/hospital-details',
                              params: { id: hosp._id },
                            })
                          }
                          activeOpacity={0.8}
                        >
                          <Text style={styles.detailsBtnText}>View Details →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noMatchBox}>
                <Ionicons name="search" size={24} color="#94A3B8" />
                <Text style={[styles.noMatchTitle, { color: colors.text }]}>
                  No confirmed specialty matches in {selectedRadius} km
                </Text>
                <Text style={[styles.noMatchSub, { color: colors.textSecondary }]}>
                  You can increase the search radius above or check the additional general & government hospitals below.
                </Text>
              </View>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                PART C: ADDITIONAL NEARBY HOSPITALS (DEPARTMENT UNCONFIRMED)
            ═══════════════════════════════════════════════════════════════ */}
            {recommendations?.additionalNearby && recommendations.additionalNearby.length > 0 && (
              <View style={styles.additionalSectionWrap}>
                <View style={styles.divider} />
                <View style={styles.additionalHeaderRow}>
                  <Ionicons name="business" size={16} color="#64748B" />
                  <Text style={[styles.additionalSectionTitle, { color: colors.text }]}>
                    Other Nearby Healthcare Facilities ({recommendations.additionalNearby.length})
                  </Text>
                </View>
                <Text style={[styles.additionalSectionNote, { color: colors.textSecondary }]}>
                  These general, multispecialty, or government facilities are nearby, but specific department availability should be confirmed by telephone:
                </Text>

                <View style={styles.additionalGrid}>
                  {recommendations.additionalNearby.slice(0, 4).map((hosp, idx) => (
                    <View
                      key={hosp._id || idx}
                      style={[
                        styles.additionalMiniCard,
                        { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.cardBorder },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.addlHospName, { color: colors.text }]} numberOfLines={1}>
                          {hosp.name}
                        </Text>
                        <Text style={[styles.addlHospDist, { color: colors.textSecondary }]}>
                          📍 {hosp.distanceFormatted || `${hosp.city}`} • {hosp.type || 'General'}
                        </Text>
                      </View>

                      <View style={styles.addlActions}>
                        <TouchableOpacity
                          style={styles.addlDirectionsBtn}
                          onPress={() => {
                            const dest = hosp.location?.latitude && hosp.location?.longitude
                              ? `${hosp.location.latitude},${hosp.location.longitude}`
                              : encodeURIComponent(`${hosp.name} ${hosp.city}`);
                            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
                          }}
                        >
                          <Ionicons name="navigate" size={13} color={Palette.primaryBlue} />
                        </TouchableOpacity>

                        {hosp.isPhoneVerified && isValidHospitalPhone(hosp.phone || hosp.contactNumber) ? (
                          <TouchableOpacity
                            style={styles.addlCallBtn}
                            onPress={() => {
                              const cleaned = cleanDialerPhone(hosp.phone || hosp.contactNumber);
                              if (cleaned) Linking.openURL(`tel:${cleaned}`);
                            }}
                          >
                            <Ionicons name="call" size={13} color="#10B981" />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Quick Navigation Footer Actions */}
                <View style={styles.quickNavFooterRow}>
                  <TouchableOpacity
                    style={[styles.quickNavBtn, { borderColor: Palette.primaryBlue }]}
                    onPress={() => router.push('/live-map')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="map" size={14} color={Palette.primaryBlue} />
                    <Text style={[styles.quickNavBtnText, { color: Palette.primaryBlue }]}>
                      Open on Map
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickNavBtn, { borderColor: Palette.primaryBlue }]}
                    onPress={() =>
                      router.push({
                        pathname: '/hospitals',
                        params: {
                          specialty: analysisResult.relevantSpecialties?.[0] || 'All',
                        },
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons name="list" size={14} color={Palette.primaryBlue} />
                    <Text style={[styles.quickNavBtnText, { color: Palette.primaryBlue }]}>
                      View All Directory
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickNavBtn, { borderColor: '#64748B' }]}
                    onPress={() => loadHospitalRecommendations(selectedRadius, sortBy)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={14} color="#64748B" />
                    <Text style={[styles.quickNavBtnText, { color: '#64748B' }]}>
                      Refresh
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Manual Location Selector Modal */}
      <LocationSelectorModal
        visible={showLocationModal}
        districts={gujaratData.districts || []}
        currentCity={detectedCity}
        onSelectLocation={handleSelectManualCity}
        onClose={() => setShowLocationModal(false)}
      />

      <AroviaBottomNav activeTab="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    padding: 14,
    paddingBottom: 110,
    gap: 14,
  },

  // Immediate Emergency Banner
  emergencyBannerWrap: {
    backgroundColor: '#991B1B',
    borderRadius: 14,
    padding: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  emergencyTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  emergencyBannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  emergencyBannerSub: {
    color: '#FECACA',
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  emergencyActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  call108Btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  call112Btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B91C1C',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  // Location Bar
  locationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  locLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locCity: {
    fontSize: 13,
    fontWeight: '700',
  },
  locSub: {
    fontSize: 10,
    color: '#64748B',
  },
  locRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cityChangeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
  },
  cityChangeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  recenterBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Palette.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  titleWrap: {
    marginTop: 2,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  disclaimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderRadius: 10,
    padding: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#B45309',
    lineHeight: 15,
  },

  // Cards
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  clearAllText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primaryBlue,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 6,
  },
  selectedChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  removeChipText: {
    color: '#BAE6FD',
    fontSize: 11,
    fontWeight: '800',
  },
  noSymptomsText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    height: 38,
  },
  textInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 0,
  },
  addBtn: {
    backgroundColor: Palette.primaryBlue,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Catalog
  catalogSub: {
    fontSize: 11,
    marginBottom: 8,
    marginTop: 2,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  symptomGridChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  symptomGridIcon: {
    fontSize: 13,
  },
  symptomGridText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Error Box
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 10,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  // Analyze Button
  analyzeBtn: {
    backgroundColor: Palette.primaryBlue,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  analyzeBtnDisabled: {
    opacity: 0.6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analyzeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // Results Card
  resultsCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  resultsSub: {
    fontSize: 11,
    marginTop: 2,
  },
  urgencyBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  urgencyEmergency: {
    backgroundColor: '#FEE2E2',
  },
  urgencyUrgent: {
    backgroundColor: '#FEF3C7',
  },
  urgencyStandard: {
    backgroundColor: '#D1FAE5',
  },
  urgencyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },

  // Departments
  specialtiesBlock: {
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  deptBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  deptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  deptBadgeText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '700',
  },

  // Conditions
  conditionBlock: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  condHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  condName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  probPill: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  probText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '700',
  },
  condExplanation: {
    fontSize: 11,
    lineHeight: 16,
  },
  specialistRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  specialistLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  specialistValue: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primaryBlue,
  },
  stepsWrap: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  nextStepsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 3,
  },
  stepItemText: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  disclaimerBottom: {
    fontSize: 10,
    color: '#94A3B8',
    lineHeight: 14,
    marginTop: 8,
  },

  // Hospital Recommendations Section
  hospSectionCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  hospSectionHeader: {
    marginBottom: 10,
  },
  hospSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  hospSectionSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  hospControlsRow: {
    marginBottom: 10,
    gap: 8,
  },
  radiusPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radiusPrefix: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 2,
  },
  radiusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  radiusPillText: {
    fontSize: 10,
  },
  sortToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  sortPillActive: {
    backgroundColor: Palette.primaryBlue,
  },
  sortPillText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  sortPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  expandedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 10,
  },
  expandedBannerText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
    flex: 1,
  },
  hospLoadingBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  hospLoadingText: {
    fontSize: 12,
  },
  hospList: {
    gap: 12,
  },
  hospitalCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
  },
  cardTopImageRow: {
    height: 110,
    width: '100%',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  hospitalCardImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distanceBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  distanceBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(22, 163, 74, 0.92)',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardBody: {
    padding: 10,
  },
  titleAndRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hospCardName: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    gap: 3,
  },
  ratingVal: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '700',
  },
  hospAddress: {
    fontSize: 11,
    marginTop: 2,
  },
  matchedSpecPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 8,
  },
  matchedSpecText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '700',
  },
  hospActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  directionsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderWidth: 1.5,
    borderRadius: 8,
    gap: 4,
  },
  directionsBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  callHospBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callHospBtnText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  detailsBtn: {
    flex: 1.2,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  noMatchBox: {
    alignItems: 'center',
    padding: 16,
    gap: 6,
  },
  noMatchTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  noMatchSub: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Additional Nearby Hospitals Section
  additionalSectionWrap: {
    marginTop: 6,
  },
  additionalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  additionalSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  additionalSectionNote: {
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 15,
  },
  additionalGrid: {
    gap: 6,
  },
  additionalMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addlHospName: {
    fontSize: 12,
    fontWeight: '700',
  },
  addlHospDist: {
    fontSize: 10,
    marginTop: 1,
  },
  addlActions: {
    flexDirection: 'row',
    gap: 6,
  },
  addlDirectionsBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addlCallBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickNavFooterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    gap: 4,
    backgroundColor: 'rgba(2, 132, 199, 0.05)',
  },
  quickNavBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
