import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Divider,
    Grid,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    CircularProgress,
    Alert,
    useTheme,
    alpha
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    LocalPharmacy as PharmacyIcon,
    Inventory as InventoryIcon,
    AttachMoney as MoneyIcon,
    History as HistoryIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import pharmacyAPI from '../../../services/pharmacyAPI';

const MedicationDetail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();

    const [loading, setLoading] = useState(true);
    const [medication, setMedication] = useState(null);
    const [dispensingHistory, setDispensingHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        fetchMedication();
        fetchDispensingHistory();
    }, [id]);

    const fetchMedication = async () => {
        setLoading(true);
        try {
            // Utiliser l'API pharmacy pour les médicaments
            const data = await pharmacyAPI.getMedication(id);
            setMedication(data);
        } catch (error) {
            console.error('Error fetching medication:', error);
            enqueueSnackbar('Erreur lors du chargement du médicament', { variant: 'error' });
            navigate('/healthcare/pharmacy');
        } finally {
            setLoading(false);
        }
    };

    const fetchDispensingHistory = async () => {
        setLoadingHistory(true);
        try {
            // Récupérer l'historique des dispensations pour ce médicament
            // Note: L'API peut nécessiter un endpoint spécifique
            const response = await pharmacyAPI.getDispensingList({ medication_id: id });
            setDispensingHistory(Array.isArray(response) ? response : response.results || []);
        } catch (error) {
            console.error('Error fetching dispensing history:', error);
            // Ne pas bloquer l'affichage si l'historique échoue
        } finally {
            setLoadingHistory(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!medication) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">Médicament introuvable</Alert>
            </Box>
        );
    }

    const stockStatus = medication.stock_quantity === 0 
        ? { label: 'Rupture de stock', color: 'error' }
        : medication.stock_quantity <= (medication.low_stock_threshold || 10)
        ? { label: 'Stock faible', color: 'warning' }
        : { label: 'En stock', color: 'success' };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate('/healthcare/pharmacy')}
                    >
                        Retour
                    </Button>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5
                        }}
                    >
                        <PharmacyIcon sx={{ color: theme.palette.primary.main }} />
                        {medication.name}
                    </Typography>
                </Stack>
            </Box>

            <Grid container spacing={3}>
                {/* Main Information */}
                <Grid item xs={12} md={8}>
                    {/* Basic Info Card */}
                    <Card sx={{ mb: 3, borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                Informations Générales
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                Nom du Médicament
                                            </Typography>
                                            <Typography variant="body1" fontWeight={600}>
                                                {medication.name}
                                            </Typography>
                                        </Box>

                                        {medication.reference && (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                    Référence
                                                </Typography>
                                                <Typography variant="body1">
                                                    {medication.reference}
                                                </Typography>
                                            </Box>
                                        )}

                                        {medication.barcode && (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                    Code-barres
                                                </Typography>
                                                <Typography variant="body1" fontFamily="monospace">
                                                    {medication.barcode}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Stack>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                Prix Unitaire
                                            </Typography>
                                            <Typography variant="h6" color="primary" fontWeight={700}>
                                                {new Intl.NumberFormat('fr-FR').format(medication.price || 0)} XAF
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                Statut du Stock
                                            </Typography>
                                            <Box sx={{ mt: 0.5 }}>
                                                <Chip
                                                    label={stockStatus.label}
                                                    color={stockStatus.color}
                                                    size="small"
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            </Box>
                                        </Box>
                                    </Stack>
                                </Grid>

                                {medication.description && (
                                    <Grid item xs={12}>
                                        <Box
                                            sx={{
                                                p: 2,
                                                borderRadius: 2,
                                                bgcolor: alpha(theme.palette.info.main, 0.05),
                                                border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`
                                            }}
                                        >
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                Description
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                {medication.description}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Stock Information */}
                    <Card sx={{ mb: 3, borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                <InventoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                                Informations de Stock
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={4}>
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            textAlign: 'center'
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            Stock Actuel
                                        </Typography>
                                        <Typography variant="h4" fontWeight={700} color="primary">
                                            {medication.stock_quantity || 0}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {medication.unit || 'unités'}
                                        </Typography>
                                    </Box>
                                </Grid>

                                <Grid item xs={12} sm={4}>
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.warning.main, 0.1),
                                            textAlign: 'center'
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            Seuil d'Alerte
                                        </Typography>
                                        <Typography variant="h4" fontWeight={700} color="warning.main">
                                            {medication.low_stock_threshold || 10}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            unités
                                        </Typography>
                                    </Box>
                                </Grid>

                                <Grid item xs={12} sm={4}>
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.success.main, 0.1),
                                            textAlign: 'center'
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            Valeur du Stock
                                        </Typography>
                                        <Typography variant="h4" fontWeight={700} color="success.main">
                                            {new Intl.NumberFormat('fr-FR').format(
                                                (medication.stock_quantity || 0) * (medication.price || 0)
                                            )} XAF
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Dispensing History */}
                    <Card sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                <HistoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                                Historique des Dispensations
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            {loadingHistory ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <CircularProgress />
                                </Box>
                            ) : dispensingHistory.length > 0 ? (
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                                                <TableCell><strong>Date</strong></TableCell>
                                                <TableCell><strong>Patient</strong></TableCell>
                                                <TableCell align="center"><strong>Quantité</strong></TableCell>
                                                <TableCell align="right"><strong>Prix Unit.</strong></TableCell>
                                                <TableCell align="right"><strong>Total</strong></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {dispensingHistory.map((dispensing) => (
                                                <TableRow key={dispensing.id} hover>
                                                    <TableCell>
                                                        {new Date(dispensing.dispensed_at).toLocaleDateString('fr-FR')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {dispensing.patient_name || 'Client Comptoir'}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={dispensing.items?.find(i => i.medication_id === id)?.quantity_dispensed || '-'}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {new Intl.NumberFormat('fr-FR').format(
                                                            dispensing.items?.find(i => i.medication_id === id)?.unit_price || 0
                                                        )} XAF
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography fontWeight={600}>
                                                            {new Intl.NumberFormat('fr-FR').format(
                                                                dispensing.items?.find(i => i.medication_id === id)?.total_price || 0
                                                            )} XAF
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Alert severity="info">Aucune dispensation enregistrée pour ce médicament</Alert>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Summary Sidebar */}
                <Grid item xs={12} md={4}>
                    <Card
                        sx={{
                            borderRadius: 3,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.primary.main, 0.02)})`,
                            border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
                        }}
                    >
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                Résumé
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        Type de Produit
                                    </Typography>
                                    <Chip
                                        label={medication.product_type === 'physical' ? 'Médicament' : medication.product_type}
                                        size="small"
                                        sx={{ mt: 0.5 }}
                                    />
                                </Box>

                                {medication.category && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            Catégorie
                                        </Typography>
                                        <Typography variant="body1" sx={{ mt: 0.5 }}>
                                            {medication.category_name || medication.category}
                                        </Typography>
                                    </Box>
                                )}

                                <Divider />

                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        textAlign: 'center'
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        PRIX UNITAIRE
                                    </Typography>
                                    <Typography
                                        variant="h4"
                                        fontWeight={700}
                                        sx={{
                                            mt: 1,
                                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                            backgroundClip: 'text',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent'
                                        }}
                                    >
                                        {new Intl.NumberFormat('fr-FR').format(medication.price || 0)} XAF
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default MedicationDetail;
