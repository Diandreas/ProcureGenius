import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Divider,
    Stack,
    Avatar,
    Paper,
    useTheme,
    alpha
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Receipt as ReceiptIcon,
    Person as PersonIcon,
    LocalPharmacy as PharmacyIcon,
    CalendarToday as CalendarIcon,
    Print as PrintIcon,
    Download as DownloadIcon,
    AttachMoney as InvoiceIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import pharmacyAPI from '../../../services/pharmacyAPI';
import { invoicesAPI } from '../../../services/api';
import PrintModal from '../../../components/PrintModal';

const DispensingDetail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();

    const [loading, setLoading] = useState(false);
    const [dispensing, setDispensing] = useState(null);

    // Print Modal State
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printModalType, setPrintModalType] = useState(null); // 'receipt' or 'report'
    const [generatingPdf, setGeneratingPdf] = useState(false);

    useEffect(() => {
        if (id) {
            fetchDispensing();
        }
    }, [id]);

    const fetchDispensing = async () => {
        setLoading(true);
        try {
            const data = await pharmacyAPI.getDispensing(id);
            setDispensing(data);
        } catch (error) {
            console.error('Error fetching dispensing:', error);
            enqueueSnackbar('Erreur lors du chargement de la dispensation', { variant: 'error' });
            navigate('/healthcare/pharmacy/dispensing');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPrintModal = (type) => {
        setPrintModalType(type);
        setPrintModalOpen(true);
    };

    const handlePrintAction = async (action) => {
        if (!printModalType) return;

        setGeneratingPdf(true);
        try {
            let blob;
            let filename;

            if (printModalType === 'receipt') {
                blob = await pharmacyAPI.getReceiptPDF(id);
                filename = `recu_dispensation_${dispensing.dispensing_number}.pdf`;
            } else if (printModalType === 'report') {
                blob = await pharmacyAPI.getReportPDF(id);
                filename = `rapport_dispensation_${dispensing.dispensing_number}.pdf`;
            }

            if (action === 'download') {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => window.URL.revokeObjectURL(url), 100);
            } else if (action === 'preview' || action === 'print') {
                const url = window.URL.createObjectURL(blob);
                const printWindow = window.open(url, '_blank');

                if (printWindow && action === 'print') {
                    printWindow.onload = () => {
                        printWindow.print();
                    };
                }
            }

            setPrintModalOpen(false);
        } catch (error) {
            console.error('Error handling print action:', error);
            enqueueSnackbar('Erreur lors de la génération du document', { variant: 'error' });
        } finally {
            setGeneratingPdf(false);
        }
    };

    const handleGenerateInvoice = async () => {
        try {
            enqueueSnackbar('Génération de la facture...', { variant: 'info' });
            const response = await pharmacyAPI.generateInvoice(id);
            enqueueSnackbar(`Facture ${response.invoice_number} créée avec succès!`, { variant: 'success' });
            // Recharger les données pour afficher la facture
            fetchDispensing();
        } catch (error) {
            console.error('Error generating invoice:', error);
            const errorMsg = error.response?.data?.error || 'Erreur lors de la génération de la facture';
            enqueueSnackbar(errorMsg, { variant: 'error' });
        }
    };

    const handleMarkInvoicePaid = async () => {
        if (!dispensing.pharmacy_invoice) return;
        
        try {
            const paymentData = {
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: 'cash',
                notes: `Paiement pour dispensation ${dispensing.dispensing_number}`
            };
            await invoicesAPI.markPaid(dispensing.pharmacy_invoice.id, paymentData);
            enqueueSnackbar('Facture marquée comme payée', { variant: 'success' });
            fetchDispensing(); // Refresh to update invoice status
        } catch (error) {
            console.error('Error marking invoice as paid:', error);
            enqueueSnackbar('Erreur lors du marquage de la facture', { variant: 'error' });
        }
    };

    if (loading || !dispensing) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body1" color="text.secondary">
                    Chargement...
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate('/healthcare/pharmacy/dispensing')}
                    >
                        Retour
                    </Button>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5
                        }}
                    >
                        <ReceiptIcon sx={{ color: theme.palette.success.main }} />
                        Détails de Dispensation
                    </Typography>
                </Stack>

                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<ReceiptIcon />}
                        onClick={() => handleOpenPrintModal('receipt')}
                    >
                        Imprimer Reçu
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<PrintIcon />}
                        onClick={() => handleOpenPrintModal('report')}
                    >
                        Rapport Complet
                    </Button>
                    {dispensing.pharmacy_invoice ? (
                        <>
                            <Button
                                variant="outlined"
                                color="success"
                                startIcon={<InvoiceIcon />}
                                onClick={() => navigate(`/invoices/${dispensing.pharmacy_invoice.id}`)}
                            >
                                Voir Facture
                            </Button>
                            {dispensing.pharmacy_invoice.status !== 'paid' && (
                                <Button
                                    variant="contained"
                                    color="success"
                                    startIcon={<InvoiceIcon />}
                                    onClick={handleMarkInvoicePaid}
                                >
                                    Marquer Payée
                                </Button>
                            )}
                        </>
                    ) : (
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<InvoiceIcon />}
                            onClick={handleGenerateInvoice}
                        >
                            Générer Facture
                        </Button>
                    )}
                </Stack>
            </Box>

            <Grid container spacing={3}>
                {/* Main Information */}
                <Grid item xs={12} md={8}>
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
                                                Numéro de Dispensation
                                            </Typography>
                                            <Typography variant="body1" fontWeight={600}>
                                                #{dispensing.dispensing_number || dispensing.id}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                Patient
                                            </Typography>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.main' }}>
                                                    {dispensing.patient_name?.charAt(0) || 'C'}
                                                </Avatar>
                                                <Typography variant="body1" fontWeight={600}>
                                                    {dispensing.patient_name || 'Client Comptoir'}
                                                </Typography>
                                            </Stack>
                                        </Box>
                                    </Stack>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                Date de Dispensation
                                            </Typography>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                <Typography variant="body1">
                                                    {new Date(dispensing.dispensed_at).toLocaleDateString('fr-FR', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </Typography>
                                            </Stack>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                Dispensé par
                                            </Typography>
                                            <Typography variant="body1">
                                                {dispensing.dispensed_by_name || 'N/A'}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Grid>

                                {dispensing.notes && (
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
                                                Notes
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                {dispensing.notes}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Items Table */}
                    <Card sx={{ borderRadius: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                Médicaments Dispensés
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                                            <TableCell><strong>Médicament</strong></TableCell>
                                            <TableCell align="center"><strong>Quantité</strong></TableCell>
                                            <TableCell align="right"><strong>Prix Unit.</strong></TableCell>
                                            <TableCell align="right"><strong>Total</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {dispensing.items && dispensing.items.length > 0 ? (
                                            dispensing.items.map((item, index) => (
                                                <TableRow key={index} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {item.medication_name}
                                                        </Typography>
                                                        {item.medication_reference && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                Réf: {item.medication_reference}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={item.quantity_dispensed}
                                                            size="small"
                                                            sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {new Intl.NumberFormat('fr-FR').format(item.unit_price || 0)} XAF
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography fontWeight={600}>
                                                            {new Intl.NumberFormat('fr-FR').format(item.total_price || 0)} XAF
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                                    <Typography color="text.secondary">
                                                        Aucun médicament
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Summary Sidebar */}
                <Grid item xs={12} md={4}>
                    <Card
                        sx={{
                            borderRadius: 3,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)}, ${alpha(theme.palette.success.main, 0.02)})`,
                            border: `2px solid ${alpha(theme.palette.success.main, 0.2)}`
                        }}
                    >
                        <CardContent>
                            <Typography variant="h6" gutterBottom fontWeight={600}>
                                Résumé
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Statut
                                    </Typography>
                                    <Chip
                                        label={dispensing.status_display || 'DISPENSÉ'}
                                        size="small"
                                        sx={{
                                            bgcolor: alpha(theme.palette.success.main, 0.15),
                                            color: 'success.main',
                                            fontWeight: 600
                                        }}
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Nombre d'articles
                                    </Typography>
                                    <Typography fontWeight={600}>
                                        {dispensing.items_count || dispensing.items?.length || 0}
                                    </Typography>
                                </Box>

                                <Divider />

                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        bgcolor: alpha(theme.palette.success.main, 0.1),
                                        textAlign: 'center'
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        MONTANT TOTAL
                                    </Typography>
                                    <Typography
                                        variant="h4"
                                        fontWeight={700}
                                        sx={{
                                            mt: 1,
                                            background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                                            backgroundClip: 'text',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent'
                                        }}
                                    >
                                        {new Intl.NumberFormat('fr-FR').format(dispensing.total_amount || 0)} XAF
                                    </Typography>
                                </Box>

                                {dispensing.counseling_provided && (
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.info.main, 0.05),
                                            border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            Conseil Pharmaceutique
                                        </Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                            {dispensing.counseling_notes || 'Conseil fourni'}
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Print Modal */}
            <PrintModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                title={
                    printModalType === 'receipt' ? 'Reçu de Dispensation' :
                    printModalType === 'report' ? 'Rapport Complet' :
                    'Document'
                }
                loading={generatingPdf}
                onPreview={() => handlePrintAction('preview')}
                onPrint={() => handlePrintAction('print')}
                onDownload={() => handlePrintAction('download')}
                helpText="Choisissez une action pour générer le document"
            />
        </Box>
    );
};

export default DispensingDetail;
