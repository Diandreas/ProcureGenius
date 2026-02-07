import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography,
    Stack,
    CircularProgress,
    Divider,
    Paper,
    Alert
} from '@mui/material';
import {
    Print as PrintIcon,
    ArrowBack as ArrowBackIcon,
    Receipt as ReceiptIcon,
    Label as LabelIcon,
    QrCode as QrCodeIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';

const LabOrderDispatch = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const data = await laboratoryAPI.getOrder(id);
            setOrder(data);
        } catch (error) {
            console.error('Error fetching order:', error);
            enqueueSnackbar('Erreur de chargement de la commande', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handlePrintAction = async (type, action = 'print') => {
        setGeneratingPdf(true);
        try {
            let blob;
            let filename;

            if (type === 'receipt') {
                blob = await laboratoryAPI.getReceiptPDF(id);
                filename = `recu_labo_${order.order_number}.pdf`;
            } else if (type === 'barcodes') {
                blob = await laboratoryAPI.getBarcodesPDF(id, { quantity: 1 });
                filename = `barcodes_${order.order_number}.pdf`;
            } else if (type === 'tube_labels') {
                blob = await laboratoryAPI.getTubeLabelsPDF(id, { quantity: 1 });
                filename = `etiquettes_tubes_${order.order_number}.pdf`;
            }

            const url = window.URL.createObjectURL(blob);

            if (action === 'print') {
                const printWindow = window.open(url, '_blank');
                if (printWindow) {
                    printWindow.onload = () => {
                        printWindow.print();
                    };
                }
            } else {
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => window.URL.revokeObjectURL(url), 100);
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            enqueueSnackbar('Erreur lors de la génération du document', { variant: 'error' });
        } finally {
            setGeneratingPdf(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!order) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">Commande introuvable</Alert>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/laboratory')} sx={{ mt: 2 }}>
                    Retour au laboratoire
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Commande Créée avec Succès
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    La commande <strong>#{order.order_number}</strong> pour <strong>{order.patient_name}</strong> a été enregistrée.
                </Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card elevation={2}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h6" gutterBottom align="center" sx={{ mb: 3 }}>
                                Documents à remettre à l'infirmerie / patient
                            </Typography>

                            <Stack spacing={2}>
                                <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <ReceiptIcon color="primary" />
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">Reçu de Caisse / Bon d'Examen</Typography>
                                            <Typography variant="caption" color="text.secondary">Preuve de paiement et liste des examens</Typography>
                                        </Box>
                                    </Box>
                                    <Button
                                        variant="contained"
                                        startIcon={<PrintIcon />}
                                        onClick={() => handlePrintAction('receipt')}
                                        disabled={generatingPdf}
                                    >
                                        Imprimer
                                    </Button>
                                </Paper>

                                <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <LabelIcon color="primary" />
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">Étiquettes de Tubes</Typography>
                                            <Typography variant="caption" color="text.secondary">Pour l'identification des prélèvements</Typography>
                                        </Box>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        startIcon={<PrintIcon />}
                                        onClick={() => handlePrintAction('tube_labels')}
                                        disabled={generatingPdf}
                                    >
                                        Imprimer
                                    </Button>
                                </Paper>

                                <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <QrCodeIcon color="primary" />
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">Codes-barres</Typography>
                                            <Typography variant="caption" color="text.secondary">Pour le suivi logistique</Typography>
                                        </Box>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        startIcon={<PrintIcon />}
                                        onClick={() => handlePrintAction('barcodes')}
                                        disabled={generatingPdf}
                                    >
                                        Imprimer
                                    </Button>
                                </Paper>
                            </Stack>

                            <Divider sx={{ my: 4 }} />

                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                                <Button
                                    startIcon={<ArrowBackIcon />}
                                    onClick={() => navigate('/healthcare/laboratory')}
                                    size="large"
                                >
                                    Fermer
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={() => navigate(`/healthcare/laboratory/${id}`)}
                                    size="large"
                                >
                                    Voir Détails de la Commande
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {order.lab_invoice && (
                    <Grid item xs={12}>
                        <Alert
                            severity="info"
                            action={
                                <Button color="inherit" size="small" onClick={() => navigate(`/invoices/${order.lab_invoice.id}`)}>
                                    Voir Facture
                                </Button>
                            }
                        >
                            Une facture a été générée automatiquement : <strong>{order.lab_invoice.invoice_number}</strong>
                        </Alert>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default LabOrderDispatch;
