
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ConnectionStatus, QboidConfigGuide } from './types';

export const useQboidConfig = () => {
  const [configuring, setConfiguring] = useState(false);
  const [deviceIp, setDeviceIp] = useState('');

  const configGuide: QboidConfigGuide = {
    instructions: [
      "1. Connect your Qboid device to WiFi",
      "2. Navigate to the device's web interface",
      "3. Configure the API endpoint to point to this application",
      "4. Test the connection by placing a package on the device"
    ]
  };

  const handleDeviceIpChange = useCallback((ip: string) => {
    setDeviceIp(ip);
  }, []);

  const handleConfigureQboid = useCallback(async (setConnectionStatus: (status: ConnectionStatus) => void) => {
    setConfiguring(true);
    setConnectionStatus('connecting');
    
    try {
      // Simulate configuration process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, just set to connecting state - actual connection happens via realtime
      toast.info('Qboid device configured. Waiting for data...');
    } catch (error) {
      console.error('Error configuring Qboid:', error);
      setConnectionStatus('error');
      toast.error('Failed to configure Qboid device');
    } finally {
      setConfiguring(false);
    }
  }, []);

  return {
    configuring,
    deviceIp,
    configGuide,
    handleDeviceIpChange,
    handleConfigureQboid
  };
};
