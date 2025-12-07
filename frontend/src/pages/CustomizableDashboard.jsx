import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Plus, Settings, Save, LayoutGrid, Edit3, Eye, RefreshCw, CheckCircle } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import * as widgetsAPI from '../services/widgetsAPI';
import WidgetLibrary from '../components/dashboard/WidgetLibrary';
import WidgetWrapper from '../components/dashboard/WidgetWrapper';
import '../styles/CustomizableDashboard.css';

// Import widgets
import FinancialSummaryWidget from '../components/widgets/FinancialSummaryWidget';
import RecentActivityWidget from '../components/widgets/RecentActivityWidget';
import AlertsWidget from '../components/widgets/AlertsWidget';
import GlobalPerformanceWidget from '../components/widgets/GlobalPerformanceWidget';
import ProductsOverviewWidget from '../components/widgets/ProductsOverviewWidget';
import TopSellingProductsWidget from '../components/widgets/TopSellingProductsWidget';
import StockAlertsWidget from '../components/widgets/StockAlertsWidget';
import MarginAnalysisWidget from '../components/widgets/MarginAnalysisWidget';
import StockMovementsWidget from '../components/widgets/StockMovementsWidget';
import ClientsOverviewWidget from '../components/widgets/ClientsOverviewWidget';
import TopClientsWidget from '../components/widgets/TopClientsWidget';
import ClientsAtRiskWidget from '../components/widgets/ClientsAtRiskWidget';
import ClientAcquisitionWidget from '../components/widgets/ClientAcquisitionWidget';
import ClientSegmentationWidget from '../components/widgets/ClientSegmentationWidget';
import InvoicesOverviewWidget from '../components/widgets/InvoicesOverviewWidget';
import InvoicesStatusWidget from '../components/widgets/InvoicesStatusWidget';
import RevenueChartWidget from '../components/widgets/RevenueChartWidget';
import OverdueInvoicesWidget from '../components/widgets/OverdueInvoicesWidget';
import PaymentPerformanceWidget from '../components/widgets/PaymentPerformanceWidget';
import RecentInvoicesWidget from '../components/widgets/RecentInvoicesWidget';
import POOverviewWidget from '../components/widgets/POOverviewWidget';
import POStatusWidget from '../components/widgets/POStatusWidget';
import ExpensesChartWidget from '../components/widgets/ExpensesChartWidget';
import OverduePOWidget from '../components/widgets/OverduePOWidget';
import SupplierPerformanceWidget from '../components/widgets/SupplierPerformanceWidget';
import PendingApprovalsWidget from '../components/widgets/PendingApprovalsWidget';
import BudgetTrackingWidget from '../components/widgets/BudgetTrackingWidget';
import AIUsageWidget from '../components/widgets/AIUsageWidget';
import AIDocumentsWidget from '../components/widgets/AIDocumentsWidget';
import AILastConversationWidget from '../components/widgets/AILastConversationWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Widget component mapping
const WIDGET_COMPONENTS = {
  financial_summary: FinancialSummaryWidget,
  recent_activity: RecentActivityWidget,
  alerts_notifications: AlertsWidget,
  global_performance: GlobalPerformanceWidget,
  products_overview: ProductsOverviewWidget,
  top_selling_products: TopSellingProductsWidget,
  stock_alerts: StockAlertsWidget,
  margin_analysis: MarginAnalysisWidget,
  stock_movements: StockMovementsWidget,
  clients_overview: ClientsOverviewWidget,
  top_clients: TopClientsWidget,
  clients_at_risk: ClientsAtRiskWidget,
  client_acquisition: ClientAcquisitionWidget,
  client_segmentation: ClientSegmentationWidget,
  invoices_overview: InvoicesOverviewWidget,
  invoices_status: InvoicesStatusWidget,
  revenue_chart: RevenueChartWidget,
  overdue_invoices: OverdueInvoicesWidget,
  payment_performance: PaymentPerformanceWidget,
  recent_invoices: RecentInvoicesWidget,
  po_overview: POOverviewWidget,
  po_status: POStatusWidget,
  expenses_chart: ExpensesChartWidget,
  overdue_po: OverduePOWidget,
  supplier_performance: SupplierPerformanceWidget,
  pending_approvals: PendingApprovalsWidget,
  budget_tracking: BudgetTrackingWidget,
  ai_usage: AIUsageWidget,
  ai_documents: AIDocumentsWidget,
  ai_last_conversation: AILastConversationWidget,
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

  // Load available widgets
  useEffect(() => {
    const loadWidgets = async () => {
      try {
        const response = await widgetsAPI.getAvailableWidgets();
        if (response.success) {
          setAvailableWidgets(response.data);
        }
      } catch (error) {
        console.error('Error loading widgets:', error);
      }
    };
    loadWidgets();
  }, []);

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
          // Layout minimal par défaut - ne pas submerger l'utilisateur
          const defaultLayout = [
            { i: 'financial_summary', x: 0, y: 0, w: 4, h: 2 },
            { i: 'alerts_notifications', x: 0, y: 2, w: 2, h: 2 },
            { i: 'recent_activity', x: 2, y: 2, w: 2, h: 2 },
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
          { i: 'recent_activity', x: 2, y: 2, w: 2, h: 2 },
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
    // Check if widget already exists
    if (layout.some(item => item.i === widgetCode)) {
      alert(t('widgetAlreadyExists'));
      return;
    }

    const widget = Object.values(availableWidgets)
      .flat()
      .find(w => w.code === widgetCode);

    if (!widget) return;

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

  // Get widget component
  const getWidgetComponent = (widgetCode) => {
    const Component = WIDGET_COMPONENTS[widgetCode];
    if (!Component) {
      return (
        <div className="widget-placeholder">
          <p>{t('widgetPlaceholder', { code: widgetCode })}</p>
        </div>
      );
    }
    return <Component period={period} />;
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="customizable-dashboard">
      {/* Toolbar */}
      <div className={`dashboard-toolbar ${isEditMode ? 'edit-mode' : ''}`}>
        <div className="toolbar-left">
          <h1 className="dashboard-title">
            <LayoutGrid size={28} />
            {t('title')}
          </h1>
          {isEditMode && <span className="edit-mode-badge">{t('editMode')}</span>}
        </div>

        <div className="toolbar-center">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="period-select"
            disabled={isEditMode}
          >
            <option value="today">{t('periods.today')}</option>
            <option value="yesterday">{t('periods.yesterday')}</option>
            <option value="last_7_days">{t('periods.last_7_days')}</option>
            <option value="last_30_days">{t('periods.last_30_days')}</option>
            <option value="last_90_days">{t('periods.last_90_days')}</option>
            <option value="this_month">{t('periods.this_month')}</option>
            <option value="this_year">{t('periods.this_year')}</option>
          </select>
        </div>

        <div className="toolbar-right">
          {!isEditMode ? (
            <>
              <button
                onClick={() => window.location.reload()}
                className="toolbar-btn"
                title={t('refresh')}
              >
                <RefreshCw size={18} />
              </button>

              <button
                onClick={toggleEditMode}
                className="toolbar-btn toolbar-btn-primary"
              >
                <Edit3 size={18} />
                {t('customize')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsLibraryOpen(true)}
                className="toolbar-btn toolbar-btn-secondary"
              >
                <Plus size={18} />
                {t('addWidget')}
              </button>

              <button
                onClick={toggleEditMode}
                className="toolbar-btn"
              >
                <Eye size={18} />
                {t('preview')}
              </button>

              <button
                onClick={handleSaveLayout}
                disabled={isSaving || !hasChanges}
                className="toolbar-btn toolbar-btn-success"
              >
                <Save size={18} />
                {isSaving ? t('saving') : hasChanges ? t('save') : t('saved')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit mode hint */}
      {isEditMode && (
        <div className="edit-mode-hint">
          <Settings size={20} className="hint-icon" />
          <span>{t('editHint')}</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="dashboard-content">
        <ResponsiveGridLayout
          key={gridKey}
          className="dashboard-grid"
          layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}
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
          {layout.map((item) => (
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
        {layout.length === 0 && (
          <div className="dashboard-empty">
            <LayoutGrid size={80} className="empty-icon" />
            <h2>{t('emptyState.title')}</h2>
            <p>{t('emptyState.description')}</p>
            <button
              onClick={() => {
                setIsEditMode(true);
                setIsLibraryOpen(true);
              }}
              className="toolbar-btn toolbar-btn-primary toolbar-btn-large"
            >
              <Plus size={20} />
              {t('emptyState.button')}
            </button>
          </div>
        )}
      </div>

      {/* Widget Library Modal */}
      {isLibraryOpen && (
        <WidgetLibrary
          availableWidgets={availableWidgets}
          currentWidgets={layout.map(item => item.i)}
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
    </div>
  );
};

export default CustomizableDashboard;
