import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import {
    CheckCircle,
    Business,
    ShoppingCart,
    Receipt,
    Inventory,
    People,
    CompareArrows,
    Gavel,
    Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import Mascot from './Mascot';

// Icônes des modules ; nom, description et fonctionnalités dans
// locales/<langue>/subscription.json (modules.items.<id>).
const MODULE_ICONS = {
    dashboard: <DashboardIcon />,
    suppliers: <Business />,
    'purchase-orders': <ShoppingCart />,
    invoices: <Receipt />,
    products: <Inventory />,
    clients: <People />,
    'e-sourcing': <CompareArrows />,
    contracts: <Gavel />,
};

function ModuleActivationDialog({ open, moduleId, onClose, onActivate }) {
    const { t } = useTranslation(['subscription', 'common']);
    const known = Boolean(MODULE_ICONS[moduleId]);
    const base = `subscription:modules.items.${moduleId}`;
    const features = known ? t(`${base}.features`, { returnObjects: true }) : [];
    const moduleInfo = known ? {
        name: t(`${base}.name`),
        icon: MODULE_ICONS[moduleId],
        description: t(`${base}.description`),
        features: Array.isArray(features) ? features : [],
    } : {
        name: t('subscription:modules.fallback.name'),
        icon: <DashboardIcon />,
        description: t('subscription:modules.fallback.description'),
        features: [],
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ color: 'primary.main', fontSize: 40 }}>
                        {moduleInfo.icon}
                    </Box>
                    <Box>
                        <Typography variant="h6">
                            {t('subscription:modules.activate', { module: moduleInfo.name })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {t('subscription:modules.currentlyDisabled')}
                        </Typography>
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Mascot pose="thinking" animation="float" size={80} />
                </Box>

                <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
                    {moduleInfo.description}
                </Typography>

                {moduleInfo.features.length > 0 && (
                    <>
                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, mb: 1 }}>
                            {t('subscription:modules.includedFeatures')}
                        </Typography>
                        <List dense>
                            {moduleInfo.features.map((feature, index) => (
                                <ListItem key={index}>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <CheckCircle color="success" fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText primary={feature} />
                                </ListItem>
                            ))}
                        </List>
                    </>
                )}

                <Box sx={{
                    mt: 3,
                    p: 2,
                    bgcolor: 'info.lighter',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'info.light'
                }}>
                    <Typography variant="body2" color="info.main">
                        {t('subscription:modules.canDisableLater')}
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit">
                    {t('common:buttons.cancel')}
                </Button>
                <Button
                    onClick={() => onActivate(moduleId)}
                    variant="contained"
                    startIcon={<CheckCircle />}
                >
                    {t('subscription:modules.activateNow')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ModuleActivationDialog;

