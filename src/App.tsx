import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useStore } from './lib/store';
import Home from './pages/Home';
import Workout from './pages/Workout';
import Progress from './pages/Progress';
import History from './pages/History';
import Library from './pages/Library';
import Tips from './pages/Tips';
import SettingsPage from './pages/Settings';
import Onboarding from './pages/Onboarding';
import { Logo } from './components/ui';

const TABS = [
  { to: '/', label: 'Oggi', icon: '🏠' },
  { to: '/progressi', label: 'Progressi', icon: '📈' },
  { to: '/storico', label: 'Storico', icon: '🗂' },
  { to: '/libreria', label: 'Esercizi', icon: '📚' },
  { to: '/impostazioni', label: 'Altro', icon: '⚙️' },
];

export default function App() {
  const { ready, settings } = useStore();
  const { pathname } = useLocation();
  const inWorkout = pathname.startsWith('/allenamento');

  if (!ready) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <div className="animate-pop">
          <Logo />
        </div>
      </div>
    );
  }

  if (!settings.onboarded) return <Onboarding />;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col">
      <main className={`flex-1 px-4 pt-safe ${inWorkout ? 'pb-safe' : 'pb-28'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/allenamento" element={<Workout />} />
          <Route path="/progressi" element={<Progress />} />
          <Route path="/storico" element={<History />} />
          <Route path="/libreria" element={<Library />} />
          <Route path="/consigli" element={<Tips />} />
          <Route path="/impostazioni" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!inWorkout && (
        <nav
          aria-label="Navigazione principale"
          className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] px-3 pb-[calc(var(--safe-bottom)+0.5rem)]"
        >
          <ul className="glass glass-sheen flex items-stretch justify-between gap-1 p-1.5">
            {TABS.map((t) => (
              <li key={t.to} className="flex-1">
                <NavLink
                  to={t.to}
                  className={({ isActive }) =>
                    `flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold transition ${
                      isActive ? 'bg-ink text-brand-400 shadow-lift' : 'text-ink/70'
                    }`
                  }
                >
                  <span aria-hidden className="text-lg leading-none">
                    {t.icon}
                  </span>
                  {t.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
