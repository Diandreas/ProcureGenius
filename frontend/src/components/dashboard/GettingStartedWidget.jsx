/**
 * GettingStartedWidget - Widget d'actions guidées pour les nouveaux utilisateurs
 * 
 * Affiche des actions recommandées basées sur les modules activés de l'utilisateur.
 * Se masque automatiquement une fois toutes les actions complétées.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    IconButton,
    LinearProgress,
    Chip,
    Grid,
    Avatar,
    Collapse,
    Tooltip,
    Stack,
    Paper,
    Divider,
    useTheme,
    alpha,
} from '@mui/material';
import {
    Business,
    People,
    ShoppingCart,
    Receipt,
    Inventory,
    CompareArrows,
    Gavel,
    CheckCircle,
    RadioButtonUnchecked,
    ArrowForward,
    Close,
    School,
    Celebration,
    KeyboardArrowDown,
    KeyboardArrowUp,
    PlayArrow,
    Refresh,
    Settings,
    Upload,
    RocketLaunch,
    Warning,
} from '@mui/icons-material';
import api from '../../services/api';
import Mascot from '../Mascot';

// Actions disponibles par module
// Note: On n'utilise plus d'endpoints séparés pour vérifier les actions
// car ils peuvent retourner 403 si le module n'est pas activé.
// On utilise plutôt le dashboard/stats qui agrège toutes les données.
const GUIDED_ACTIONS = {
    suppliers: [
        {
            id: 'add_first_supplier',
            title: 'Ajouter votre premier fournisseur',
            description: 'Créez une fiche fournisseur pour commencer à passer des commandes',
            icon: <Business />,
            route: '/suppliers/new',
            color: '#2196F3',
            priority: 1,
            statsKey: 'suppliers_count', // Clé dans dashboard/stats
        },
        {
            id: 'import_suppliers',
            title: 'Importer des fournisseurs',
            description: 'Importez vos fournisseurs depuis un fichier Excel',
            icon: <Upload />,
            route: '/suppliers?action=import',
            color: '#4CAF50',
            priority: 2,
            optional: true,
        },
    ],
    clients: [
        {
            id: 'add_first_client',
            title: 'Ajouter votre premier client',
            description: 'Enregistrez vos clients pour faciliter la facturation',
            icon: <People />,
            route: '/clients/new',
            color: '#9C27B0',
            priority: 1,
            statsKey: 'clients_count',
        },
    ],
    'purchase-orders': [
        {
            id: 'create_first_po',
            title: 'Créer un bon de commande',
            description: 'Passez votre première commande auprès d\'un fournisseur',
            icon: <ShoppingCart />,
            route: '/purchase-orders/new',
            color: '#FF9800',
            priority: 2,
            statsKey: 'purchase_orders_count',
            requires: ['add_first_supplier'],
        },
    ],
    invoices: [
        {
            id: 'create_first_invoice',
            title: 'Créer votre première facture',
            description: 'Facturez vos clients en quelques clics',
            icon: <Receipt />,
            route: '/invoices/new',
            color: '#4CAF50',
            priority: 2,
            statsKey: 'invoices_count',
        },
    ],
    products: [
        {
            id: 'add_first_product',
            title: 'Ajouter un produit',
            description: 'Créez votre catalogue de produits ou services',
            icon: <Inventory />,
            route: '/products/new',
            color: '#795548',
            priority: 1,
            statsKey: 'products_count',
        },
    ],
    'e-sourcing': [
        {
            id: 'create_first_rfq',
            title: 'Lancer un appel d\'offres',
            description: 'Comparez les offres de vos fournisseurs',
            icon: <CompareArrows />,
            route: '/e-sourcing/events/new',
            color: '#00BCD4',
            priority: 3,
            statsKey: 'sourcing_events_count',
        },
    ],
    contracts: [
        {
            id: 'create_first_contract',
            title: 'Créer un contrat',
            description: 'Gérez vos contrats fournisseurs',
            icon: <Gavel />,
            route: '/contracts/new',
            color: '#607D8B',
            priority: 3,
            statsKey: 'contracts_count',
        },
    ],
    general: [
        {
            id: 'complete_profile',
            title: 'Compléter votre profil entreprise',
            description: 'Ajoutez votre logo et vos informations légales',
            icon: <Settings />,
            route: '/settings',
            color: '#673AB7',
            priority: 0,
            statsKey: 'has_company_logo',
            checkType: 'boolean',
        },
    ],
};

const GettingStartedWidget = ({ onDismiss, onStartTutorial }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const { t } = useTranslation();

    const [userModules, setUserModules] = useState([]);
    const [actions, setActions] = useState([]);
    const [actionsStatus, setActionsStatus] = useState({}); // État détaillé de chaque action
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    // Fonction pour charger les données depuis le nouvel endpoint
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Utiliser le nouvel endpoint dédié
            const response = await api.get('/onboarding/check-actions/');
            const data = response.data;

            console.log('[GettingStarted] Données reçues:', data);

            // Extraire les modules et le statut des actions
            const modules = data.enabled_modules || [];
            const actionsStatusData = data.actions || {};
            const summaryData = data.summary || {};

            setUserModules(modules);
            setActionsStatus(actionsStatusData);
            setSummary(summaryData);

            // Construire la liste d'actions basée sur les modules ACTIFS et les actions retournées
            let allActions = [...GUIDED_ACTIONS.general];
            modules.forEach(moduleId => {
                const normalizedModuleId = moduleId.replace(/-/g, '_');
                const moduleKey = moduleId in GUIDED_ACTIONS ? moduleId :
                    normalizedModuleId in GUIDED_ACTIONS ? normalizedModuleId : null;

                if (moduleKey && GUIDED_ACTIONS[moduleKey]) {
                    allActions = [...allActions, ...GUIDED_ACTIONS[moduleKey]];
                }
            });

            // Filtrer pour ne garder que les actions qui ont un statut retourné par le backend
            const availableActions = allActions.filter(action => action.id in actionsStatusData);

            // Trier par priorité
            availableActions.sort((a, b) => a.priority - b.priority);

            // Filtrer les actions optionnelles si une action obligatoire du même module est complétée
            const completedIds = Object.keys(actionsStatusData).filter(id => actionsStatusData[id]?.completed);
            const filteredActions = availableActions.filter(action => {
                if (!action.optional) return true;
                // Garder l'action optionnelle si aucune action obligatoire du même module n'est complétée
                const moduleRoute = action.route?.split('/')[1];
                return !completedIds.some(cId => {
                    const completedAction = availableActions.find(a => a.id === cId);
                    return completedAction && completedAction.route?.split('/')[1] === moduleRoute;
                });
            });

            setActions(filteredActions);
            console.log('[GettingStarted] Actions filtrées:', filteredActions.map(a => a.id));
            console.log('[GettingStarted] Résumé:', summaryData);

        } catch (error) {
            console.error('[GettingStarted] Erreur lors du chargement:', error);
            // En cas d'erreur, ne pas afficher le widget
            setIsDismissed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    // Vérifier si le widget a été masqué précédemment
    useEffect(() => {
        const dismissed = localStorage.getItem('getting_started_dismissed');
        if (dismissed) {
            try {
                const data = JSON.parse(dismissed);
                if (data.dismissed) {
                    setIsDismissed(true);
                }
            } catch (error) {
                console.error('[GettingStarted] Erreur parsing localStorage:', error);
            }
        }
    }, []);

    // Charger les données au montage (seulement si pas masqué)
    useEffect(() => {
        if (!isDismissed) {
            loadData();
        }
    }, [loadData, isDismissed]);

    // Recharger après navigation sur certaines routes ou événements
    useEffect(() => {
        // Recharger si on revient sur le dashboard
        if (location.pathname === '/dashboard') {
            const timer = setTimeout(() => {
                loadData();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [loadData, location.pathname]);

    // Écouter les événements de création/suppression d'éléments
    useEffect(() => {
        const handleItemCreated = () => {
            console.log('[GettingStarted] Élément créé, rechargement des actions...');
            setTimeout(() => {
                loadData();
            }, 1000); // Attendre 1 seconde pour que les données soient sauvegardées
        };

        // Écouter les événements personnalisés
        window.addEventListener('supplier-created', handleItemCreated);
        window.addEventListener('client-created', handleItemCreated);
        window.addEventListener('purchase-order-created', handleItemCreated);
        window.addEventListener('invoice-created', handleItemCreated);
        window.addEventListener('product-created', handleItemCreated);
        window.addEventListener('settings-updated', handleItemCreated);

        return () => {
            window.removeEventListener('supplier-created', handleItemCreated);
            window.removeEventListener('client-created', handleItemCreated);
            window.removeEventListener('purchase-order-created', handleItemCreated);
            window.removeEventListener('invoice-created', handleItemCreated);
            window.removeEventListener('product-created', handleItemCreated);
            window.removeEventListener('settings-updated', handleItemCreated);
        };
    }, [loadData]);

    const handleActionClick = (action) => {
        if (action.route) {
            navigate(action.route);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('getting_started_dismissed', JSON.stringify({
            dismissed: true,
            timestamp: Date.now(),
        }));
        setIsDismissed(true);
        if (onDismiss) onDismiss();
    };

    const handleRefresh = () => {
        loadData();
    };

    // Fonction globale pour réafficher le widget (accessible depuis la console ou ailleurs)
    useEffect(() => {
        window.showGettingStarted = () => {
            localStorage.removeItem('getting_started_dismissed');
            setIsDismissed(false);
            loadData();
        };

        return () => {
            delete window.showGettingStarted;
        };
    }, [loadData]);

    const handleStartTutorial = () => {
        if (onStartTutorial) {
            onStartTutorial();
        } else {
            // Déclencher l'événement pour le TutorialProvider
            window.dispatchEvent(new CustomEvent('start-tutorial'));
        }
    };

    const progress = summary?.progress_percent || 0;
    const completedCount = summary?.completed_actions || 0;
    const totalCount = summary?.total_actions || actions.length;
    const allCompleted = totalCount > 0 && completedCount === totalCount;

    // Ne pas afficher si dismissed ou en chargement
    if (isDismissed || loading) {
        return null;
    }

    // Message de félicitations si tout est complété (mais widget reste visible)
    if (allCompleted && totalCount > 0) {
        return (
            <Card
                sx={{
                    mb: 3,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.light, 0.05)} 100%)`,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                }}
            >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <Celebration sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'success.main' }}>
                        Bravo ! Vous avez terminé la configuration
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                        Vous êtes maintenant prêt à utiliser ProcureGenius à son plein potentiel !
                    </Typography>
                    <Stack direction="row" spacing={2} justifyContent="center">
                        <Button
                            variant="outlined"
                            startIcon={<School />}
                            onClick={handleStartTutorial}
                        >
                            Revoir le tutoriel
                        </Button>
                        <Button
                            variant="text"
                            onClick={handleDismiss}
                        >
                            Masquer ce message
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            sx={{
                mb: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                overflow: 'visible',
            }}
            data-tutorial="getting-started"
        >
            {/* Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderBottom: isCollapsed ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    cursor: 'pointer',
                }}
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                        <RocketLaunch />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            Premiers pas avec ProcureGenius
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {completedCount} / {totalCount} actions complétées
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                        label={`${Math.round(progress)}%`}
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 700 }}
                    />
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}>
                        {isCollapsed ? <KeyboardArrowDown /> : <KeyboardArrowUp />}
                    </IconButton>
                    <Tooltip title="Masquer pour l'instant">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDismiss(); }}>
                            <Close fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Progress bar */}
            <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                    height: 4,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                }}
            />

            {/* Content */}
            <Collapse in={!isCollapsed}>
                <CardContent sx={{ pt: 2 }}>
                    {/* Boutons d'action */}
                    <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button
                            variant="contained"
                            startIcon={<PlayArrow />}
                            onClick={handleStartTutorial}
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
                                },
                            }}
                        >
                            Lancer le tutoriel interactif
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={handleRefresh}
                            size="small"
                        >
                            Actualiser
                        </Button>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Liste des actions */}
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                        Actions recommandées pour démarrer :
                    </Typography>

                    <Grid container spacing={2}>
                        {actions.slice(0, 6).map((action) => {
                            const actionStatus = actionsStatus[action.id];
                            const isCompleted = actionStatus?.completed || false;
                            const isBlocked = actionStatus?.blocked || false;
                            const blockedBy = actionStatus?.blocked_by || [];
                            const statusMessage = actionStatus?.message || action.description;

                            return (
                                <Grid item xs={12} sm={6} md={4} key={action.id}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            height: '100%',
                                            border: `1px solid ${isCompleted ? alpha(theme.palette.success.main, 0.3) : theme.palette.divider}`,
                                            bgcolor: isCompleted
                                                ? alpha(theme.palette.success.main, 0.05)
                                                : isBlocked
                                                    ? alpha(theme.palette.action.disabled, 0.05)
                                                    : 'background.paper',
                                            opacity: isBlocked ? 0.6 : 1,
                                            cursor: isBlocked || isCompleted ? 'default' : 'pointer',
                                            transition: 'all 0.2s',
                                            '&:hover': (isBlocked || isCompleted) ? {} : {
                                                transform: 'translateY(-2px)',
                                                boxShadow: theme.shadows[4],
                                                borderColor: action.color,
                                            },
                                        }}
                                        onClick={() => !isBlocked && !isCompleted && handleActionClick(action)}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                            <Avatar
                                                sx={{
                                                    bgcolor: isCompleted
                                                        ? 'success.main'
                                                        : alpha(action.color, 0.1),
                                                    color: isCompleted ? 'white' : action.color,
                                                    width: 40,
                                                    height: 40,
                                                }}
                                            >
                                                {isCompleted ? <CheckCircle /> : action.icon}
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                    <Typography
                                                        variant="subtitle2"
                                                        sx={{
                                                            fontWeight: 600,
                                                            textDecoration: isCompleted ? 'line-through' : 'none',
                                                            color: isCompleted ? 'text.secondary' : 'text.primary',
                                                            flex: 1,
                                                        }}
                                                    >
                                                        {action.title}
                                                    </Typography>
                                                    {isCompleted && (
                                                        <Chip
                                                            label="Complété"
                                                            size="small"
                                                            color="success"
                                                            sx={{ height: 20, fontSize: '0.65rem' }}
                                                        />
                                                    )}
                                                    {action.optional && !isCompleted && (
                                                        <Chip label="Optionnel" size="small" sx={{ height: 20, fontSize: '0.65rem' }} />
                                                    )}
                                                </Box>
                                                <Typography
                                                    variant="caption"
                                                    color={isCompleted ? 'success.main' : 'text.secondary'}
                                                    sx={{
                                                        display: 'block',
                                                        lineHeight: 1.4,
                                                        mt: 0.5,
                                                        fontWeight: isCompleted ? 500 : 400,
                                                    }}
                                                >
                                                    {statusMessage}
                                                </Typography>
                                                {!isCompleted && !isBlocked && (
                                                    <Button
                                                        size="small"
                                                        endIcon={<ArrowForward fontSize="small" />}
                                                        sx={{ mt: 1, p: 0, minWidth: 'auto' }}
                                                        onClick={(e) => { e.stopPropagation(); handleActionClick(action); }}
                                                    >
                                                        Commencer
                                                    </Button>
                                                )}
                                                {isBlocked && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                                                        <Warning sx={{ fontSize: 16, color: 'warning.main' }} />
                                                        <Typography variant="caption" color="warning.main">
                                                            {blockedBy.length > 0
                                                                ? `Complétez d'abord: ${blockedBy.map(id => actions.find(a => a.id === id)?.title || id).join(', ')}`
                                                                : 'Complétez d\'abord les étapes précédentes'}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>

                    {actions.length > 6 && (
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                            <Button
                                variant="text"
                                size="small"
                                onClick={() => navigate('/settings')}
                            >
                                Voir toutes les actions ({actions.length})
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Collapse>
        </Card>
    );
};

export default GettingStartedWidget;

