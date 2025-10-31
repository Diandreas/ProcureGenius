import React, { useState, useEffect } from 'react';
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
    const loadDefaultLayout = async () => {
      setIsLoading(true);
      try {
        const response = await widgetsAPI.getDefaultLayout();
        if (response.success && response.data) {
          setLayout(response.data.layout || []);
          setCurrentLayoutId(response.data.id);
        } else {
          // No default layout, show all widgets
          const defaultLayout = [
            { i: 'financial_summary', x: 0, y: 0, w: 4, h: 2 },
            { i: 'invoices_overview', x: 0, y: 2, w: 2, h: 2 },
            { i: 'po_overview', x: 2, y: 2, w: 2, h: 2 },
            { i: 'clients_overview', x: 0, y: 4, w: 2, h: 2 },
            { i: 'products_overview', x: 2, y: 4, w: 2, h: 2 },
            { i: 'revenue_chart', x: 0, y: 6, w: 3, h: 2 },
            { i: 'alerts_notifications', x: 3, y: 6, w: 1, h: 2 },
            { i: 'top_clients', x: 0, y: 8, w: 4, h: 2 },
          ];
          setLayout(defaultLayout);
        }
      } catch (error) {
        console.error('Error loading default layout:', error);
        // Show all widgets on error too
        setLayout([
          { i: 'financial_summary', x: 0, y: 0, w: 4, h: 2 },
          { i: 'invoices_overview', x: 0, y: 2, w: 2, h: 2 },
          { i: 'po_overview', x: 2, y: 2, w: 2, h: 2 },
          { i: 'clients_overview', x: 0, y: 4, w: 2, h: 2 },
          { i: 'products_overview', x: 2, y: 4, w: 2, h: 2 },
          { i: 'revenue_chart', x: 0, y: 6, w: 3, h: 2 },
          { i: 'alerts_notifications', x: 3, y: 6, w: 1, h: 2 },
          { i: 'top_clients', x: 0, y: 8, w: 4, h: 2 },
        ]);
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
    setLayout(layout.filter(item => item.i !== widgetCode));
    setHasChanges(true);
  };

  // Save layout
  const handleSaveLayout = async () => {
    setIsSaving(true);
    try {
      if (currentLayoutId) {
        await widgetsAPI.patchLayout(currentLayoutId, { layout });
      } else {
        const response = await widgetsAPI.createLayout({
          name: 'Mon Dashboard',
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
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditMode && hasChanges) {
      if (window.confirm('Voulez-vous sauvegarder vos modifications?')) {
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
          <p>Widget "{widgetCode}" en développement</p>
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
            Dashboard
          </h1>
          {isEditMode && <span className="edit-mode-badge">Mode Édition</span>}
        </div>

        <div className="toolbar-center">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="period-select"
            disabled={isEditMode}
          >
            <option value="today">Aujourd'hui</option>
            <option value="yesterday">Hier</option>
            <option value="last_7_days">7 derniers jours</option>
            <option value="last_30_days">30 derniers jours</option>
            <option value="last_90_days">90 derniers jours</option>
            <option value="this_month">Ce mois</option>
            <option value="this_year">Cette année</option>
          </select>
        </div>

        <div className="toolbar-right">
          {!isEditMode ? (
            <>
              <button
                onClick={() => window.location.reload()}
                className="toolbar-btn"
                title="Rafraîchir"
              >
                <RefreshCw size={18} />
              </button>

              <button
                onClick={toggleEditMode}
                className="toolbar-btn toolbar-btn-primary"
              >
                <Edit3 size={18} />
                Personnaliser
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsLibraryOpen(true)}
                className="toolbar-btn toolbar-btn-secondary"
              >
                <Plus size={18} />
                Ajouter Widget
              </button>

              <button
                onClick={toggleEditMode}
                className="toolbar-btn"
              >
                <Eye size={18} />
                Aperçu
              </button>

              <button
                onClick={handleSaveLayout}
                disabled={isSaving || !hasChanges}
                className="toolbar-btn toolbar-btn-success"
              >
                <Save size={18} />
                {isSaving ? 'Sauvegarde...' : hasChanges ? 'Sauvegarder' : 'Sauvegardé'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit mode hint */}
      {isEditMode && (
        <div className="edit-mode-hint">
          <Settings size={20} className="hint-icon" />
          <span>Glissez-déposez les widgets pour les réorganiser, tirez les coins pour les redimensionner</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="dashboard-content">
        <ResponsiveGridLayout
          className="dashboard-grid"
          layouts={{ lg: layout }}
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
            <h2>Votre dashboard est vide</h2>
            <p>Commencez par ajouter des widgets pour visualiser vos données</p>
            <button
              onClick={() => {
                setIsEditMode(true);
                setIsLibraryOpen(true);
              }}
              className="toolbar-btn toolbar-btn-primary toolbar-btn-large"
            >
              <Plus size={20} />
              Ajouter mon premier widget
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
          <span>Dashboard sauvegardé avec succès!</span>
        </div>
      )}
    </div>
  );
};

export default CustomizableDashboard;
