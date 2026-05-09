import { useCallback, useEffect, useMemo, useState } from 'react';
import { ServiceCapabilitiesContext } from './serviceCapabilitiesContext';
import {
  defaultServiceCapabilities,
  serviceCapabilitiesStore,
} from '../utils/serviceCapabilitiesStore';

const getCapabilityValue = (capabilities, path) =>
  String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((currentValue, key) => currentValue?.[key], capabilities);

export function ServiceCapabilitiesProvider({ children }) {
  const [capabilities, setCapabilities] = useState(
    serviceCapabilitiesStore.getCachedCapabilities()
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadCapabilities = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const nextCapabilities = await serviceCapabilitiesStore.loadCapabilities();
      setCapabilities(nextCapabilities);
      return nextCapabilities;
    } catch (error) {
      setCapabilities(defaultServiceCapabilities);
      setErrorMessage(error.message || 'Service capabilities could not load.');
      return defaultServiceCapabilities;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCapabilities();
  }, [loadCapabilities]);

  const value = useMemo(
    () => ({
      capabilities,
      errorMessage,
      isLoading,
      refreshCapabilities: loadCapabilities,
      supports: (path) => Boolean(getCapabilityValue(capabilities, path)),
    }),
    [capabilities, errorMessage, isLoading, loadCapabilities]
  );

  return (
    <ServiceCapabilitiesContext.Provider value={value}>
      {children}
    </ServiceCapabilitiesContext.Provider>
  );
}
