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
import Mascot from './Mascot';

// Descriptions des modules
const MODULE_INFO = {
    dashboard: {
        name: 'Tableau de bord',
        icon: <DashboardIcon />,
        description: 'Vue d\'ensemble de votre activité avec statistiques en temps réel',
        features: [
            'Statistiques de performance',
            'Graphiques interactifs',
            'Activité récente',
            'Indicateurs clés (KPI)',
        ],
    },
    suppliers: {
        name: 'Fournisseurs',
        icon: <Business />,
        description: 'Gérez efficacement vos relations fournisseurs',
        features: [
            'Base de données fournisseurs',
            'Évaluation des performances',
            'Historique des commandes',
            'Import/Export CSV',
        ],
    },
    'purchase-orders': {
        name: 'Bons de commande',
        icon: <ShoppingCart />,
        description: 'Créez et suivez vos bons de commande',
        features: [
            'Création de bons de commande',
            'Suivi des livraisons',
            'Approbations multi-niveaux',
            'Génération de PDF',
        ],
    },
    invoices: {
        name: 'Factures',
        icon: <Receipt />,
        description: 'Gérez votre facturation et vos paiements',
        features: [
            'Création de factures',
            'Suivi des paiements',
            'Relances automatiques',
            'Rapports comptables',
        ],
    },
    products: {
        name: 'Produits',
        icon: <Inventory />,
        description: 'Gérez votre catalogue produits et vos stocks',
        features: [
            'Catalogue produits',
            'Gestion des stocks',
            'Alertes de réapprovisionnement',
            'Mouvements de stock',
        ],
    },
    clients: {
        name: 'Clients',
        icon: <People />,
        description: 'Gérez votre base clients',
        features: [
            'Base de données clients',
            'Historique des transactions',
            'Analyse du comportement',
            'Segmentation',
        ],
    },
    'e-sourcing': {
        name: 'E-Sourcing',
        icon: <CompareArrows />,
        description: 'Gérez vos appels d\'offres et comparez les fournisseurs',
        features: [
            'Création de RFQ',
            'Comparaison des offres',
            'Évaluation des fournisseurs',
            'Négociation en ligne',
        ],
    },
    contracts: {
        name: 'Contrats',
        icon: <Gavel />,
        description: 'Gérez vos contrats fournisseurs',
        features: [
            'Gestion des contrats',
            'Extraction de clauses par IA',
            'Alertes d\'expiration',
            'Bibliothèque de templates',
        ],
    },
};

function ModuleActivationDialog({ open, moduleId, onClose, onActivate }) {
    const moduleInfo = MODULE_INFO[moduleId] || {
        name: 'Module',
        icon: <DashboardIcon />,
        description: 'Description du module',
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
                            Activer {moduleInfo.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Ce module est actuellement désactivé
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
                            Fonctionnalités incluses:
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
                         Vous pourrez toujours désactiver ce module dans les paramètres
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit">
                    Annuler
                </Button>
                <Button
                    onClick={() => onActivate(moduleId)}
                    variant="contained"
                    startIcon={<CheckCircle />}
                >
                    Activer maintenant
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ModuleActivationDialog;

