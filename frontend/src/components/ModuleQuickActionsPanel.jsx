import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Grid,
    Collapse,
    IconButton,
    Chip,
} from '@mui/material';
import {
    SmartToy,
    ExpandMore,
    ExpandLess,
    Receipt,
    ShoppingCart,
    Business,
    Analytics,
    DocumentScanner,
    Inventory,
    People,
    CompareArrows,
    Gavel,
    Dashboard as DashboardIcon,
    Search,
    Add,
    BarChart,
} from '@mui/icons-material';
import { aiChatAPI } from '../services/api';

/**
 * Panel de quick actions IA contextuel à chaque module
 * Affiche 4-6 actions rapides selon le module actif
 */
function ModuleQuickActionsPanel({ currentModule, onActionClick }) {
    const [quickActions, setQuickActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);

    // Icônes pour les actions
    const getActionIcon = (actionId) => {
        const icons = {
            create_invoice: Receipt,
            create_po: ShoppingCart,
            add_supplier: Business,
            view_stats: Analytics,
            scan_document: DocumentScanner,
            add_product: Inventory,
            add_client: People,
            create_rfq: CompareArrows,
            create_contract: Gavel,
            generate_report: BarChart,
            search: Search,
            analyze: Analytics,
            create: Add,
        };
        return icons[actionId] || SmartToy;
    };

    // Couleurs pour les boutons selon l'action
    const getActionColor = (actionId) => {
        if (actionId.includes('create') || actionId.includes('add')) return 'primary';
        if (actionId.includes('search') || actionId.includes('analyze')) return 'info';
        if (actionId.includes('stats') || actionId.includes('report')) return 'secondary';
        return 'primary';
    };

    useEffect(() => {
        fetchQuickActions();
    }, [currentModule]);

    const fetchQuickActions = async () => {
        setLoading(true);
        try {
            const response = await aiChatAPI.getQuickActions(currentModule);
            const actions = response.data.actions || response.data || [];
            // Limiter à 6 actions pour ne pas surcharger l'interface
            setQuickActions(actions.slice(0, 6));
        } catch (error) {
            console.error('Error fetching quick actions:', error);
            setQuickActions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleActionClick = (action) => {
        const prompt = action.prompt || action.title;
        if (onActionClick) {
            onActionClick(prompt);
        }
    };

    if (loading || quickActions.length === 0) {
        return null; // Ne rien afficher pendant le chargement ou si pas d'actions
    }

    return (
        <Paper
            elevation={2}
            sx={{
                p: 2,
                mb: 3,
                background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                border: '1px solid',
                borderColor: 'primary.light',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: isExpanded ? 2 : 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SmartToy sx={{ color: 'primary.main' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Actions rapides IA
                    </Typography>
                    <Chip
                        label="Intelligent"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ ml: 1 }}
                    />
                </Box>
                <IconButton size="small" onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
            </Box>

            <Collapse in={isExpanded}>
                <Grid container spacing={1}>
                    {quickActions.map((action) => {
                        const Icon = getActionIcon(action.id);
                        const color = getActionColor(action.id);

                        return (
                            <Grid item xs={12} sm={6} md={4} key={action.id}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    color={color}
                                    startIcon={<Icon />}
                                    onClick={() => handleActionClick(action)}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        py: 1,
                                        textTransform: 'none',
                                        fontSize: '0.875rem',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: 2,
                                        },
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {action.title}
                                </Button>
                            </Grid>
                        );
                    })}
                </Grid>

                {quickActions.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, textAlign: 'center' }}>
                        💡 L'IA peut vous aider à automatiser ces tâches
                    </Typography>
                )}
            </Collapse>
        </Paper>
    );
}

export default ModuleQuickActionsPanel;

