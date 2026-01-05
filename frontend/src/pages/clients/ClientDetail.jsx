import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import {
    Edit,
    Delete,
    Email,
    Phone,
    LocationOn,
    Business,
    Person,
    ArrowBack,
    MoreVert,
    CheckCircle,
    Warning,
    Block,
    AttachMoney,
    Receipt,
    Assessment,
    TrendingUp,
    Schedule,
    CreditCard,
    Visibility,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { clientsAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

function ClientDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [client, setClient] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    useEffect(() => {
        fetchClient();
        fetchStatistics();
    }, [id]);

    const fetchClient = async () => {
        setLoading(true);
        try {
            const response = await clientsAPI.get(id);
            setClient(response.data);
        } catch (error) {
            enqueueSnackbar('Erreur lors du chargement du client', { variant: 'error' });
            navigate('/clients');
        } finally {
            setLoading(false);
        }
    };

    const fetchStatistics = async () => {
        setStatsLoading(true);
        try {
            // TODO: Implement client statistics endpoint
            setStatistics(null);
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const handleEdit = () => {
        navigate(`/clients/${id}/edit`);
    };

    const handleDelete = async () => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${client.name} ?`)) {
            try {
                await clientsAPI.delete(id);
                enqueueSnackbar('Client supprimé avec succès', { variant: 'success' });
                navigate('/clients');
            } catch (error) {
                enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
            }
        }
    };

    const handleToggleStatus = async () => {
        try {
            const response = await clientsAPI.update(id, { is_active: !client.is_active });
            setClient(response.data);
            enqueueSnackbar('Statut modifié avec succès', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Erreur lors de la modification du statut', { variant: 'error' });
        }
    };

    const getStatusIcon = (isActive) => {
        return isActive ? <CheckCircle color="success" /> : <Block color="error" />;
    };

    const getStatusLabel = (isActive) => {
        return isActive ? 'Actif' : 'Inactif';
    };

    const getStatusColor = (isActive) => {
        return isActive ? 'success' : 'error';
    };

    const getRiskBadge = (score) => {
        if (score <= 0.3) return { label: 'Faible risque', color: 'success' };
        if (score <= 0.6) return { label: 'Risque modéré', color: 'warning' };
        return { label: 'Risque élevé', color: 'error' };
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (!client) {
        return (
            <Alert severity="error">
                Client introuvable
            </Alert>
        );
    }

    const riskBadge = getRiskBadge(client.ai_payment_risk_score);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate('/clients')}>
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h4" fontWeight="bold">
                        {client.name}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={handleEdit}
                    >
                        Modifier
                    </Button>
                    <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                        <MoreVert />
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                    >
                        <MenuItem onClick={handleToggleStatus}>
                            {client.is_active ? 'Désactiver' : 'Activer'}
                        </MenuItem>
                        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                            <Delete fontSize="small" sx={{ mr: 1 }} />
                            Supprimer
                        </MenuItem>
                    </Menu>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Informations principales */}
                <Grid item xs={12} md={8}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}>
                                    {client.name.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                        <Typography variant="h5">
                                            {client.name}
                                        </Typography>
                                        <Chip
                                            icon={getStatusIcon(client.is_active)}
                                            label={getStatusLabel(client.is_active)}
                                            color={getStatusColor(client.is_active)}
                                        />
                                    </Box>
                                    {client.legal_name && client.legal_name !== client.name && (
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Nom légal: {client.legal_name}
                                        </Typography>
                                    )}
                                    {client.business_number && (
                                        <Typography variant="body2" color="text.secondary">
                                            N° d'entreprise: {client.business_number}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            <Grid container spacing={2}>
                                {client.contact_person && (
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Person color="action" />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Personne contact
                                                </Typography>
                                                <Typography>{client.contact_person}</Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                )}

                                {client.email && (
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Email color="action" />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Email
                                                </Typography>
                                                <Typography>
                                                    <a href={`mailto:${client.email}`} style={{ color: 'inherit' }}>
                                                        {client.email}
                                                    </a>
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                )}

                                {client.phone && (
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Phone color="action" />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Téléphone
                                                </Typography>
                                                <Typography>
                                                    <a href={`tel:${client.phone}`} style={{ color: 'inherit' }}>
                                                        {client.phone}
                                                    </a>
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                )}

                                {client.billing_address && (
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                            <LocationOn color="action" />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">
                                                    Adresse de facturation
                                                </Typography>
                                                <Typography>{client.billing_address}</Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Conditions commerciales */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CreditCard color="primary" />
                                Conditions commerciales
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                                        <Typography variant="h6" color="info.main">
                                            {client.payment_terms}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Conditions de paiement
                                        </Typography>
                                    </Box>
                                </Grid>

                                {client.credit_limit && (
                                    <Grid item xs={12} sm={6}>
                                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                                            <Typography variant="h6" color="success.main">
                                                {formatCurrency(client.credit_limit)}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Limite de crédit
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Analyses IA */}
                    {(client.ai_payment_risk_score > 0 ||
                        (client.ai_payment_pattern && Object.keys(client.ai_payment_pattern).length > 0)) && (
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Assessment color="primary" />
                                        Analyses IA
                                    </Typography>
                                    <Grid container spacing={2}>
                                        {client.ai_payment_risk_score > 0 && (
                                            <Grid item xs={12} sm={6}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Chip
                                                        label={riskBadge.label}
                                                        color={riskBadge.color}
                                                        size="large"
                                                    />
                                                    <Typography variant="body2" color="text.secondary">
                                                        Score: {(client.ai_payment_risk_score * 100).toFixed(1)}%
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        )}
                                        {client.ai_payment_pattern && Object.keys(client.ai_payment_pattern).length > 0 && (
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Modèle de paiement
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {JSON.stringify(client.ai_payment_pattern)}
                                                </Typography>
                                            </Grid>
                                        )}
                                    </Grid>
                                </CardContent>
                            </Card>
                        )}
                </Grid>

                {/* Sidebar */}
                <Grid item xs={12} md={4}>
                    {/* Statistiques rapides */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingUp color="primary" />
                                Aperçu
                            </Typography>

                            <List dense>
                                <ListItem>
                                    <ListItemIcon>
                                        <Receipt />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Factures"
                                        secondary="Voir toutes les factures"
                                    />
                                </ListItem>
                                <ListItem>
                                    <ListItemIcon>
                                        <AttachMoney />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Chiffre d'affaires"
                                        secondary="Historique des ventes"
                                    />
                                </ListItem>
                            </List>
                        </CardContent>
                    </Card>

                    {/* Actions rapides */}
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Actions rapides
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<Receipt />}
                                    onClick={() => navigate(`/invoices/new?client=${id}`)}
                                >
                                    Créer une facture
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<Email />}
                                    href={`mailto:${client.email}`}
                                    disabled={!client.email}
                                >
                                    Envoyer un email
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<Phone />}
                                    href={`tel:${client.phone}`}
                                    disabled={!client.phone}
                                >
                                    Appeler
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Dates */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Informations système
                            </Typography>
                            <List dense>
                                <ListItem>
                                    <ListItemIcon>
                                        <Schedule />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary="Date de création"
                                        secondary={formatDate(client.created_at)}
                                    />
                                </ListItem>
                                {client.updated_at && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <Schedule />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary="Dernière modification"
                                            secondary={formatDate(client.updated_at)}
                                        />
                                    </ListItem>
                                )}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default ClientDetail;
