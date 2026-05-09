import { createContext } from 'react';
import { defaultServiceCapabilities } from '../utils/serviceCapabilitiesStore';

export const ServiceCapabilitiesContext = createContext({
  capabilities: defaultServiceCapabilities,
  errorMessage: '',
  isLoading: true,
  supports: () => false,
  refreshCapabilities: async () => defaultServiceCapabilities,
});
