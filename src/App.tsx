import { Navigate, Route, Routes } from 'react-router-dom';
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage';
import { ConnectPage } from './pages/Connect/ConnectPage';
import { GamesPage } from './pages/Games/GamesPage';
import { HomePage } from './pages/Home/HomePage';
import { PlanPage } from './pages/Plan/PlanPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/plan" element={<PlanPage />} />
      <Route path="/connect" element={<ConnectPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/games" element={<GamesPage />} />
      <Route path="/games/new" element={<Navigate to="/games?new=1" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
