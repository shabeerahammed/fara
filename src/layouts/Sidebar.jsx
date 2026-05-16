import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Phone, ShieldCheck, Truck,
  Settings, ChevronRight, Zap, Radio
} from 'lucide-react';
import { useAppStore } from '../app/store';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/live', icon: Radio, label: 'Live Calls' },
  { to: '/calls', icon: Phone, label: 'Call Logs' },
  { to: '/governance', icon: ShieldCheck, label: 'Governance' },
  { to: '/delivery', icon: Truck, label: 'Delivery' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { sidebarOpen } = useAppStore();

  return (
    <AnimatePresence initial={false}>
      <motion.aside
        animate={{ width: sidebarOpen ? 220 : 64 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          height: '100vh',
          position: 'fixed',
          left: 0, top: 0,
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 64,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'var(--accent-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={16} color="white" fill="white" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  GovAI
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em' }}>
                  CALL SYSTEM
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          <button
            className="sidebar-link"
            style={{ width: '100%', background: 'none', border: 'none', justifyContent: sidebarOpen ? 'flex-end' : 'center' }}
            onClick={() => useAppStore.getState().toggleSidebar()}
          >
            <motion.div animate={{ rotate: sidebarOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronRight size={16} />
            </motion.div>
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
