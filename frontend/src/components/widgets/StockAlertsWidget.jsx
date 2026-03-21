import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, PackageX, Package } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const StockAlertsWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('low_stock'); // low_stock | expiring | expired

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('stock_alerts', { period });
        if (response.success) setData(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  if (loading) return <div className="widget-loading">Chargement...</div>;

  const lowStock = data?.low_stock_products || [];
  const expiringBatches = data?.expiring_batches || [];
  const expiredBatches = data?.expired_batches || [];

  const hasNoAlerts = lowStock.length === 0 && expiringBatches.length === 0 && expiredBatches.length === 0;

  if (hasNoAlerts) {
    return (
      <div className="widget-empty">
        <Package size={40} className="widget-empty-icon" style={{ color: '#10b981' }} />
        <div className="widget-empty-text">Tous les stocks sont en ordre</div>
      </div>
    );
  }

  const tabs = [
    { key: 'low_stock', label: 'Stock bas', count: lowStock.length, icon: <AlertTriangle size={14} /> },
    { key: 'expiring', label: 'Expirent bientôt', count: expiringBatches.length, icon: <Clock size={14} /> },
    { key: 'expired', label: 'Périmés', count: expiredBatches.length, icon: <PackageX size={14} /> },
  ].filter(t => t.count > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 8 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 600,
              transition: 'all 0.15s ease',
              background: activeTab === tab.key
                ? tab.key === 'expired' ? '#fee2e2' : tab.key === 'expiring' ? '#fef3c7' : '#dbeafe'
                : 'transparent',
              color: activeTab === tab.key
                ? tab.key === 'expired' ? '#dc2626' : tab.key === 'expiring' ? '#d97706' : '#2563eb'
                : '#64748b',
            }}
          >
            {tab.icon}
            {tab.label}
            <span style={{
              background: activeTab === tab.key ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.06)',
              borderRadius: 10,
              padding: '0 5px',
              fontSize: '0.65rem',
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'low_stock' && lowStock.slice(0, 6).map((product, i) => (
          <div key={i} className="alert-item warning" style={{ marginBottom: 6 }}>
            <AlertTriangle size={15} className="alert-icon" style={{ color: '#f59e0b', flexShrink: 0 }} />
            <div className="alert-content">
              <div className="alert-title">{product.name}</div>
              <div className="alert-message">Stock: <strong>{product.stock}</strong> (Min: {product.min_stock})</div>
            </div>
          </div>
        ))}

        {activeTab === 'expiring' && (expiringBatches.length > 0
          ? expiringBatches.slice(0, 6).map((batch, i) => (
            <div key={i} className="alert-item warning" style={{ marginBottom: 6, borderLeftColor: '#f59e0b' }}>
              <Clock size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <div className="alert-content">
                <div className="alert-title">{batch.product_name || batch.name}</div>
                <div className="alert-message">
                  Lot <strong>{batch.batch_number}</strong> — expire le {batch.expiration_date}
                  {batch.current_quantity != null && ` (${batch.current_quantity} unités)`}
                </div>
              </div>
            </div>
          ))
          : <div className="widget-empty" style={{ padding: 16 }}>
              <Clock size={28} style={{ color: '#10b981', opacity: 0.5 }} />
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6 }}>Aucun lot n'expire bientôt</div>
            </div>
        )}

        {activeTab === 'expired' && (expiredBatches.length > 0
          ? expiredBatches.slice(0, 6).map((batch, i) => (
            <div key={i} className="alert-item error" style={{ marginBottom: 6, borderLeftColor: '#ef4444' }}>
              <PackageX size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div className="alert-content">
                <div className="alert-title" style={{ color: '#dc2626' }}>{batch.product_name || batch.name}</div>
                <div className="alert-message">
                  Lot <strong>{batch.batch_number}</strong> — périmé le {batch.expiration_date}
                  {batch.current_quantity > 0 && (
                    <span style={{ color: '#dc2626', fontWeight: 600 }}> · {batch.current_quantity} unités à retirer</span>
                  )}
                </div>
              </div>
            </div>
          ))
          : <div className="widget-empty" style={{ padding: 16 }}>
              <PackageX size={28} style={{ color: '#10b981', opacity: 0.5 }} />
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6 }}>Aucun lot périmé</div>
            </div>
        )}
      </div>
    </div>
  );
};

export default StockAlertsWidget;
