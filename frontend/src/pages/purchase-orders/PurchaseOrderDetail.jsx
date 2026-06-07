import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
  Tooltip,
  Stack,
  LinearProgress,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Edit,
  Delete,
  Print,
  Email,
  CheckCircle,
  Schedule,
  Warning,
  Block,
  ArrowBack,
  MoreVert,
  AttachMoney,
  Business,
  Person,
  CalendarToday,
  Receipt,
  Add,
  Remove,
  Download,
  Send,
  Done,
  PictureAsPdf,
  Info,
  Inventory,
  LocalShipping,
  Payment,
  Psychology,
  SearchOutlined,
  BugReport,
  OpenInNew,
  Refresh,
  TrendingDown,
  CheckCircleOutline,
  ErrorOutline,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { aiChatAPI } from '../../services/api';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/config';
import { purchaseOrdersAPI } from '../../services/api';
import { settingsAPI } from '../../services/settingsAPI';
import { getStatusColor, getStatusLabel, formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import { generatePurchaseOrderPDF, downloadPDF, openPDFInNewTab, TEMPLATE_TYPES } from '../../services/pdfService';
import { useHeader } from '../../contexts/HeaderContext';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import { NeumorphicPanel, neuShadows } from '../../components/neumorphic/NeumorphicList';

function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['purchaseOrders', 'common']);
  const { format: formatCurrency } = useCurrency();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATE_TYPES.CLASSIC);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [settings, setSettings] = useState(null);
  const [emailData, setEmailData] = useState({
    recipient_email: '',
    custom_message: ''
  });
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit_price: 0,
    product_reference: ''
  });

  // AI Panel state
  const [aiResults, setAiResults] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [aiConversations, setAiConversations] = useState({});
  const [aiInputs, setAiInputs] = useState({});

  const { setPageHeader } = useHeader();

  useEffect(() => {
    fetchPurchaseOrder();
  }, [id]);

  // Update Global Header
  useEffect(() => {
    if (purchaseOrder) {
      setPageHeader({
        title: isMobile ? purchaseOrder.po_number : '',
        showTitle: isMobile,
        actions: isMobile ? (
          <Stack direction="row" spacing={0.5}>
            <IconButton
              onClick={() => setPdfDialogOpen(true)}
              size="small"
              sx={{ color: 'primary.main' }}
            >
              <PictureAsPdf fontSize="small" />
            </IconButton>
            <IconButton
              onClick={() => {
                const currentLanguage = i18n.language || 'fr';
                const lang = currentLanguage.split('-')[0];
                const defaultMessage = t('purchaseOrders:dialogs.sendEmail.defaultMessage', {
                  name: purchaseOrder.supplier?.name || (lang === 'en' ? 'Supplier' : 'Fournisseur'),
                  number: purchaseOrder.po_number
                });
                setEmailData({
                  recipient_email: purchaseOrder.supplier?.email || '',
                  custom_message: defaultMessage
                });
                setSendEmailDialogOpen(true);
              }}
              disabled={!purchaseOrder.supplier?.email}
              size="small"
              sx={{ color: 'info.main' }}
            >
              <Email fontSize="small" />
            </IconButton>
            <IconButton
              onClick={handleEdit}
              size="small"
              sx={{ color: 'grey.700' }}
            >
              <Edit fontSize="small" />
            </IconButton>
            {purchaseOrder.status === 'draft' && (
              <IconButton
                onClick={() => setApproveDialogOpen(true)}
                size="small"
                sx={{ color: 'success.main' }}
              >
                <Done fontSize="small" />
              </IconButton>
            )}
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          </Stack>
        ) : null
      });
    }
    
    return () => setPageHeader(null);
  }, [purchaseOrder, isMobile, id, t]);

  // Charger les paramètres d'organisation pour détecter le format thermal
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsAPI.getAll();
        setSettings(response.data);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const fetchPurchaseOrder = async () => {
    setLoading(true);
    try {
      const response = await purchaseOrdersAPI.get(id);
      setPurchaseOrder(response.data);
      if (response.data.ai_insights) {
        setAiResults(response.data.ai_insights.results || {});
        setAiConversations(response.data.ai_insights.conversations || {});
      }
    } catch (error) {
      enqueueSnackbar(t('purchaseOrders:messages.loadingError'), { variant: 'error' });
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const runAiAnalysis = async (type, isFollowUp = false) => {
    if (!isFollowUp) {
      setAiLoading(prev => ({ ...prev, [type]: true }));
    } else {
      setAiLoading(prev => ({ ...prev, [type]: true }));
      setAiResults(prev => ({ 
        ...prev, 
        [type]: (prev[type] || '') + `\n\n**Vous :**\n${aiInputs[type]}`
      }));
    }

    const itemsList = purchaseOrder.items?.map(i =>
      `- ${i.description} (qté: ${i.quantity}, prix unitaire: ${i.unit_price}, total: ${i.total_price})`
    ).join('\n') || 'Aucun article';

    const prompts = {
      anomalies: `Analyse ce bon de commande et détecte les anomalies éventuelles. Sois direct et simple.

Bon de commande: ${purchaseOrder.po_number}
Fournisseur: ${purchaseOrder.supplier?.name || 'Non défini'}
Total: ${purchaseOrder.total_amount}
Date limite: ${purchaseOrder.required_date || 'Non définie'}
Articles:
${itemsList}

Dis-moi : est-ce que tu vois quelque chose d'anormal ? Prix trop élevés, quantités bizarres, délais serrés ? Réponds en 3-5 points courts.`,

      advice: `Donne des conseils pratiques pour ce bon de commande. Parle simplement.

Bon de commande: ${purchaseOrder.po_number}
Fournisseur: ${purchaseOrder.supplier?.name || 'Non défini'}
Statut: ${purchaseOrder.status}
Total: ${purchaseOrder.total_amount}
Articles:
${itemsList}

Donne 3 conseils concrets pour améliorer ou sécuriser cette commande.`,

      market_price: `Recherche les prix du marché pour ces produits. 
IMPORTANT: Si tu n'as pas un accès direct à internet pour chercher des liens en direct, NE FOURNIS PAS DE LIENS INVENTÉS OU MORTS. Donne uniquement des estimations réalistes basées sur tes connaissances. Ne donne absolument pas de faux URLs.
N'utilise PAS la fonction/outil interne "verify_price" car il y a plusieurs articles.

Articles de la commande:
${itemsList}

Pour chaque produit : donne le prix moyen du marché estimé et indique si le prix payé est correct, bas ou trop élevé.`,
    };

    try {
      const payload = {
        message: isFollowUp ? aiInputs[type] : prompts[type],
        context_type: 'purchase_order',
        context_id: id,
      };

      if (aiConversations[type]) {
        payload.conversation_id = aiConversations[type];
      }

      const response = await aiChatAPI.sendMessage(payload);
      
      let rawReply = response.data?.ai_response || response.data?.response || response.data?.message?.content || response.data?.content || response.data;
      let reply = rawReply;
      if (typeof reply !== 'string') {
        reply = reply && typeof reply === 'object' && reply.content ? reply.content : JSON.stringify(reply, null, 2);
      }
      
      let newConversations = { ...aiConversations };
      if (response.data?.conversation_id) {
        newConversations[type] = response.data.conversation_id;
        setAiConversations(newConversations);
      }

      let newResults = { ...aiResults };
      if (isFollowUp) {
        newResults[type] = newResults[type] + `\n\n**Aunlia :**\n${reply}`;
        setAiInputs(prev => ({ ...prev, [type]: '' }));
      } else {
        newResults[type] = reply;
      }
      setAiResults(newResults);

      // Persist in backend
      purchaseOrdersAPI.update(id, { 
        ai_insights: { results: newResults, conversations: newConversations } 
      }).catch(e => console.error('Failed to save AI insights:', e));

    } catch (error) {
      const errorMsg = `Erreur: ${error.response?.data?.error || error.message}`;
      if (isFollowUp) {
        setAiResults(prev => ({ ...prev, [type]: prev[type] + `\n\n*${errorMsg}*` }));
      } else {
        setAiResults(prev => ({ ...prev, [type]: errorMsg }));
      }
    } finally {
      setAiLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleAiInputKeyPress = (e, type) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (aiInputs[type]?.trim()) {
        runAiAnalysis(type, true);
      }
    }
  };

  const handleEdit = () => {
    navigate(`/purchase-orders/${id}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm(t('purchaseOrders:messages.confirmDelete'))) {
      try {
        await purchaseOrdersAPI.delete(id);
        enqueueSnackbar(t('purchaseOrders:messages.poDeletedSuccess'), { variant: 'success' });
        navigate('/purchase-orders');
      } catch (error) {
        enqueueSnackbar(t('purchaseOrders:messages.deleteError'), { variant: 'error' });
      }
    }
  };

  const handleApprove = async () => {
    try {
      const response = await purchaseOrdersAPI.approve(id);
      setPurchaseOrder(response.data);
      enqueueSnackbar(t('purchaseOrders:messages.poApprovedSuccess'), { variant: 'success' });
      setApproveDialogOpen(false);
    } catch (error) {
      enqueueSnackbar(t('purchaseOrders:messages.approvalError'), { variant: 'error' });
    }
  };

  const handleConvertToInvoice = async () => {
    try {
      const response = await purchaseOrdersAPI.convertToInvoice(id);
      const invoiceId = response.data?.invoice?.id;
      enqueueSnackbar(
        response.data?.message || 'Facture créée à partir du bon de commande.',
        { variant: 'success' }
      );
      await fetchPurchaseOrder();
      if (invoiceId) {
        navigate(`/invoices/${invoiceId}`);
      }
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.error || 'Erreur lors de la conversion en facture.',
        { variant: 'error' }
      );
    }
  };

  const handleAddItem = async () => {
    try {
      const response = await purchaseOrdersAPI.addItem(id, newItem);
      await fetchPurchaseOrder(); // Reload to get updated totals
      enqueueSnackbar(t('purchaseOrders:messages.itemAddedSuccess'), { variant: 'success' });
      setAddItemDialogOpen(false);
      setNewItem({ description: '', quantity: 1, unit_price: 0, product_reference: '' });
    } catch (error) {
      enqueueSnackbar(t('purchaseOrders:messages.itemAddError'), { variant: 'error' });
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.recipient_email) {
      enqueueSnackbar(t('purchaseOrders:messages.emailRequired') || 'Email destinataire requis', { variant: 'error' });
      return;
    }

    setSendingEmail(true);
    try {
      // Récupérer la langue actuelle depuis i18n
      const currentLanguage = i18n.language || 'fr';
      const language = currentLanguage.split('-')[0]; // 'en-US' -> 'en'
      
      const response = await purchaseOrdersAPI.sendEmail(id, {
        recipient_email: emailData.recipient_email,
        custom_message: emailData.custom_message || undefined,
        template: selectedTemplate,
        language: language
      });
      setPurchaseOrder(response.data.purchase_order || response.data);
      enqueueSnackbar(response.data.message || t('purchaseOrders:messages.emailSent') || 'Email envoyé avec succès', { variant: 'success' });
      setSendEmailDialogOpen(false);
      setEmailData({ recipient_email: '', custom_message: '' });
      await fetchPurchaseOrder(); // Refresh to show updated sent_at date
    } catch (error) {
      console.error('Error sending email:', error);
      enqueueSnackbar(
        error.response?.data?.error || t('purchaseOrders:messages.emailError') || 'Erreur lors de l\'envoi de l\'email',
        { variant: 'error' }
      );
    } finally {
      setSendingEmail(false);
    }
  };

  const handleGeneratePDF = async (action = 'download') => {
    setGeneratingPdf(true);
    try {
      const pdfBlob = await generatePurchaseOrderPDF(purchaseOrder, selectedTemplate);

      if (action === 'download') {
        await downloadPDF(pdfBlob, `bon-commande-${purchaseOrder.po_number}.pdf`);
        enqueueSnackbar(t('purchaseOrders:messages.pdfDownloadedSuccess'), { variant: 'success' });
      } else if (action === 'preview') {
        await openPDFInNewTab(pdfBlob, `bon-commande-${purchaseOrder.po_number}.pdf`);
      } else if (action === 'print') {
        // Ouvrir le PDF dans une nouvelle fenêtre et déclencher l'impression
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const printWindow = window.open(pdfUrl, '_blank');

        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
            // Libérer l'URL après impression
            setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
          };
          enqueueSnackbar(t('purchaseOrders:messages.printWindowOpened'), { variant: 'success' });
        } else {
          enqueueSnackbar(t('purchaseOrders:messages.printWindowError'), { variant: 'error' });
        }
      }

      setPdfDialogOpen(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      enqueueSnackbar(t('purchaseOrders:messages.pdfGenerationError'), { variant: 'error' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: <Edit color="action" />,
      pending: <Schedule color="warning" />,
      approved: <CheckCircle color="success" />,
      sent: <Send color="info" />,
      received: <CheckCircle color="success" />,
      cancelled: <Block color="error" />,
    };
    return icons[status] || null;
  };

  if (loading) {
    return <LoadingState message={t('purchaseOrders:messages.loading', 'Chargement du bon de commande...')} />;
  }

  if (!purchaseOrder) {
    return (
      <ErrorState
        title={t('purchaseOrders:messages.poNotFound', 'Bon de commande non trouvé')}
        message={t('purchaseOrders:messages.poNotFoundDescription', 'Le bon de commande que vous recherchez n\'existe pas ou a été supprimé.')}
        showHome={false}
        onRetry={() => navigate('/purchase-orders')}
      />
    );
  }

  // Onglets (icône seule sur mobile, icône + label desktop)
  const PO_TABS = [
    { icon: Info, label: t('purchaseOrders:tabs.general') },
    { icon: Inventory, label: t('purchaseOrders:tabs.items') },
    { icon: AttachMoney, label: t('purchaseOrders:tabs.financial') },
    { icon: Psychology, label: 'Analyse IA' },
  ];

  return (
    <Box sx={{
      p: { xs: 0, sm: 2, md: 3 },
      pb: isMobile ? 12 : 3, // Space for mobile nav
      bgcolor: 'background.default',
      minHeight: '100vh'
    }}>
      {/* Header - Caché sur mobile (géré par top navbar) */}
      <Box sx={{ mb: 3, display: { xs: 'none', md: 'block' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <IconButton onClick={() => navigate('/purchase-orders')} size="medium">
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold" sx={{ flex: 1, minWidth: 'fit-content' }}>
            {purchaseOrder.po_number}
          </Typography>
          <Chip
            icon={getStatusIcon(purchaseOrder.status)}
            label={getStatusLabel(purchaseOrder.status)}
            color={getStatusColor(purchaseOrder.status)}
            size="medium"
          />
          {(
            <>
              <Tooltip title={t('purchaseOrders:tooltips.generatePDF')}>
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdf />}
                  onClick={() => setPdfDialogOpen(true)}
                >
                  {t('purchaseOrders:buttons.generatePDF')}
                </Button>
              </Tooltip>
              <Tooltip
                title={
                  !purchaseOrder.supplier?.email
                    ? t('purchaseOrders:tooltips.noSupplierEmail', 'Le fournisseur n\'a pas d\'adresse email')
                    : t('purchaseOrders:tooltips.sendEmail')
                }
                arrow
              >
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<Email />}
                    onClick={() => {
                      const currentLanguage = i18n.language || 'fr';
                      const lang = currentLanguage.split('-')[0];
                      const defaultMessage = t('purchaseOrders:dialogs.sendEmail.defaultMessage', {
                        name: purchaseOrder.supplier?.name || (lang === 'en' ? 'Supplier' : 'Fournisseur'),
                        number: purchaseOrder.po_number
                      });
                      setEmailData({
                        recipient_email: purchaseOrder.supplier?.email || '',
                        custom_message: defaultMessage
                      });
                      setSendEmailDialogOpen(true);
                    }}
                    disabled={!purchaseOrder.supplier?.email}
                  >
                    {t('purchaseOrders:buttons.sendEmail')}
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={t('purchaseOrders:tooltips.editPO')}>
                <IconButton
                  onClick={handleEdit}
                  sx={{
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.light',
                      color: 'white',
                    }
                  }}
                >
                  <Edit />
                </IconButton>
              </Tooltip>
              {purchaseOrder.status === 'draft' && (
                <Tooltip title={t('purchaseOrders:tooltips.approvePO')}>
                  <Button
                    variant="contained"
                    startIcon={<Done />}
                    onClick={() => setApproveDialogOpen(true)}
                    color="success"
                  >
                    {t('purchaseOrders:buttons.approve')}
                  </Button>
                </Tooltip>
              )}
            </>
          )}
          <Tooltip title={t('common:buttons.moreActions')}>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVert />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            {isMobile && (
              <>
                <MenuItem onClick={() => setPdfDialogOpen(true)}>
                  <PictureAsPdf fontSize="small" sx={{ mr: 1 }} />
                  {t('purchaseOrders:buttons.generatePDF')}
                </MenuItem>
                <Tooltip
                  title={
                    !purchaseOrder.supplier?.email
                      ? t('purchaseOrders:tooltips.noSupplierEmail', 'Le fournisseur n\'a pas d\'adresse email')
                      : ''
                  }
                  arrow
                  placement="left"
                >
                  <span>
                    <MenuItem
                      onClick={() => {
                        const defaultMessage = t('purchaseOrders:dialogs.sendEmail.defaultMessage', {
                          name: purchaseOrder.supplier?.name || 'Fournisseur',
                          number: purchaseOrder.po_number
                        });
                        setEmailData({
                          recipient_email: purchaseOrder.supplier?.email || '',
                          custom_message: defaultMessage
                        });
                        setSendEmailDialogOpen(true);
                      }}
                      disabled={!purchaseOrder.supplier?.email}
                    >
                      <Email fontSize="small" sx={{ mr: 1 }} />
                      {t('purchaseOrders:buttons.sendEmail')}
                    </MenuItem>
                  </span>
                </Tooltip>
                <MenuItem onClick={handleEdit}>
                  <Edit fontSize="small" sx={{ mr: 1 }} />
                  {t('purchaseOrders:buttons.edit')}
                </MenuItem>
                {purchaseOrder.status === 'draft' && (
                  <MenuItem onClick={() => setApproveDialogOpen(true)} sx={{ color: 'success.main' }}>
                    <Done fontSize="small" sx={{ mr: 1 }} />
                    {t('purchaseOrders:buttons.approve')}
                  </MenuItem>
                )}
                {['approved', 'sent', 'received'].includes(purchaseOrder.status) && (
                  <MenuItem onClick={handleConvertToInvoice} sx={{ color: 'primary.main' }}>
                    <Receipt fontSize="small" sx={{ mr: 1 }} />
                    Convertir en facture
                  </MenuItem>
                )}
                <Divider />
              </>
            )}
            <MenuItem onClick={() => setAddItemDialogOpen(true)}>
              <Add fontSize="small" sx={{ mr: 1 }} />
              {t('purchaseOrders:buttons.addItem')}
            </MenuItem>
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <Delete fontSize="small" sx={{ mr: 1 }} />
              {t('purchaseOrders:buttons.delete')}
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Actions Mobile - Affiché uniquement sur mobile */}
      <Box sx={{ mb: 2, display: { xs: 'flex', md: 'none' }, justifyContent: 'flex-end', gap: 1, alignItems: 'center' }}>
        <Chip
          icon={getStatusIcon(purchaseOrder.status)}
          label={getStatusLabel(purchaseOrder.status)}
          color={getStatusColor(purchaseOrder.status)}
          size="small"
        />
        <Tooltip title={t('purchaseOrders:tooltips.generatePDF')}>
          <IconButton
            onClick={() => setPdfDialogOpen(true)}
            size="small"
            sx={{ color: 'success.main' }}
          >
            <PictureAsPdf />
          </IconButton>
        </Tooltip>
        <Tooltip
          title={
            !purchaseOrder.supplier?.email
              ? t('purchaseOrders:tooltips.noSupplierEmail', 'Le fournisseur n\'a pas d\'adresse email')
              : t('purchaseOrders:tooltips.sendEmail')
          }
        >
          <span>
            <IconButton
              onClick={() => {
                const currentLanguage = i18n.language || 'fr';
                const lang = currentLanguage.split('-')[0];
                const defaultMessage = t('purchaseOrders:dialogs.sendEmail.defaultMessage', {
                  name: purchaseOrder.supplier?.name || (lang === 'en' ? 'Supplier' : 'Fournisseur'),
                  number: purchaseOrder.po_number
                });
                setEmailData({
                  recipient_email: purchaseOrder.supplier?.email || '',
                  custom_message: defaultMessage
                });
                setSendEmailDialogOpen(true);
              }}
              disabled={!purchaseOrder.supplier?.email}
              size="small"
              sx={{ color: 'info.main' }}
            >
              <Email />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('purchaseOrders:tooltips.editPO')}>
          <IconButton
            onClick={handleEdit}
            size="small"
            sx={{ color: 'primary.main' }}
          >
            <Edit />
          </IconButton>
        </Tooltip>
        {purchaseOrder.status === 'draft' && (
          <Tooltip title={t('purchaseOrders:tooltips.approvePO')}>
            <IconButton
              onClick={() => setApproveDialogOpen(true)}
              size="small"
              sx={{ color: 'success.main' }}
            >
              <Done />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={t('common:buttons.moreActions')}>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
            <MoreVert />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Onglets segmentés neumorphiques (icônes seules sur mobile) */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            gap: isMobile ? 0.5 : 1,
            p: isMobile ? 0.5 : 0.75,
            borderRadius: 3,
            boxShadow: th => neuShadows.shadowInset(th),
            bgcolor: 'background.default',
            overflowX: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
          }}
        >
          {PO_TABS.map((tab, idx) => {
            const TabIcon = tab.icon;
            const selected = activeTab === idx;
            return (
              <Tooltip key={idx} title={isMobile ? tab.label : ''} arrow disableHoverListener={!isMobile}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  aria-label={tab.label}
                  aria-selected={selected}
                  sx={{
                    flex: isMobile ? '0 0 auto' : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isMobile ? 0 : 0.75,
                    minWidth: isMobile ? 44 : 0,
                    px: isMobile ? 0 : 2,
                    py: isMobile ? 1 : 1.1,
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 2.25,
                    fontFamily: 'inherit',
                    fontSize: '0.82rem',
                    fontWeight: selected ? 700 : 500,
                    whiteSpace: 'nowrap',
                    color: selected ? 'primary.main' : 'text.secondary',
                    bgcolor: selected ? 'background.paper' : 'transparent',
                    boxShadow: selected ? (th => neuShadows.shadowRaisedSm(th)) : 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': { color: selected ? 'primary.main' : 'text.primary' },
                  }}
                >
                  <TabIcon sx={{ fontSize: isMobile ? 20 : 18, color: selected ? 'primary.main' : 'inherit' }} />
                  {!isMobile && tab.label}
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>

      {/* Tab: General Information */}
      {activeTab === 0 && (
        <Grid container spacing={isMobile ? 1.5 : 2.5}>
          {/* Résumé compact — pleine largeur */}
          <Grid item xs={12}>
            <NeumorphicPanel accent="primary.main" sx={{ p: isMobile ? 1.5 : 2 }}>
              {/* Ligne 1 : Fournisseur + Dates + Créé par */}
              <Box sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  mb: (purchaseOrder.title || purchaseOrder.description) ? 1.5 : 0,
                }}>
                  {/* Fournisseur */}
                  <Box sx={{
                    flex: '1 1 200px',
                    p: 1.5,
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    display: 'flex', flexDirection: 'column', gap: 0.5,
                  }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t('purchaseOrders:labels.supplier')}
                    </Typography>
                    {purchaseOrder.supplier ? (
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                        onClick={() => navigate(`/suppliers/${purchaseOrder.supplier.id}`)}
                      >
                        <Avatar sx={{ bgcolor: 'primary.main', width: 26, height: 26, fontSize: '0.7rem' }}>
                          {purchaseOrder.supplier.name?.[0]?.toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600} sx={{ color: 'primary.main', '&:hover': { textDecoration: 'underline' }, lineHeight: 1.2 }}>
                            {purchaseOrder.supplier.name}
                          </Typography>
                          {purchaseOrder.supplier.email && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{purchaseOrder.supplier.email}</Typography>
                          )}
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </Box>

                  {/* Date création */}
                  <Box sx={{ flex: '0 1 140px', p: 1.5, borderRight: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.25 }}>
                      {t('purchaseOrders:labels.creationDate')}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>{formatDate(purchaseOrder.created_at)}</Typography>
                  </Box>

                  {/* Date requise */}
                  {purchaseOrder.required_date && (
                    <Box sx={{ flex: '0 1 140px', p: 1.5, borderRight: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.25 }}>
                        {t('purchaseOrders:labels.requiredDate')}
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color="warning.main">{formatDate(purchaseOrder.required_date)}</Typography>
                    </Box>
                  )}

                  {/* Créé par */}
                  {purchaseOrder.created_by && (
                    <Box sx={{ flex: '0 1 160px', p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.25 }}>
                        {t('purchaseOrders:labels.createdBy')}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Avatar sx={{ bgcolor: 'secondary.main', width: 22, height: 22, fontSize: '0.6rem' }}>
                          {purchaseOrder.created_by.first_name?.[0]}{purchaseOrder.created_by.last_name?.[0]}
                        </Avatar>
                        <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.8rem' }}>
                          {purchaseOrder.created_by.first_name} {purchaseOrder.created_by.last_name}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* Description — seulement si présente, inline sous la fiche */}
                {(purchaseOrder.title || purchaseOrder.description) && (
                  <Box sx={{ px: 0.5 }}>
                    {purchaseOrder.title && (
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.25, color: 'text.primary' }}>
                        {purchaseOrder.title}
                      </Typography>
                    )}
                    {purchaseOrder.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                        {purchaseOrder.description}
                      </Typography>
                    )}
                  </Box>
                )}
            </NeumorphicPanel>
          </Grid>

          {/* Articles — pleine largeur sous le résumé */}
          <Grid item xs={12}>
            <NeumorphicPanel sx={{ p: isMobile ? 2 : 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Inventory color="primary" fontSize="small" />
                    {t('purchaseOrders:labels.orderedItems')} ({purchaseOrder.items?.length || 0})
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => setAddItemDialogOpen(true)}
                    disabled={purchaseOrder.status !== 'draft'}
                    sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('purchaseOrders:buttons.addItem')}
                  </Button>
                </Box>
                {isMobile ? (
                  <Stack spacing={1.5}>
                    {purchaseOrder.items?.map((item, index) => (
                      <Box key={index} sx={{
                        p: 1.5, borderRadius: 1.5,
                        bgcolor: theme => alpha(theme.palette.primary.main, 0.04),
                        border: '1px solid',
                        borderColor: theme => alpha(theme.palette.divider, 0.15),
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>{item.description}</Typography>
                          <Typography variant="body2" fontWeight={700} color="primary.main">
                            {formatCurrency(item.total_price)}
                          </Typography>
                        </Box>
                        {item.product_reference && (
                          <Typography variant="caption" color="text.secondary">{item.product_reference}</Typography>
                        )}
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                          {item.quantity} × {formatCurrency(item.unit_price)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <TableContainer sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{t('purchaseOrders:columns.reference')}</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{t('purchaseOrders:columns.description')}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{t('purchaseOrders:columns.quantity')}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{t('purchaseOrders:columns.unitPrice')}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{t('purchaseOrders:columns.total')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {purchaseOrder.items?.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{item.product_reference || '—'}</TableCell>
                            <TableCell sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.description}</TableCell>
                            <TableCell align="right" sx={{ fontSize: '0.85rem' }}>{item.quantity}</TableCell>
                            <TableCell align="right" sx={{ fontSize: '0.85rem' }}>{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatCurrency(item.total_price)}</TableCell>
                          </TableRow>
                        ))}
                        {(!purchaseOrder.items || purchaseOrder.items.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                              Aucun article
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {/* Totaux */}
                {purchaseOrder.items?.length > 0 && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Box sx={{ minWidth: 220 }}>
                      {purchaseOrder.tax_amount > 0 && (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">Sous-total</Typography>
                            <Typography variant="body2">{formatCurrency(purchaseOrder.subtotal || 0)}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">Taxes</Typography>
                            <Typography variant="body2">{formatCurrency(purchaseOrder.tax_amount || 0)}</Typography>
                          </Box>
                          <Divider sx={{ mb: 1 }} />
                        </>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" fontWeight={700}>Total</Typography>
                        <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                          {formatCurrency(purchaseOrder.total_amount || 0)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
            </NeumorphicPanel>
          </Grid>
        </Grid>
      )}

      {/* Tab: Items */}
      {activeTab === 1 && (
        <Box>
          <NeumorphicPanel sx={{ p: isMobile ? 2 : 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Inventory color="primary" />
                  {t('purchaseOrders:labels.orderedItems')}
                </Typography>
                {!isMobile && (
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => setAddItemDialogOpen(true)}
                    disabled={purchaseOrder.status !== 'draft'}
                  >
                    {t('purchaseOrders:buttons.addItem')}
                  </Button>
                )}
              </Box>
              {isMobile ? (
                // Mobile Card View
                <Box>
                  {purchaseOrder.items?.map((item, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                          {item.description}
                        </Typography>
                        {item.product_reference && (
                          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            {t('purchaseOrders:columns.reference')}: {item.product_reference}
                          </Typography>
                        )}
                        <Divider sx={{ my: 1 }} />
                        <Grid container spacing={1}>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">
                              {t('purchaseOrders:columns.quantity')}
                            </Typography>
                            <Typography variant="body2" fontWeight="500">
                              {item.quantity}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">
                              {t('purchaseOrders:columns.unitPrice')}
                            </Typography>
                            <Typography variant="body2" fontWeight="500">
                              {formatCurrency(item.unit_price)}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">
                              {t('purchaseOrders:columns.total')}
                            </Typography>
                            <Typography variant="body2" fontWeight="600" color="primary.main">
                              {formatCurrency(item.total_price)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                  {(!purchaseOrder.items || purchaseOrder.items.length === 0) && (
                    <Alert severity="info">
                      {t('purchaseOrders:labels.noItemsInPO')}
                    </Alert>
                  )}
                  {isMobile && purchaseOrder.status === 'draft' && (
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={() => setAddItemDialogOpen(true)}
                      sx={{ mt: 2 }}
                    >
                      {t('purchaseOrders:buttons.addItem')}
                    </Button>
                  )}
                </Box>
              ) : (
                // Desktop Table View
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('purchaseOrders:columns.reference')}</TableCell>
                        <TableCell>{t('purchaseOrders:columns.description')}</TableCell>
                        <TableCell align="right">{t('purchaseOrders:columns.quantity')}</TableCell>
                        <TableCell align="right">{t('purchaseOrders:columns.unitPrice')}</TableCell>
                        <TableCell align="right">{t('purchaseOrders:columns.total')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {purchaseOrder.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product_reference || '-'}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      ))}
                      {(!purchaseOrder.items || purchaseOrder.items.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                            <Typography color="text.secondary">
                              {t('purchaseOrders:labels.noItemsInPO')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
          </NeumorphicPanel>
        </Box>
      )}

      {/* Tab: Financial Summary */}
      {activeTab === 2 && (
        <Box>
          <NeumorphicPanel accent="primary.main" sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant="h6" gutterBottom sx={{
                fontWeight: 700,
                mb: isMobile ? 2 : 3,
                background: theme => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {t('purchaseOrders:labels.financialSummary')}
              </Typography>
              <Grid container spacing={isMobile ? 2 : 3}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{
                    textAlign: 'center',
                    p: isMobile ? 2 : 3,
                    borderRadius: 3,
                    background: theme => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                    border: '1px solid',
                    borderColor: theme => alpha(theme.palette.primary.main, 0.2),
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme => `0 12px 28px ${alpha(theme.palette.primary.main, 0.3)}`,
                      background: theme => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`
                    },
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: theme => `linear-gradient(90deg, ${theme.palette.primary.main}, ${alpha(theme.palette.primary.light, 0.8)})`,
                      borderRadius: '3px 3px 0 0'
                    }
                  }}>
                    <AttachMoney sx={{
                      fontSize: isMobile ? 32 : 40,
                      color: 'primary.main',
                      mb: isMobile ? 1 : 1.5,
                      opacity: 0.9
                    }} />
                    <Typography variant={isMobile ? 'h5' : 'h4'} sx={{
                      fontWeight: 700,
                      mb: 1,
                      background: theme => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      {formatCurrency(purchaseOrder.subtotal || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {t('purchaseOrders:labels.subtotal')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{
                    textAlign: 'center',
                    p: isMobile ? 2 : 3,
                    borderRadius: 3,
                    background: theme => `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                    border: '1px solid',
                    borderColor: theme => alpha(theme.palette.warning.main, 0.2),
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme => `0 12px 28px ${alpha(theme.palette.warning.main, 0.3)}`,
                      background: theme => `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.15)} 0%, ${alpha(theme.palette.warning.main, 0.1)} 100%)`
                    },
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: theme => `linear-gradient(90deg, ${theme.palette.warning.main}, ${alpha(theme.palette.warning.light, 0.8)})`,
                      borderRadius: '3px 3px 0 0'
                    }
                  }}>
                    <Receipt sx={{
                      fontSize: isMobile ? 32 : 40,
                      color: 'warning.main',
                      mb: isMobile ? 1 : 1.5,
                      opacity: 0.9
                    }} />
                    <Typography variant={isMobile ? 'h5' : 'h4'} sx={{
                      fontWeight: 700,
                      mb: 1,
                      background: theme => `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      {formatCurrency(purchaseOrder.tax_amount || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {t('purchaseOrders:labels.taxes')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{
                    textAlign: 'center',
                    p: isMobile ? 2 : 3,
                    borderRadius: 3,
                    background: theme => `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                    border: '1px solid',
                    borderColor: theme => alpha(theme.palette.success.main, 0.2),
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme => `0 12px 28px ${alpha(theme.palette.success.main, 0.3)}`,
                      background: theme => `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.15)} 0%, ${alpha(theme.palette.success.main, 0.1)} 100%)`
                    },
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: theme => `linear-gradient(90deg, ${theme.palette.success.main}, ${alpha(theme.palette.success.light, 0.8)})`,
                      borderRadius: '3px 3px 0 0'
                    }
                  }}>
                    <Payment sx={{
                      fontSize: isMobile ? 32 : 40,
                      color: 'success.main',
                      mb: isMobile ? 1 : 1.5,
                      opacity: 0.9
                    }} />
                    <Typography variant={isMobile ? 'h5' : 'h4'} sx={{
                      fontWeight: 700,
                      mb: 1,
                      background: theme => `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      {formatCurrency(purchaseOrder.total_amount || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {t('purchaseOrders:labels.total')}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
          </NeumorphicPanel>
        </Box>
      )}

      {/* Tab: AI Analysis */}
      {activeTab === 3 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Laissez l'IA analyser cette commande pour vous. Cliquez sur un bouton pour lancer l'analyse.
          </Typography>
          <Grid container spacing={2}>
            {[
              {
                key: 'anomalies',
                icon: <BugReport sx={{ fontSize: 32, color: 'error.main' }} />,
                title: 'Détecter les anomalies',
                subtitle: 'Prix suspects, quantités bizarres, délais serrés',
                color: 'error',
                btnLabel: 'Analyser',
              },
              {
                key: 'advice',
                icon: <CheckCircleOutline sx={{ fontSize: 32, color: 'success.main' }} />,
                title: 'Conseils pratiques',
                subtitle: 'Comment améliorer ou sécuriser cette commande',
                color: 'success',
                btnLabel: 'Obtenir des conseils',
              },
              {
                key: 'market_price',
                icon: <TrendingDown sx={{ fontSize: 32, color: 'primary.main' }} />,
                title: 'Prix du marché en ligne',
                subtitle: 'Comparaison avec Amazon, Alibaba et autres sites',
                color: 'primary',
                btnLabel: 'Vérifier les prix',
              },
            ].map(({ key, icon, title, subtitle, color, btnLabel }) => (
              <Grid item xs={12} key={key}>
                <Card sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: theme => alpha(theme.palette[color].main, 0.2),
                  boxShadow: 'none',
                }}>
                  <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: aiResults[key] ? 2 : 0 }}>
                      {icon}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
                        <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
                      </Box>
                      <Button
                        variant={aiResults[key] ? 'outlined' : 'contained'}
                        size="small"
                        color={color}
                        disabled={aiLoading[key]}
                        startIcon={aiLoading[key] ? <CircularProgress size={16} /> : (aiResults[key] ? <Refresh fontSize="small" /> : null)}
                        onClick={() => runAiAnalysis(key)}
                        sx={{ minWidth: 130, flexShrink: 0 }}
                      >
                        {aiLoading[key] ? 'Analyse...' : (aiResults[key] ? 'Relancer' : btnLabel)}
                      </Button>
                    </Box>

                    {aiLoading[key] && (
                      <LinearProgress color={color} sx={{ borderRadius: 1, mt: 1 }} />
                    )}

                    {aiResults[key] && (
                      <Box sx={{
                        mt: 2,
                        p: 2,
                        bgcolor: theme => alpha(theme.palette[color].main, 0.05),
                        borderRadius: 2,
                        borderLeft: '3px solid',
                        borderLeftColor: `${color}.main`,
                      }}>
                        <Box sx={{ 
                          '& p': { mt: 0, mb: 1, fontSize: '0.875rem', lineHeight: 1.6 },
                          '& a': { color: 'primary.main', textDecoration: 'none', fontWeight: 500 },
                          '& a:hover': { textDecoration: 'underline' },
                          '& ul, & ol': { mt: 0, mb: 1, pl: 3 },
                          '& li': { mb: 0.5, fontSize: '0.875rem' },
                          '& h3, & h4': { mt: 2, mb: 1, fontSize: '1rem', fontWeight: 600 },
                        }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                            {String(aiResults[key] || '')}
                          </ReactMarkdown>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Discuter avec l'IA ou demander une précision..."
                            value={aiInputs[key] || ''}
                            onChange={(e) => setAiInputs(prev => ({ ...prev, [key]: e.target.value }))}
                            onKeyPress={(e) => handleAiInputKeyPress(e, key)}
                            disabled={aiLoading[key]}
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 2 } }}
                          />
                          <IconButton 
                            color="primary" 
                            onClick={() => runAiAnalysis(key, true)}
                            disabled={aiLoading[key] || !aiInputs[key]?.trim()}
                            sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) } }}
                          >
                            {aiLoading[key] ? <CircularProgress size={24} /> : <Send />}
                          </IconButton>
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)}>
        <DialogTitle>{t('purchaseOrders:dialogs.approvePO')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('purchaseOrders:messages.confirmApprove')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>{t('purchaseOrders:buttons.cancel')}</Button>
          <Button onClick={handleApprove} color="success" variant="contained">
            {t('purchaseOrders:buttons.approve')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onClose={() => setAddItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('purchaseOrders:dialogs.addItem')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('purchaseOrders:fields.productReference')}
                value={newItem.product_reference}
                onChange={(e) => setNewItem({ ...newItem, product_reference: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('purchaseOrders:fields.itemDescription')}
                required
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label={t('purchaseOrders:fields.itemQuantity')}
                type="number"
                required
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label={t('purchaseOrders:fields.itemUnitPrice')}
                type="number"
                required
                value={newItem.unit_price}
                onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemDialogOpen(false)}>{t('purchaseOrders:buttons.cancel')}</Button>
          <Button
            onClick={handleAddItem}
            variant="contained"
            disabled={!newItem.description || newItem.quantity <= 0}
          >
            {t('purchaseOrders:buttons.add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Generation Dialog */}
      <Dialog open={pdfDialogOpen} onClose={() => setPdfDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('purchaseOrders:dialogs.generatePDF')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {settings?.paperSize === 'thermal_80' || settings?.paperSize === 'thermal_58' ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  {t('purchaseOrders:messages.thermalPrintingMode', 'Format d\'impression thermique détecté. Le template de ticket thermal sera utilisé automatiquement.')}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  {settings.paperSize === 'thermal_80' ? 'Format: 80mm' : 'Format: 58mm'}
                </Typography>
              </Alert>
            ) : (
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>{t('purchaseOrders:labels.poTemplate')}</InputLabel>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  label={t('purchaseOrders:labels.poTemplate')}
                >
                  <MenuItem value={TEMPLATE_TYPES.CLASSIC}>{t('purchaseOrders:templates.classic')}</MenuItem>
                  <MenuItem value={TEMPLATE_TYPES.MODERN}>{t('purchaseOrders:templates.modern')}</MenuItem>
                  <MenuItem value={TEMPLATE_TYPES.MINIMAL}>{t('purchaseOrders:templates.minimal')}</MenuItem>
                  <MenuItem value={TEMPLATE_TYPES.PROFESSIONAL}>{t('purchaseOrders:templates.professional')}</MenuItem>
                </Select>
              </FormControl>
            )}
            <Typography variant="body2" color="text.secondary">
              {t('purchaseOrders:messages.pdfStyleInfo')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPdfDialogOpen(false)}>
            {t('purchaseOrders:buttons.cancel')}
          </Button>
          <Button
            onClick={() => handleGeneratePDF('preview')}
            variant="outlined"
            disabled={generatingPdf}
            startIcon={<PictureAsPdf />}
          >
            {t('purchaseOrders:buttons.preview')}
          </Button>
          <Button
            onClick={() => handleGeneratePDF('print')}
            variant="outlined"
            disabled={generatingPdf}
            startIcon={<Print />}
          >
            {t('purchaseOrders:buttons.print')}
          </Button>
          <Button
            onClick={() => handleGeneratePDF('download')}
            variant="contained"
            disabled={generatingPdf}
            startIcon={generatingPdf ? <CircularProgress size={20} /> : <Download />}
          >
            {generatingPdf ? t('purchaseOrders:labels.generating') : t('purchaseOrders:buttons.download')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog 
        open={sendEmailDialogOpen} 
        onClose={() => setSendEmailDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Email sx={{ color: 'primary.main' }} />
          {t('purchaseOrders:dialogs.sendEmail.title')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('purchaseOrders:dialogs.sendEmail.recipient')}
                  type="email"
                  value={emailData.recipient_email}
                  onChange={(e) => setEmailData({ ...emailData, recipient_email: e.target.value })}
                  required
                  helperText={t('purchaseOrders:dialogs.sendEmail.recipientHelp')}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t('purchaseOrders:labels.poTemplate')}</InputLabel>
                  <Select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    label={t('purchaseOrders:labels.poTemplate')}
                  >
                    <MenuItem value={TEMPLATE_TYPES.CLASSIC}>{t('purchaseOrders:templates.classic')}</MenuItem>
                    <MenuItem value={TEMPLATE_TYPES.MODERN}>{t('purchaseOrders:templates.modern')}</MenuItem>
                    <MenuItem value={TEMPLATE_TYPES.MINIMAL}>{t('purchaseOrders:templates.minimal')}</MenuItem>
                    <MenuItem value={TEMPLATE_TYPES.PROFESSIONAL}>{t('purchaseOrders:templates.professional')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('purchaseOrders:dialogs.sendEmail.message')}
                  multiline
                  rows={8}
                  value={emailData.custom_message}
                  onChange={(e) => setEmailData({ ...emailData, custom_message: e.target.value })}
                  helperText={t('purchaseOrders:dialogs.sendEmail.messageHelp')}
                  sx={{
                    '& .MuiInputBase-root': {
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => {
              setSendEmailDialogOpen(false);
              setEmailData({ recipient_email: '', custom_message: '' });
            }} 
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {t('purchaseOrders:buttons.cancel')}
          </Button>
          <Button
            onClick={handleSendEmail}
            color="primary"
            variant="contained"
            disabled={!emailData.recipient_email || sendingEmail}
            startIcon={sendingEmail ? <CircularProgress size={20} /> : <Send />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            {sendingEmail ? t('purchaseOrders:labels.sending') : t('purchaseOrders:dialogs.sendEmail.send')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PurchaseOrderDetail;