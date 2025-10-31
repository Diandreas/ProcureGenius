import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import * as widgetsAPI from '../../services/widgetsAPI';
import '../../styles/Widgets.css';

const AILastConversationWidget = ({ period = 'last_30_days' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await widgetsAPI.getWidgetData('ai_last_conversation', { period });
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
  if (!data || !data.messages) return <div className="widget-empty"><MessageSquare size={40} className="widget-empty-icon" /><div className="widget-empty-text">Aucune conversation</div></div>;

  return (
    <div className="widget-list">
      {data.messages.slice(0, 5).map((message, i) => (
        <div key={i} className="list-item">
          <div className="list-item-content">
            <div className="list-item-title">{message.role === 'user' ? 'Vous' : 'Assistant'}</div>
            <div className="list-item-subtitle">{message.content.substring(0, 50)}...</div>
          </div>
          <div className="list-item-value">{new Date(message.created_at).toLocaleTimeString()}</div>
        </div>
      ))}
    </div>
  );
};

export default AILastConversationWidget;
