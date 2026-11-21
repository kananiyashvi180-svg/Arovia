import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '../context/NetworkContext';

export default function NetworkBanner() {
  const { isOnline } = useNetwork();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚠️ No Internet Connection. Working in Offline Mode.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
