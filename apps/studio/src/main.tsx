import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);

// Installeerbaar als app (Chrome/Edge: ⊕ in de adresbalk → Installeren).
if ('serviceWorker' in navigator && location.hostname !== '' && import.meta.env.PROD) {
  navigator.serviceWorker.register('/studio/sw.js', { scope: '/studio/' }).catch(() => {});
}
