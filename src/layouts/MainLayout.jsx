import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAppStore } from '../app/store';
import { motion } from 'framer-motion';

const pageTitles = {
  '/': 'Dashboard',
  '/calls': 'Call Logs',
  '/governance': 'Governance Panel',
  '/delivery': 'Delivery Panel',
  '/settings': 'Settings',
};

export default function MainLayout() {
  const { sidebarOpen } = useAppStore();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'GovAI';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <Sidebar />
      <div style={{
        flex: 1,
        marginLeft: sidebarOpen ? 220 : 64,
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Navbar pageTitle={title} />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{ flex: 1, padding: '24px', maxWidth: '100%' }}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
