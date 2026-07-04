import { createRoot } from 'react-dom/client';

import { AppRouter } from './AppRouter';

import 'react-toastify/dist/ReactToastify.css';

createRoot(document.getElementById('root')!).render(<AppRouter />);
