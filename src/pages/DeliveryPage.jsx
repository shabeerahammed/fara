import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Truck, CheckCircle, XCircle, AlertCircle, Search, X } from 'lucide-react';
import { apiService } from '../services/api';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';

const statusColors = {
  delivered: 'var(--accent-green)', 'in-transit': 'var(--accent-cyan)',
  held: 'var(--accent-amber)', flagged: 'var(--accent-red)', cancelled: 'var(--text-muted)',
};

const statusIcons = {
  delivered: CheckCircle, 'in-transit': Truck, held: AlertCircle,
  flagged: AlertCircle, cancelled: XCircle,
};

export default function DeliveryPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', search, statusFilter],
    queryFn: () => apiService.getOrders({ search, status: statusFilter }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => apiService.updateOrderStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(['orders']); setUpdatingId(null); },
  });

  const statusCounts = {
    total: orders.length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    inTransit: orders.filter(o => o.status === 'in-transit').length,
    flagged: orders.filter(o => o.status === 'flagged').length,
    held: orders.filter(o => o.status === 'held').length,
  };

  const statusOptions = ['all', 'in-transit', 'delivered', 'held', 'flagged', 'cancelled'];

  if (isLoading) return <Loader text="Loading delivery orders..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Total Orders', value: statusCounts.total, color: '#06b6d4', icon: Package },
          { label: 'In Transit', value: statusCounts.inTransit, color: '#2563eb', icon: Truck },
          { label: 'Delivered', value: statusCounts.delivered, color: '#10b981', icon: CheckCircle },
          { label: 'Flagged/Held', value: statusCounts.flagged + statusCounts.held, color: '#ef4444', icon: AlertCircle },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            className="stat-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            style={{ borderTop: `2px solid ${s.color}` }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>{s.label.toUpperCase()}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Order Management</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="search-input"
              placeholder="Search orders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                <X size={13} />
              </button>
            )}
          </div>
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {statusOptions.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <Card noPad>
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th><th>Customer</th><th>Items</th><th>Value</th>
              <th>Carrier</th><th>Tracking</th><th>ETA</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, i) => {
              const StatusIcon = statusIcons[order.status] || Package;
              const color = statusColors[order.status] || 'var(--text-muted)';
              return (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <td>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--accent-cyan)' }}>{order.id}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>ref: {order.callRef}</div>
                  </td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{order.customer}</td>
                  <td><span style={{ fontFamily: 'Inter, sans-serif' }}>{order.items}</span></td>
                  <td style={{ color: 'var(--accent-green)', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{order.value}</td>
                  <td><Badge variant="muted">{order.carrier}</Badge></td>
                  <td><span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>{order.tracking}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <StatusIcon size={13} color={color} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{order.eta}</span>
                    </div>
                  </td>
                  <td><Badge variant={order.status} dot>{order.status}</Badge></td>
                  <td>
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {order.status === 'held' || order.status === 'flagged' ? (
                          <button
                            className="btn-ghost"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                            disabled={updatingId === order.id}
                            onClick={() => {
                              setUpdatingId(order.id);
                              updateMutation.mutate({ id: order.id, status: 'in-transit' });
                            }}
                          >
                            {updatingId === order.id ? '...' : 'Release'}
                          </button>
                        ) : (
                          <button
                            className="btn-primary"
                            style={{ fontSize: 11, padding: '4px 10px' }}
                            disabled={updatingId === order.id}
                            onClick={() => {
                              setUpdatingId(order.id);
                              updateMutation.mutate({ id: order.id, status: 'delivered' });
                            }}
                          >
                            {updatingId === order.id ? '...' : 'Mark Delivered'}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
            No orders match your criteria
          </div>
        )}
      </Card>
    </div>
  );
}
