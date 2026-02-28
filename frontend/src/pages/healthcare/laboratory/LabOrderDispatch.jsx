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
    CheckCircle as CheckCircleIcon,
    PictureAsPdf as PdfIcon,
    Description as InvoiceIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import { invoicesAPI } from '../../../services/api';
import PrintModal from '../../../components/PrintModal';

const LabOrderDispatch = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [generatingReceipt, setGeneratingReceipt] = useState(false);
    const [invoicePdfModalOpen, setInvoicePdfModalOpen] = useState(false);

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
                // Prioritize invoice receipt (includes discounts and correct kit price)
                if (order.lab_invoice) {
                    const res = await invoicesAPI.getReceiptPDF(order.lab_invoice.id);
                    blob = res.data;
                    filename = `recu_facture_${order.lab_invoice.invoice_number}.pdf`;
                } else {
                    blob = await laboratoryAPI.getReceiptPDF(id);
                    filename = `recu_labo_${order.order_number}.pdf`;
                }
            } else if (type === 'invoice_a4') {
                if (order.lab_invoice) {
                    const res = await invoicesAPI.getPDF(order.lab_invoice.id);
                    blob = res.data;
                    filename = `facture_${order.lab_invoice.invoice_number}.pdf`;
                } else {
                    enqueueSnackbar('Aucune facture associée pour le format A4', { variant: 'warning' });
                    setGeneratingPdf(false);
                    return;
                }
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

    const handleReceiptAction = async (action) => {
        setGeneratingReceipt(true);
        try {
            let blob;
            if (order.lab_invoice) {
                const response = await invoicesAPI.getReceiptPDF(order.lab_invoice.id);
                blob = response.data;
            } else {
                blob = await laboratoryAPI.getReceiptPDF(id);
            }
            const filename = order.lab_invoice
                ? `recu_facture_${order.lab_invoice.invoice_number}.pdf`
                : `recu_labo_${order.order_number}.pdf`;
            const url = window.URL.createObjectURL(blob);
            if (action === 'download') {
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => window.URL.revokeObjectURL(url), 100);
            } else {
                const printWindow = window.open(url, '_blank');
                if (printWindow && action === 'print') {
                    printWindow.onload = () => printWindow.print();
                }
            }
            setReceiptModalOpen(false);
        } catch (error) {
            console.error('Error generating receipt:', error);
            enqueueSnackbar('Erreur lors de la génération du reçu', { variant: 'error' });
        } finally {
            setGeneratingReceipt(false);
        }
    };

    const handleInvoicePDFAction = async (action) => {
        if (!order.lab_invoice) {
            enqueueSnackbar('Aucune facture associée pour le format A4', { variant: 'warning' });
            return;
        }
        setGeneratingPdf(true);
        try {
            const response = await invoicesAPI.getPDF(order.lab_invoice.id);
            const blob = response.data;
            const filename = `facture_${order.lab_invoice.invoice_number}.pdf`;
            const url = window.URL.createObjectURL(blob);
            if (action === 'download') {
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => window.URL.revokeObjectURL(url), 100);
            } else {
                const printWindow = window.open(url, '_blank');
                if (printWindow && action === 'print') {
                    printWindow.onload = () => printWindow.print();
                }
            }
            setInvoicePdfModalOpen(false);
        } catch (error) {
            console.error('Error generating invoice PDF:', error);
            enqueueSnackbar('Erreur lors de la génération de la facture', { variant: 'error' });
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
        <>
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
                                <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'primary.light' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <ReceiptIcon color="primary" />
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">Reçu de Caisse (Petit Format)</Typography>
                                            <Typography variant="caption" color="text.secondary">Format ticket thermique 80mm avec détails et réductions</Typography>
                                        </Box>
                                    </Box>
                                    <Button
                                        data-testid="lab-dispatch-btn-receipt"
                                        variant="contained"
                                        startIcon={<PrintIcon />}
                                        onClick={() => handlePrintAction('receipt')}
                                        disabled={generatingPdf}
                                    >
                                        Imprimer Ticket
                                    </Button>
                                </Paper>

                                <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <PdfIcon color="primary" />
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">Facture Détaillée (Format A4)</Typography>
                                            <Typography variant="caption" color="text.secondary">Facture officielle grand format pour assurance ou dossier</Typography>
                                        </Box>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        startIcon={<PrintIcon />}
                                        onClick={() => handlePrintAction('invoice_a4')}
                                        disabled={generatingPdf || !order.lab_invoice}
                                    >
                                        Générer PDF A4
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
                                        data-testid="lab-dispatch-btn-labels"
                                        variant="outlined"
                                        startIcon={<PrintIcon />}
                                        onClick={() => handlePrintAction('tube_labels')}
                                        disabled={generatingPdf}
                                    >
                                        Imprimer Étiquettes
                                    </Button>
                                </Paper>

                            </Stack>

                            <Divider sx={{ my: 4 }} />

                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
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
                                <Button
                                    variant="outlined"
                                    startIcon={<PdfIcon />}
                                    onClick={() => setInvoicePdfModalOpen(true)}
                                    disabled={!order.lab_invoice}
                                    size="large"
                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                >
                                    Facture Détaillée
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<ReceiptIcon />}
                                    onClick={() => setReceiptModalOpen(true)}
                                    size="large"
                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                >
                                    Imprimer Reçu
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

        <PrintModal
            open={receiptModalOpen}
            onClose={() => setReceiptModalOpen(false)}
            title="Reçu de Caisse"
            loading={generatingReceipt}
            onPreview={() => handleReceiptAction('preview')}
            onPrint={() => handleReceiptAction('print')}
            onDownload={() => handleReceiptAction('download')}
            helpText="Choisissez une action pour générer le reçu thermique"
        />

        <PrintModal
            open={invoicePdfModalOpen}
            onClose={() => setInvoicePdfModalOpen(false)}
            title="Facture Détaillée (A4)"
            loading={generatingPdf}
            onPreview={() => handleInvoicePDFAction('preview')}
            onPrint={() => handleInvoicePDFAction('print')}
            onDownload={() => handleInvoicePDFAction('download')}
            helpText="Choisissez une action pour générer la facture A4"
        />
        </>
    );
};

export default LabOrderDispatch;
