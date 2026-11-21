import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { reverseGeocodeLocation } from '../utils/locationService';

export default function LocationDetector({ onLocationDetected, onOpenManualPicker }) {
  const [loading, setLoading] = useState(false);
  const [detectedSummary, setDetectedSummary] = useState(null);
  const [accuracyMeters, setAccuracyMeters] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorWarning, setErrorWarning] = useState(null);

  const handleDetectGPS = async () => {
    try {
      setLoading(true);
      setErrorWarning(null);
      setStatusMsg('Checking device GPS status...');

      const isServiceEnabled = await Location.hasServicesEnabledAsync();
      if (!isServiceEnabled) {
        setStatusMsg('Device GPS is turned off. Please enable Location in your phone settings.');
        setLoading(false);
        return;
      }

      setStatusMsg('Requesting satellite GPS permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setStatusMsg('Location permission denied. Please choose your Gujarat location manually.');
        setLoading(false);
        return;
      }

      setStatusMsg('Locking device GPS coordinates...');

      // High accuracy GPS with timeout fallback
      let loc = null;
      try {
        loc = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('GPS satellite lock timed out')), 8000)
          ),
        ]);
      } catch (timeoutErr) {
        setStatusMsg('Acquiring network GPS lock...');
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      }

      if (!loc || !loc.coords) {
        throw new Error('Unable to obtain coordinates from device GPS.');
      }

      let { latitude, longitude, accuracy } = loc.coords;
      let acc = typeof accuracy === 'number' ? Math.round(accuracy) : null;

      // If accuracy is poor, retry once
      if (acc && acc > 500) {
        try {
          const refined = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          if (refined?.coords) {
            latitude = refined.coords.latitude;
            longitude = refined.coords.longitude;
            acc = typeof refined.coords.accuracy === 'number' ? Math.round(refined.coords.accuracy) : acc;
          }
        } catch (_) {}
      }

      setAccuracyMeters(acc);

      if (acc && acc > 800) {
        setErrorWarning(`⚠️ GPS signal is weak (accuracy ±${acc}m). Results may be approximate.`);
      }

      setStatusMsg('Resolving Gujarat administrative area...');

      // Precise multi-tier reverse geocoding
      const resolved = await reverseGeocodeLocation(latitude, longitude);

      const summary = `${resolved.city}, ${resolved.district}${resolved.state ? `, ${resolved.state}` : ''}`;
      setDetectedSummary(summary);
      setStatusMsg(null);

      // Pass exact coordinates and resolved place to parent
      if (onLocationDetected) {
        onLocationDetected({
          country: resolved.country || 'India',
          state: resolved.state || 'Gujarat',
          district: resolved.district,
          city: resolved.city,
          taluka: resolved.taluka || resolved.city,
          villageArea: resolved.villageArea || '',
          postalCode: resolved.postalCode || '',
          latitude,
          longitude,
          accuracy: acc,
        });
      }
    } catch (err) {
      console.warn('GPS detection error:', err.message);
      setStatusMsg('GPS unavailable or timed out. Please select your location manually below.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.detectBtn}
          onPress={handleDetectGPS}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          ) : (
            <Text style={styles.btnIcon}>🎯</Text>
          )}
          <Text style={styles.detectBtnText}>
            {loading ? 'Detecting Accurate GPS...' : 'Use My Current GPS Location'}
          </Text>
        </TouchableOpacity>

        {onOpenManualPicker && (
          <TouchableOpacity
            style={styles.manualBtn}
            onPress={onOpenManualPicker}
            activeOpacity={0.8}
          >
            <Text style={styles.manualBtnText}>🔍 Browse Cities</Text>
          </TouchableOpacity>
        )}
      </View>

      {statusMsg && <Text style={styles.statusText}>{statusMsg}</Text>}
      {errorWarning && <Text style={styles.warningText}>{errorWarning}</Text>}

      {detectedSummary && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryLabel}>✓ Verified GPS Location</Text>
            {accuracyMeters !== null && (
              <View
                style={[
                  styles.accBadge,
                  {
                    backgroundColor:
                      accuracyMeters <= 100
                        ? '#DCFCE7'
                        : accuracyMeters <= 500
                        ? '#FEF3C7'
                        : '#FEE2E2',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.accBadgeText,
                    {
                      color:
                        accuracyMeters <= 100
                          ? '#15803D'
                          : accuracyMeters <= 500
                          ? '#B45309'
                          : '#B91C1C',
                    },
                  ]}
                >
                  ±{accuracyMeters}m
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.summaryValue}>{detectedSummary}</Text>
          <Text style={styles.summaryHint}>
            Coordinates locked. Gujarat district and city fields updated automatically.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detectBtn: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  detectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  manualBtn: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualBtnText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 12,
  },
  statusText: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  warningText: {
    marginTop: 6,
    fontSize: 12,
    color: '#D97706',
    textAlign: 'center',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  accBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  accBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 4,
  },
  summaryHint: {
    fontSize: 11,
    color: '#16A34A',
    marginTop: 4,
    lineHeight: 15,
  },
});
