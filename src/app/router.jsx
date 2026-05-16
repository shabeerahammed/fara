import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/DashboardPage';
import CallLogsPage from '../pages/CallLogsPage';
import GovernancePage from '../pages/GovernancePage';
import LiveCallPage from '../pages/LiveCallPage';
import DeliveryPage from '../pages/DeliveryPage';
import SettingsPage from '../pages/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'calls', element: <CallLogsPage /> },
      { path: 'governance', element: <GovernancePage /> },
      { path: 'live', element: <LiveCallPage /> },
      { path: 'delivery', element: <DeliveryPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
