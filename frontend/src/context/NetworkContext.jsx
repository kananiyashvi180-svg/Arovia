import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Network from 'expo-network';

const NetworkContext = createContext({
  isConnected: true,
  isInternetReachable: true,
  networkType: 'UNKNOWN',
  isOnline: true,
  checkNetwork: async () => {},
});

export const NetworkProvider = ({ children }) => {
  const [networkState, setNetworkState] = useState({
    isConnected: true,
    isInternetReachable: true,
    networkType: 'UNKNOWN',
  });

  const checkNetwork = async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setNetworkState({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable ?? true,
        networkType: state.type || 'UNKNOWN',
      });
    } catch (err) {
      console.warn('Network check error:', err);
    }
  };

  useEffect(() => {
    checkNetwork();
    // Poll network status every 5 seconds to detect changes smoothly
    const interval = setInterval(checkNetwork, 5000);
    return () => clearInterval(interval);
  }, []);

  const isOnline = Boolean(networkState.isConnected && networkState.isInternetReachable !== false);

  return (
    <NetworkContext.Provider
      value={{
        ...networkState,
        isOnline,
        checkNetwork,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
