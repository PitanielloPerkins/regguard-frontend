import { createRoot } from 'react-dom/client';

import { AppRouter } from './AppRouter';
import { loadGoogleMapsApi } from './loadGoogleMaps';

import 'react-toastify/dist/ReactToastify.css';
import './voice-command.css';
import './onboarding-system.css';

// Load Google Maps API before rendering
loadGoogleMapsApi().catch(err => console.error('Failed to load Google Maps:', err));

createRoot(document.getElementById('root')!).render(<AppRouter />);
