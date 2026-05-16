import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, ChevronDown, Shield, User } from 'lucide-react';
import { useAppStore } from '../app/store';

export default function Navbar({ pageTitle }) {
  const { user, notifications, markAllRead, setRole, unreadCount } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const unread = unreadCount();

  const notifColors = { danger: '#ef4444', warning: '#f59e0b', info: '#06b6d4' };

  return (
    <header style={{
      height: 64,
      borderBottom: '1px solid var(--border)',
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 30,
    }}>
      {/* Left: Page title */}
      <div>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          {pageTitle}
        </h1>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* Live indicator */}
        <div className="live-badge" style={{ marginRight: 8 }}>
          <div className="live-dot" />
          LIVE
        </div>

        {/* Search */}
        <button style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 12px', cursor: 'pointer', color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
          fontFamily: 'Inter, sans-serif', transition: 'border-color 0.2s'
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <Search size={14} /> <span>Search...</span>
          <span style={{ fontSize: 10, padding: '1px 5px', background: 'var(--border)', borderRadius: 3 }}>⌘K</span>
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setNotifOpen(v => !v); setRoleOpen(false); }}
            style={{
              background: notifOpen ? 'var(--bg-card-hover)' : 'transparent',
              border: '1px solid ' + (notifOpen ? 'var(--border)' : 'transparent'),
              borderRadius: 8, padding: 8, cursor: 'pointer',
              color: 'var(--text-secondary)', position: 'relative', display: 'flex',
            }}
          >
            <Bell size={17} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: 5, right: 5,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--accent-red)', border: '1px solid var(--bg-secondary)',
              }} />
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', right: 0, top: '120%', width: 320,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 12, overflow: 'hidden', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Notifications</span>
                  <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent-cyan)', fontFamily: 'Inter, sans-serif' }}>
                    Mark all read
                  </button>
                </div>
                {notifications.map(n => (
                  <div key={n.id} style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                    background: n.read ? 'transparent' : 'var(--bg-card-hover)',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: notifColors[n.type] || '#94a3b8', marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: n.read ? 'var(--text-muted)' : 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'Inter, sans-serif' }}>{n.time}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Role switcher + user */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setRoleOpen(v => !v); setNotifOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: roleOpen ? 'var(--bg-card-hover)' : 'transparent',
              border: '1px solid ' + (roleOpen ? 'var(--border)' : 'transparent'),
              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'white',
            }}>
              {user.avatar}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user.role}
              </div>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          <AnimatePresence>
            {roleOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', right: 0, top: '120%', width: 180,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 10, overflow: 'hidden', zIndex: 100, boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 8px', fontFamily: 'Inter, sans-serif', letterSpacing: '0.1em' }}>SWITCH ROLE</div>
                  {['admin', 'agent'].map(role => (
                    <button key={role} onClick={() => { setRole(role); setRoleOpen(false); }} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      borderRadius: 6, background: user.role === role ? 'var(--bg-card-hover)' : 'none',
                      border: 'none', cursor: 'pointer', color: user.role === role ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 500, textAlign: 'left',
                    }}>
                      {role === 'admin' ? <Shield size={14} /> : <User size={14} />}
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
