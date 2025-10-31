import React, { useState, useEffect } from 'react';
import { FileSearch } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const AIDocumentsWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('ai_documents', { period });
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
  if (!data || !data.documents) return <div className="widget-empty"><FileSearch size={40} className="widget-empty-icon" /><div className="widget-empty-text">Aucun document</div></div>;

  return (
    <div className="widget-list">
      {data.documents.slice(0, 5).map((doc, i) => (
        <div key={i} className="list-item">
          <div className="list-item-content">
            <div className="list-item-title">{doc.filename}</div>
            <div className="list-item-subtitle">{doc.document_type} - {new Date(doc.scanned_at).toLocaleDateString()}</div>
          </div>
          <div className="list-item-value">{doc.status === 'success' ? '✓' : '⚠'}</div>
        </div>
      ))}
    </div>
  );
};

export default AIDocumentsWidget;
