import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Card, CardContent, Grid, TextField, Typography, Chip, Stack,
    Divider, IconButton, Checkbox, FormControlLabel, CircularProgress, Paper,
    List, ListItem, ListItemText, ListItemSecondaryAction, Tooltip,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon, Save as SaveIcon, Print as PrintIcon,
    Receipt as ReceiptIcon, CloudUpload as UploadIcon, Delete as DeleteIcon,
    PlayArrow as StartIcon, CheckCircle as ReadyIcon, LocalShipping as DeliverIcon,
    Cancel as CancelIcon, InsertDriveFile as FileIcon, Image as ImageIcon,
    Replay as RepresribeIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import imagingAPI from '../../../services/imagingAPI';
import LoadingState from '../../../components/LoadingState';
import { formatDate as formatDisplayDate } from '../../../utils/formatters';

const STATUS_LABELS = {
    prescribed: 'Prescrit',
    in_progress: 'En cours',
    results_ready: 'Résultats prêts',
    results_delivered: 'Résultats livrés',
    cancelled: 'Annulé',
};

const STATUS_COLORS = {
    prescribed: 'default',
    in_progress: 'warning',
    results_ready: 'success',
    results_delivered: 'success',
    cancelled: 'error',
};

const ImagingOrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingItemId, setUploadingItemId] = useState(null);
    const [drafts, setDrafts] = useState({}); // { itemId: { report_text, technician_notes, is_urgent_finding } }

    const loadOrder = useCallback(async () => {
        setLoading(true);
        try {
            const data = await imagingAPI.getOrder(id);
            setOrder(data);
            const initialDrafts = {};
            (data.items || []).forEach(item => {
                initialDrafts[item.id] = {
                    report_text: item.report_text || '',
                    technician_notes: item.technician_notes || '',
                    is_urgent_finding: item.is_urgent_finding || false,
                };
            });
            setDrafts(initialDrafts);
        } catch (error) {
            console.error('Error loading imaging order:', error);
            enqueueSnackbar('Erreur lors du chargement de la commande', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [id, enqueueSnackbar]);

    useEffect(() => { loadOrder(); }, [loadOrder]);

    const handleDraftChange = (itemId, field, value) => {
        setDrafts(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
    };

    const handleSaveResults = async () => {
        setSaving(true);
        try {
            const items = Object.entries(drafts).map(([item_id, d]) => ({ item_id, ...d }));
            await imagingAPI.enterResults(id, { items });
            enqueueSnackbar('Résultats enregistrés', { variant: 'success' });
            await loadOrder();
        } catch (error) {
            console.error('Error saving results:', error);
            enqueueSnackbar('Erreur lors de l\'enregistrement des résultats', { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (itemId, e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploadingItemId(itemId);
        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                await imagingAPI.uploadResultFile(itemId, formData);
            }
            enqueueSnackbar(`${files.length} fichier(s) ajouté(s)`, { variant: 'success' });
            await loadOrder();
        } catch (error) {
            console.error('Error uploading file:', error);
            enqueueSnackbar('Erreur lors de l\'envoi du fichier', { variant: 'error' });
        } finally {
            setUploadingItemId(null);
            e.target.value = '';
        }
    };

    const handleDeleteFile = async (fileId) => {
        try {
            await imagingAPI.deleteResultFile(fileId);
            enqueueSnackbar('Fichier supprimé', { variant: 'success' });
            await loadOrder();
        } catch (error) {
            console.error('Error deleting file:', error);
            enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
        }
    };

    const handleStatusAction = async (action) => {
        try {
            await imagingAPI.updateStatus(id, { action });
            enqueueSnackbar('Statut mis à jour', { variant: 'success' });
            await loadOrder();
        } catch (error) {
            console.error('Error updating status:', error);
            enqueueSnackbar('Erreur lors du changement de statut', { variant: 'error' });
        }
    };

    const handlePrintPDF = async () => {
        try {
            const blob = await imagingAPI.getResultsPDF(id);
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error generating PDF:', error);
            enqueueSnackbar('Erreur lors de la génération du PDF', { variant: 'error' });
        }
    };

    const handleGenerateInvoice = async () => {
        try {
            await imagingAPI.generateInvoice(id);
            enqueueSnackbar('Facture générée avec succès', { variant: 'success' });
            await loadOrder();
        } catch (error) {
            const msg = error?.response?.data?.error || 'Erreur lors de la génération de la facture';
            enqueueSnackbar(msg, { variant: 'error' });
        }
    };

    if (loading) return <LoadingState />;
    if (!order) return null;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/imaging')}>Retour</Button>
                    <Typography variant="h5" fontWeight={700}>{order.order_number}</Typography>
                    <Chip label={STATUS_LABELS[order.status] || order.status} color={STATUS_COLORS[order.status] || 'default'} />
                    {order.priority === 'urgent' && <Chip label="URGENT" color="error" size="small" />}
                    {order.is_subcontracted && <Chip label={`↗ ${order.subcontractor_name}`} color="secondary" size="small" />}
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<RepresribeIcon />}
                        onClick={() => navigate(`/healthcare/imaging/new?patientId=${order.patient}&represcribe=${order.id}`)}
                    >
                        Représcrire
                    </Button>
                    <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrintPDF}>Imprimer le rapport</Button>
                    {!order.imaging_invoice && (
                        <Button variant="outlined" color="secondary" startIcon={<ReceiptIcon />} onClick={handleGenerateInvoice}>
                            Générer la facture
                        </Button>
                    )}
                </Stack>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Patient</Typography>
                            <Typography fontWeight={600}>{order.patient_name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {order.patient_number} — {order.patient_age} ans, {order.patient_gender}
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="body2"><strong>Date :</strong> {formatDisplayDate(order.order_date)}</Typography>
                            {order.prescriber_name && (
                                <Typography variant="body2"><strong>Prescripteur :</strong> {order.prescriber_name}</Typography>
                            )}
                            {order.clinical_notes && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="body2" fontWeight={600}>Indication clinique</Typography>
                                    <Typography variant="body2" color="text.secondary">{order.clinical_notes}</Typography>
                                </>
                            )}
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="body2"><strong>Total :</strong> {new Intl.NumberFormat('fr-FR').format(order.total_price)} XAF</Typography>
                            {order.imaging_invoice && (
                                <Chip
                                    icon={<ReceiptIcon />}
                                    label={`Facture ${order.imaging_invoice.invoice_number} (${order.imaging_invoice.status})`}
                                    color="success"
                                    variant="outlined"
                                    clickable
                                    onClick={() => navigate(`/invoices/${order.imaging_invoice.id}`)}
                                    sx={{ mt: 1, width: '100%' }}
                                />
                            )}
                            {order.linked_lab_order && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Chip
                                        label={`Commande labo liée : ${order.linked_lab_order.order_number} (${order.linked_lab_order.status})`}
                                        color="secondary"
                                        variant="outlined"
                                        clickable
                                        onClick={() => navigate(`/healthcare/laboratory/${order.linked_lab_order.id}`)}
                                        sx={{ width: '100%' }}
                                    />
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Actions</Typography>
                            <Stack spacing={1}>
                                {order.status === 'prescribed' && (
                                    <Button variant="outlined" startIcon={<StartIcon />} onClick={() => handleStatusAction('start_processing')}>
                                        Démarrer l'examen
                                    </Button>
                                )}
                                {['prescribed', 'in_progress'].includes(order.status) && (
                                    <Button variant="outlined" color="success" startIcon={<ReadyIcon />} onClick={() => handleStatusAction('mark_results_ready')}>
                                        Marquer résultats prêts
                                    </Button>
                                )}
                                {order.status === 'results_ready' && (
                                    <Button variant="contained" color="success" startIcon={<DeliverIcon />} onClick={() => handleStatusAction('deliver')}>
                                        Remettre au patient
                                    </Button>
                                )}
                                {!['results_delivered', 'cancelled'].includes(order.status) && (
                                    <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleStatusAction('cancel')}>
                                        Annuler la commande
                                    </Button>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    {(order.items || []).map((item) => {
                        const draft = drafts[item.id] || { report_text: '', technician_notes: '', is_urgent_finding: false };
                        return (
                            <Card key={item.id} sx={{ mb: 2 }}>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Typography variant="h6">{item.exam_type_detail?.name}</Typography>
                                        <Chip label={item.exam_type_detail?.modality_display} size="small" variant="outlined" />
                                    </Stack>

                                    <TextField
                                        fullWidth multiline rows={4} label="Compte-rendu"
                                        value={draft.report_text}
                                        onChange={(e) => handleDraftChange(item.id, 'report_text', e.target.value)}
                                        placeholder="Constatations et conclusion..."
                                        sx={{ mb: 2 }}
                                    />
                                    <TextField
                                        fullWidth multiline rows={2} label="Notes internes (non visibles sur le rapport patient)"
                                        value={draft.technician_notes}
                                        onChange={(e) => handleDraftChange(item.id, 'technician_notes', e.target.value)}
                                        sx={{ mb: 2 }}
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={draft.is_urgent_finding}
                                                onChange={(e) => handleDraftChange(item.id, 'is_urgent_finding', e.target.checked)}
                                                color="error"
                                            />
                                        }
                                        label="Découverte urgente à signaler"
                                    />

                                    <Divider sx={{ my: 2 }} />

                                    <Typography variant="subtitle2" gutterBottom>Images / documents joints</Typography>
                                    <List dense>
                                        {(item.result_files || []).map((f) => (
                                            <ListItem key={f.id} sx={{ bgcolor: 'action.hover', borderRadius: 1, mb: 0.5 }}>
                                                {f.file_type === 'image' ? <ImageIcon sx={{ mr: 1 }} /> : <FileIcon sx={{ mr: 1 }} />}
                                                <ListItemText
                                                    primary={f.caption || f.file.split('/').pop()}
                                                    secondary={f.file_type === 'image' ? 'Image' : 'PDF'}
                                                />
                                                <ListItemSecondaryAction>
                                                    <Tooltip title="Ouvrir">
                                                        <IconButton size="small" component="a" href={f.file} target="_blank" rel="noreferrer">
                                                            <PrintIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteFile(f.id)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        ))}
                                    </List>

                                    <Button
                                        component="label"
                                        variant="outlined"
                                        size="small"
                                        startIcon={uploadingItemId === item.id ? <CircularProgress size={16} /> : <UploadIcon />}
                                        disabled={uploadingItemId === item.id}
                                        sx={{ mt: 1 }}
                                    >
                                        Ajouter image / PDF
                                        <input
                                            type="file"
                                            hidden
                                            multiple
                                            accept="image/*,.pdf"
                                            onChange={(e) => handleFileUpload(item.id, e)}
                                        />
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}

                    <Paper sx={{ p: 2, position: 'sticky', bottom: 16, display: 'flex', justifyContent: 'flex-end' }} elevation={4}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
                            onClick={handleSaveResults}
                            disabled={saving}
                        >
                            Enregistrer les résultats
                        </Button>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ImagingOrderDetail;
