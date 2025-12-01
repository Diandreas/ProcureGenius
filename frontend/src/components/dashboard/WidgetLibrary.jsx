import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Search, Check } from 'lucide-react';
import '../../styles/WidgetLibrary.css';

// Icon mapping (you can use lucide-react icons)
import * as Icons from 'lucide-react';

const WidgetLibrary = ({ availableWidgets, currentWidgets, onAddWidget, onClose }) => {
  const { t } = useTranslation('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');

  // Get unique modules
  const modules = Object.keys(availableWidgets);

  // Filter widgets
  const filterWidgets = () => {
    let filtered = availableWidgets;

    // Filter by module
    if (selectedModule !== 'all') {
      filtered = { [selectedModule]: availableWidgets[selectedModule] };
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = Object.keys(filtered).reduce((acc, module) => {
        const matchingWidgets = filtered[module].filter(widget =>
          widget.name.toLowerCase().includes(query) ||
          widget.description.toLowerCase().includes(query)
        );
        if (matchingWidgets.length > 0) {
          acc[module] = matchingWidgets;
        }
        return acc;
      }, {});
    }

    return filtered;
  };

  const filteredWidgets = filterWidgets();

  // Check if widget is already added
  const isWidgetAdded = (widgetCode) => currentWidgets.includes(widgetCode);

  // Get icon component
  const getIcon = (iconName) => {
    const IconComponent = Icons[iconName] || Icons.Box;
    return <IconComponent size={20} />;
  };

  // Module labels
  const moduleLabels = {
    global: t('library.modules.global'),
    products: t('library.modules.products'),
    clients: t('library.modules.clients'),
    invoices: t('library.modules.invoices'),
    purchase_orders: t('library.modules.purchase_orders'),
    ai: t('library.modules.ai')
  };

  return (
    <div className="widget-library-overlay" onClick={onClose}>
      <div className="widget-library-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="library-header">
          <h2>{t('library.title')}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="library-filters">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder={t('library.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="module-filters">
            <button
              className={`module-filter-btn ${selectedModule === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedModule('all')}
            >
              {t('library.all')}
            </button>
            {modules.map(module => (
              <button
                key={module}
                className={`module-filter-btn ${selectedModule === module ? 'active' : ''}`}
                onClick={() => setSelectedModule(module)}
              >
                {moduleLabels[module] || module}
              </button>
            ))}
          </div>
        </div>

        {/* Widgets Grid */}
        <div className="library-content">
          {Object.keys(filteredWidgets).length === 0 ? (
            <div className="no-results">
              <p>{t('library.noResults')}</p>
            </div>
          ) : (
            Object.keys(filteredWidgets).map(module => (
              <div key={module} className="widget-module-section">
                <h3 className="module-title">{moduleLabels[module] || module}</h3>
                <div className="widgets-grid">
                  {filteredWidgets[module].map(widget => {
                    const isAdded = isWidgetAdded(widget.code);
                    return (
                      <div key={widget.code} className={`widget-card ${isAdded ? 'added' : ''}`}>
                        <div className="widget-card-icon">
                          {getIcon(widget.icon)}
                        </div>
                        <div className="widget-card-content">
                          <h4 className="widget-card-title">{widget.name}</h4>
                          <p className="widget-card-description">{widget.description}</p>
                          <div className="widget-card-meta">
                            <span className="widget-type">{widget.type}</span>
                            <span className="widget-size">
                              {widget.default_size?.w || 2}x{widget.default_size?.h || 1}
                            </span>
                          </div>
                        </div>
                        <div className="widget-card-action">
                          {isAdded ? (
                            <button className="widget-btn widget-btn-added" disabled>
                              <Check size={16} />
                              {t('library.added')}
                            </button>
                          ) : (
                            <button
                              className="widget-btn widget-btn-add"
                              onClick={() => onAddWidget(widget.code)}
                            >
                              <Plus size={16} />
                              {t('library.add')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WidgetLibrary;
