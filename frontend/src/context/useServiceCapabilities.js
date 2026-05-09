import { useContext } from 'react';
import { ServiceCapabilitiesContext } from './serviceCapabilitiesContext';

export const useServiceCapabilities = () => useContext(ServiceCapabilitiesContext);
