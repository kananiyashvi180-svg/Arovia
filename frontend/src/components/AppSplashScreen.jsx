import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

// Keep splash screen visible until we explicitly hide it
SplashScreen.preventAutoHideAsync();

export default function AppSplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Step 1: Hide the native splash screen
    SplashScreen.hideAsync();

    // Step 2: Animate in our custom branded screen
    Animated.sequence([
      // Logo fades + scales in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Tagline slides up
      Animated.parallel([
        Animated.timing(taglineAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Step 3: After 2.5s, notify parent to navigate
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Background gradient circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Logo area */}
      <Animated.View
        style={[
          styles.logoContainer,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>💙</Text>
        </View>
        <Text style={styles.appName}>Arovia</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View
        style={[
          styles.taglineContainer,
          {
            opacity: taglineAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.tagline}>AI Healthcare Navigator</Text>
      </Animated.View>

      {/* Bottom brand */}
      <View style={styles.bottomBrand}>
        <Text style={styles.bottomText}>Made with ❤️ for your health</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  // Decorative background circles
  circle1: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: '#1E3A5F',
    top: -width * 0.2,
    right: -width * 0.2,
    opacity: 0.5,
  },
  circle2: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: '#1A365D',
    bottom: -width * 0.1,
    left: -width * 0.15,
    opacity: 0.4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBox: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  iconEmoji: {
    fontSize: 50,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#94A3B8',
    letterSpacing: 0.3,
    fontWeight: '400',
  },
  bottomBrand: {
    position: 'absolute',
    bottom: 48,
  },
  bottomText: {
    fontSize: 13,
    color: '#475569',
    letterSpacing: 0.2,
  },
});
