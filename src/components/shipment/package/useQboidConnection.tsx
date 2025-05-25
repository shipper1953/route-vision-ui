
import { useState } from 'react';
import { ConnectionStatus } from './types';
import { useQboidData } from './useQboidData';
import { useQboidDataLookup } from './useQboidDataLookup';
import { useQboidRealtime } from './useQboidRealtime';
import { useQboidConfig } from './useQboidConfig';

export type { ConnectionStatus } from './types';

export const useQboidConnection = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastScan, setLastScan] = useState<any>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);

  const { handleQboidData } = useQboidData();
  
  const {
    configuring,
    deviceIp,
    configGuide,
    handleDeviceIpChange,
    handleConfigureQboid
  } = useQboidConfig();

  // Enhanced handleQboidData that also updates state
  const enhancedHandleQboidData = async (dimensions: any) => {
    await handleQboidData(dimensions);
    setLastScan(dimensions);
    setLastUpdateTime(new Date().toLocaleTimeString());
    setConnectionStatus('connected');
  };

  // Use the lookup hook
  useQboidDataLookup({ handleQboidData: enhancedHandleQboidData });

  // Use the realtime hook
  useQboidRealtime({ 
    handleQboidData: enhancedHandleQboidData, 
    setConnectionStatus 
  });

  // Wrapper for configure function to include setConnectionStatus
  const wrappedHandleConfigureQboid = () => {
    handleConfigureQboid(setConnectionStatus);
  };

  // For backward compatibility, also expose isConnected
  const isConnected = connectionStatus === 'connected';

  return {
    isConnected,
    connectionStatus,
    lastScan,
    lastUpdateTime,
    configuring,
    deviceIp,
    configGuide,
    handleQboidData: enhancedHandleQboidData,
    handleDeviceIpChange,
    handleConfigureQboid: wrappedHandleConfigureQboid
  };
};
