import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Plus, Settings, Save, LayoutGrid, Eye, CheckCircle, Grid3x3 } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import * as widgetsAPI from '../services/widgetsAPI';
import WidgetLibrary from '../components/dashboard/WidgetLibrary';
import WidgetWrapper from '../components/dashboard/WidgetWrapper';
import GettingStartedWidget from '../components/dashboard/GettingStartedWidget';
import MetricDetailModal from '../components/dashboard/MetricDetailModal';
import EmptyState from '../components/EmptyState';
import { Box } from '@mui/material';
import '../styles/CustomizableDashboard.css';

// Import widgets - 15 widgets essentiels
// Global (3)
import FinancialSummaryWidget from '../components/widgets/FinancialSummaryWidget';
import AlertsWidget from '../components/widgets/AlertsWidget';
import CashFlowSummaryWidget from '../components/widgets/CashFlowSummaryWidget';
// Clients (3)
import TopClientsWidget from '../components/widgets/TopClientsWidget';
import ClientsAtRiskWidget from '../components/widgets/ClientsAtRiskWidget';
import ParetoClientsWidget from '../components/widgets/ParetoClientsWidget';
// Produits (3)
import TopSellingProductsWidget from '../components/widgets/TopSellingProductsWidget';
import StockAlertsWidget from '../components/widgets/StockAlertsWidget';
import MarginAnalysisWidget from '../components/widgets/MarginAnalysisWidget';
// Factures (2)
import InvoicesOverviewWidget from '../components/widgets/InvoicesOverviewWidget';
import OverdueInvoicesWidget from '../components/widgets/OverdueInvoicesWidget';
// Achats (4)
import POOverviewWidget from '../components/widgets/POOverviewWidget';
import OverduePOWidget from '../components/widgets/OverduePOWidget';
import SupplierPerformanceWidget from '../components/widgets/SupplierPerformanceWidget';
import PendingApprovalsWidget from '../components/widgets/PendingApprovalsWidget';
// IA (1)
import AIProactiveSuggestionsWidget from '../components/widgets/AIProactiveSuggestionsWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Widget component mapping - 16 widgets essentiels
const WIDGET_COMPONENTS = {
  // Global (3)
  financial_summary: FinancialSummaryWidget,
  alerts_notifications: AlertsWidget,
  cash_flow_summary: CashFlowSummaryWidget,
  // Clients (3)
  top_clients: TopClientsWidget,
  clients_at_risk: ClientsAtRiskWidget,
  pareto_clients: ParetoClientsWidget,
  // Produits (3)
  top_selling_products: TopSellingProductsWidget,
  stock_alerts: StockAlertsWidget,
  margin_analysis: MarginAnalysisWidget,
  // Factures (2)
  invoices_overview: InvoicesOverviewWidget,
  overdue_invoices: OverdueInvoicesWidget,
  // Achats (4)
  po_overview: POOverviewWidget,
  overdue_po: OverduePOWidget,
  supplier_performance: SupplierPerformanceWidget,
  pending_approvals: PendingApprovalsWidget,
  // IA (1)
  ai_suggestions: AIProactiveSuggestionsWidget,
};

const CustomizableDashboard = () => {
  const { t } = useTranslation('dashboard');
  const [layout, setLayout] = useState([]);
  const [currentLayoutId, setCurrentLayoutId] = useState(null);
  const [availableWidgets, setAvailableWidgets] = useState({});
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [period, setPeriod] = useState('last_30_days');
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [metricDetailGenerator, setMetricDetailGenerator] = useState(null);

  // Load available widgets (already filtered by modules on backend)
  useEffect(() => {
    const loadWidgets = async () => {
      try {
        const response = await widgetsAPI.getAvailableWidgets();
        if (response.success) {
          // Backend already filters by user's accessible modules
          setAvailableWidgets(response.data);
        }
      } catch (error) {
        console.error('Error loading widgets:', error);
      }
    };
    loadWidgets();
  }, []);

  // Listen for edit mode activation from top nav bar
  useEffect(() => {
    const handleEditModeActivation = (event) => {
      if (event.detail?.activate) {
        setIsEditMode(true);
      }
    };
    window.addEventListener('dashboard-edit-mode', handleEditModeActivation);
    return () => {
      window.removeEventListener('dashboard-edit-mode', handleEditModeActivation);
    };
  }, []);

  // Listen for period changes from top nav bar
  useEffect(() => {
    const handlePeriodChange = (event) => {
      if (event.detail?.period) {
        setPeriod(event.detail.period);
      }
    };
    const handleRefresh = () => {
      window.location.reload();
    };
    window.addEventListener('dashboard-period-change', handlePeriodChange);
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      window.removeEventListener('dashboard-period-change', handlePeriodChange);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, []);

  // Notify top nav bar of current period
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('dashboard-period-change', { detail: { period } }));
  }, [period]);

  // Load default layout
  useEffect(() => {
    const createDefaultLayout = async (defaultLayoutConfig) => {
      console.log('📝 Creating default layout in database...');
      try {
        const response = await widgetsAPI.createLayout({
          name: 'Mon tableau de bord',
          is_default: true,
          layout: defaultLayoutConfig,
        });
        if (response.success && response.data) {
          console.log('✅ Default layout created:', response.data.id);
          setCurrentLayoutId(response.data.id);
          return true;
        }
      } catch (error) {
        console.error('❌ Error creating default layout:', error);
      }
      return false;
    };

    const loadDefaultLayout = async () => {
      setIsLoading(true);
      try {
        const response = await widgetsAPI.getDefaultLayout();
        console.log('📊 Loaded layout response:', response);

        if (response.success && response.data) {
          const layoutData = response.data;
          console.log(`✅ Layout ID: ${layoutData.id}, Widgets: ${layoutData.layout?.length || 0}`);
          setLayout(layoutData.layout || []);
          setCurrentLayoutId(layoutData.id);
        } else {
          console.log('⚠️ No default layout found, creating one...');
          // Layout minimal par défaut - seulement les widgets essentiels
          const defaultLayout = [
            { i: 'financial_summary', x: 0, y: 0, w: 4, h: 2 },
            { i: 'alerts_notifications', x: 0, y: 2, w: 2, h: 2 },
            { i: 'invoices_overview', x: 2, y: 2, w: 2, h: 2 },
          ];
          setLayout(defaultLayout);
          // Créer le layout dans la BD pour le persister
          await createDefaultLayout(defaultLayout);
        }
      } catch (error) {
        console.error('❌ Error loading default layout:', error);
        // Layout minimal même en cas d'erreur
        const fallbackLayout = [
          { i: 'financial_summary', x: 0, y: 0, w: 4, h: 2 },
          { i: 'alerts_notifications', x: 0, y: 2, w: 2, h: 2 },
          { i: 'invoices_overview', x: 2, y: 2, w: 2, h: 2 },
        ];
        setLayout(fallbackLayout);
        // Tenter de créer le layout même après erreur
        await createDefaultLayout(fallbackLayout);
      } finally {
        setIsLoading(false);
      }
    };
    loadDefaultLayout();
  }, []);

  // Handle layout change (drag/resize)
  const handleLayoutChange = (newLayout) => {
    if (isEditMode) {
      setLayout(newLayout);
      setHasChanges(true);
    }
  };

  // Add widget to dashboard
  const handleAddWidget = (widgetCode) => {
    // Check if widget exists in available widgets (module must be activated)
    const widget = Object.values(availableWidgets)
      .flat()
      .find(w => w.code === widgetCode);

    if (!widget) {
      alert('Ce widget n\'est pas disponible. Le module correspondant n\'est peut-être pas activé.');
      return;
    }

    // Check if widget already exists
    if (layout.some(item => item.i === widgetCode)) {
      alert(t('widgetAlreadyExists'));
      return;
    }

    const maxY = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);

    const newItem = {
      i: widgetCode,
      x: 0,
      y: maxY,
      w: widget.default_size?.w || 2,
      h: widget.default_size?.h || 1,
    };

    setLayout([...layout, newItem]);
    setHasChanges(true);
    setIsLibraryOpen(false);

    // Auto-enter edit mode when adding widget
    if (!isEditMode) {
      setIsEditMode(true);
    }
  };

  // Add all available widgets to dashboard
  const handleAddAllWidgets = () => {
    // Get all widgets from availableWidgets
    const allWidgets = Object.values(availableWidgets).flat();

    // Filter widgets that are not already in layout
    const missingWidgets = allWidgets.filter(widget =>
      !layout.some(item => item.i === widget.code)
    );

    if (missingWidgets.length === 0) {
      alert(t('allWidgetsAdded'));
      return;
    }

    // Show confirmation if adding many widgets
    if (missingWidgets.length > 5) {
      if (!window.confirm(
        t('addAllWidgetsConfirm', { count: missingWidgets.length })
      )) {
        return;
      }
    }

    // Calculate positions for new widgets
    const cols = 4; // lg breakpoint
    let currentX = 0;
    let currentY = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
    let rowMaxHeight = 0;

    const newItems = missingWidgets.map(widget => {
      const w = widget.default_size?.w || 2;
      const h = widget.default_size?.h || 1;

      // Check if widget fits on current row
      if (currentX + w > cols) {
        // Move to next row
        currentX = 0;
        currentY += rowMaxHeight;
        rowMaxHeight = 0;
      }

      const newItem = {
        i: widget.code,
        x: currentX,
        y: currentY,
        w: w,
        h: h,
      };

      // Update position for next widget
      currentX += w;
      rowMaxHeight = Math.max(rowMaxHeight, h);

      // If we've filled the row, move to next
      if (currentX >= cols) {
        currentX = 0;
        currentY += rowMaxHeight;
        rowMaxHeight = 0;
      }

      return newItem;
    });

    setLayout([...layout, ...newItems]);
    setHasChanges(true);

    // Auto-enter edit mode
    if (!isEditMode) {
      setIsEditMode(true);
    }
  };

  // Remove widget from dashboard
  const handleRemoveWidget = (widgetCode) => {
    console.log('🗑️ Removing widget:', widgetCode);

    setLayout(prevLayout => {
      const newLayout = prevLayout.filter(item => item.i !== widgetCode);
      console.log('✅ New layout:', newLayout);
      return [...newLayout]; // Force new array (immutability)
    });

    setHasChanges(true);
    setGridKey(prev => prev + 1); // Force re-render
  };

  // Save layout
  const handleSaveLayout = async () => {
    setIsSaving(true);
    try {
      if (currentLayoutId) {
        await widgetsAPI.patchLayout(currentLayoutId, { layout });
      } else {
        const response = await widgetsAPI.createLayout({
          name: t('title'),
          layout,
          is_default: true
        });
        if (response.success) {
          setCurrentLayoutId(response.data.id);
        }
      }
      setHasChanges(false);
      setIsEditMode(false);

      // Show success notification
      setShowSaveNotification(true);
      setTimeout(() => setShowSaveNotification(false), 3000);
    } catch (error) {
      console.error('Error saving layout:', error);
      alert(t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditMode && hasChanges) {
      if (window.confirm(t('confirmSave'))) {
        handleSaveLayout();
      } else {
        setIsEditMode(false);
        setHasChanges(false);
      }
    } else {
      setIsEditMode(!isEditMode);
    }
  };

  // Handle metric click from FinancialSummaryWidget
  const handleMetricClick = ({ metric, generateDetailedData }) => {
    setSelectedMetric(metric);
    setMetricDetailGenerator(() => generateDetailedData);
  };

  // Get widget component
  const getWidgetComponent = (widgetCode) => {
    const Component = WIDGET_COMPONENTS[widgetCode];
    if (!Component) {
      return (
        <div className="widget-placeholder">
          <p>{t('widgetPlaceholder', { code: widgetCode })}</p>
          <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '8px' }}>
            Module non activé
          </p>
        </div>
      );
    }

    // Pass onMetricClick to FinancialSummaryWidget
    const extraProps = widgetCode === 'financial_summary'
      ? { onMetricClick: handleMetricClick }
      : {};

    return <Component period={period} {...extraProps} />;
  };

  // Filter layout to only show widgets from availableWidgets (already filtered by modules)
  const filteredLayout = layout.filter(item => {
    // Check if widget exists in available widgets (means module is activated)
    const widgetExists = Object.values(availableWidgets)
      .flat()
      .some(w => w.code === item.i);
    return widgetExists;
  });

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="customizable-dashboard">
      {/* Edit mode hint */}
      {isEditMode && (
        <div className="edit-mode-hint" style={{ marginBottom: '16px', padding: '12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={20} className="hint-icon" />
          <span>{t('editHint')}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="toolbar-btn toolbar-btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.875rem' }}
            >
              <Plus size={16} />
              {t('addWidget')}
            </button>
            <button
              onClick={handleAddAllWidgets}
              className="toolbar-btn toolbar-btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.875rem' }}
              title={t('addAllWidgetsTooltip')}
            >
              <Grid3x3 size={16} />
              {t('addAllWidgets')}
            </button>
            <button
              onClick={toggleEditMode}
              className="toolbar-btn"
              style={{ padding: '6px 12px', fontSize: '0.875rem' }}
            >
              <Eye size={16} />
              {t('preview')}
            </button>
            <button
              onClick={handleSaveLayout}
              disabled={isSaving || !hasChanges}
              className="toolbar-btn toolbar-btn-success"
              style={{ padding: '6px 12px', fontSize: '0.875rem' }}
            >
              <Save size={16} />
              {isSaving ? t('saving') : hasChanges ? t('save') : t('saved')}
            </button>
          </div>
        </div>
      )}

      {/* Widget Getting Started pour les nouveaux utilisateurs */}
      <div className="dashboard-getting-started" data-tutorial="dashboard">
        <GettingStartedWidget
          onStartTutorial={() => {
            window.dispatchEvent(new CustomEvent('start-tutorial'));
          }}
        />
      </div>

      {/* Grid Layout */}
      <div className="dashboard-content">
        <ResponsiveGridLayout
          key={gridKey}
          className="dashboard-grid"
          layouts={{ lg: filteredLayout, md: filteredLayout, sm: filteredLayout, xs: filteredLayout, xxs: filteredLayout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 4, md: 3, sm: 2, xs: 1, xxs: 1 }}
          rowHeight={150}
          onLayoutChange={handleLayoutChange}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          compactType="vertical"
          preventCollision={false}
          margin={[12, 12]}
          containerPadding={[0, 0]}
          draggableHandle=".widget-drag-handle"
        >
          {filteredLayout.map((item) => (
            <div key={item.i} className="dashboard-grid-item">
              <WidgetWrapper
                widgetCode={item.i}
                onRemove={handleRemoveWidget}
                isEditMode={isEditMode}
              >
                {getWidgetComponent(item.i)}
              </WidgetWrapper>
            </div>
          ))}
        </ResponsiveGridLayout>

        {/* Empty state */}
        {filteredLayout.length === 0 && (
          <Box sx={{ py: 8 }}>
            <EmptyState
              title={t('emptyState.title', 'Aucun widget configuré')}
              description={t('emptyState.description', 'Commencez par ajouter des widgets à votre tableau de bord.')}
              mascotPose="reading"
              actionLabel={t('emptyState.button', 'Ajouter un widget')}
              onAction={() => {
                setIsEditMode(true);
                setIsLibraryOpen(true);
              }}
            />
          </Box>
        )}
      </div>

      {/* Widget Library Modal */}
      {isLibraryOpen && (
        <WidgetLibrary
          availableWidgets={availableWidgets}
          currentWidgets={filteredLayout.map(item => item.i)}
          onAddWidget={handleAddWidget}
          onClose={() => setIsLibraryOpen(false)}
        />
      )}

      {/* Save Notification */}
      {showSaveNotification && (
        <div className="save-notification">
          <CheckCircle size={20} className="icon" />
          <span>{t('saveSuccess')}</span>
        </div>
      )}

      {/* Metric Detail Modal */}
      {selectedMetric && metricDetailGenerator && (
        <MetricDetailModal
          metric={selectedMetric}
          onClose={() => {
            setSelectedMetric(null);
            setMetricDetailGenerator(null);
          }}
          generateDetailedData={metricDetailGenerator}
        />
      )}
    </div>
  );
};

export default CustomizableDashboard;
