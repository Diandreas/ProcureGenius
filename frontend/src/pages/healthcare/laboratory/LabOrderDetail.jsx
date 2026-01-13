import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Paper,
    Divider,
    Alert
} from '@mui/material';
import {
    Save as SaveIcon,
    CheckCircle as VerifyIcon,
    PictureAsPdf as PdfIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';

const LabOrderDetail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [results, setResults] = useState({}); // { item_id: { result_value, remarks } }

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const data = await laboratoryAPI.getOrder(id);
            setOrder(data);

            // Initialize results state
            const initialResults = {};
            if (data.items) {
                data.items.forEach(item => {
                    initialResults[item.id] = {
                        result_value: item.result_value || '',
                        remarks: item.remarks || ''
                    };
                });
            }
            setResults(initialResults);

        } catch (error) {
            console.error('Error fetching order:', error);
            enqueueSnackbar('Erreur de chargement', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleResultChange = (itemId, field, value) => {
        setResults(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [field]: value
            }
        }));
    };

    const saveResults = async () => {
        try {
            const itemsToUpdate = Object.keys(results).map(itemId => ({
                item_id: itemId,
                ...results[itemId]
            }));

            await laboratoryAPI.enterResults(id, { items: itemsToUpdate });
            enqueueSnackbar('Résultats enregistrés', { variant: 'success' });
            fetchOrder(); // Refresh to update status/flags
        } catch (error) {
            console.error('Error saving results:', error);
            enqueueSnackbar('Erreur de sauvegarde', { variant: 'error' });
        }
    };

    const finalizeOrder = async () => {
        try {
            if (!window.confirm('Voulez-vous valider ces résultats ? Cette action est définitive.')) return;

            await saveResults(); // Save first
            await laboratoryAPI.updateStatus(id, { status: 'verified' }); // Or results_delivered
            enqueueSnackbar('Résultats validés', { variant: 'success' });
            navigate('/healthcare/laboratory');
        } catch (error) {
            console.error('Error validating:', error);
            enqueueSnackbar('Erreur de validation', { variant: 'error' });
        }
    };

    const downloadPDF = async () => {
        try {
            const blob = await laboratoryAPI.getResultsPDF(id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `lab_result_${order.order_number}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading PDF:', error);
            enqueueSnackbar('Erreur de téléchargement du PDF', { variant: 'error' });
        }
    };

    if (loading) return <Typography>Chargement...</Typography>;
    if (!order) return <Typography>Commande introuvable</Typography>;

    const canEdit = ['pending', 'sample_collected', 'received', 'analyzing', 'results_entered'].includes(order.status);

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/healthcare/laboratory')} sx={{ mr: 2 }}>
                        Retour
                    </Button>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
                        Commande #{order.order_number}
                    </Typography>
                </Box>
                <Box>
                    {['results_entered', 'verified', 'results_delivered'].includes(order.status) && (
                        <Button variant="outlined" startIcon={<PdfIcon />} onClick={downloadPDF} sx={{ mr: 1 }}>
                            PDF
                        </Button>
                    )}

                    {canEdit && (
                        <>
                            <Button variant="contained" startIcon={<SaveIcon />} onClick={saveResults} sx={{ mr: 1 }}>
                                Enregistrer
                            </Button>
                            <Button variant="contained" color="success" startIcon={<VerifyIcon />} onClick={finalizeOrder}>
                                Valider
                            </Button>
                        </>
                    )}
                </Box>
            </Box>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Patient</Typography>
                            <Typography variant="body1" fontWeight="bold">{order.patient_name}</Typography>
                            <Typography variant="body2">{order.patient?.age} ans / {order.patient?.gender}</Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="caption" color="text.secondary">Prescripteur</Typography>
                            <Typography variant="body2">{order.ordered_by_name || '-'}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Statut & Priorité</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Statut Actuel</Typography>
                                    <Box sx={{ mt: 0.5 }}>
                                        <Chip label={order.status} color="primary" />
                                    </Box>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Priorité</Typography>
                                    <Box sx={{ mt: 0.5 }}>
                                        <Chip label={order.priority} color={order.priority === 'urgent' ? 'error' : 'default'} />
                                    </Box>
                                </Grid>
                                {order.clinical_notes && (
                                    <Grid item xs={12}>
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                            <strong>Notes Cliniques:</strong> {order.clinical_notes}
                                        </Alert>
                                    </Grid>
                                )}
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Test / Examen</TableCell>
                            <TableCell>Catégorie</TableCell>
                            <TableCell width="20%">Résultat</TableCell>
                            <TableCell>Unités</TableCell>
                            <TableCell>Valeurs de Référence</TableCell>
                            <TableCell>Commentaires / Notes</TableCell>
                            <TableCell>Flag</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {order.items?.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell fontWeight="500">{item.test_name}</TableCell>
                                <TableCell>{item.category_name}</TableCell>
                                <TableCell>
                                    {canEdit ? (
                                        <TextField
                                            fullWidth
                                            size="small"
                                            value={results[item.id]?.result_value || ''}
                                            onChange={(e) => handleResultChange(item.id, 'result_value', e.target.value)}
                                            placeholder="Entrer valeur"
                                        />
                                    ) : (
                                        <Typography fontWeight="bold">{item.result_value}</Typography>
                                    )}
                                </TableCell>
                                <TableCell>{item.unit || '-'}</TableCell>
                                <TableCell>
                                    {/* Simplified range display, ideally conditional on gender */}
                                    {item.normal_range || '-'}
                                </TableCell>
                                <TableCell>
                                    {canEdit ? (
                                        <TextField
                                            fullWidth
                                            size="small"
                                            value={results[item.id]?.remarks || ''}
                                            onChange={(e) => handleResultChange(item.id, 'remarks', e.target.value)}
                                        />
                                    ) : (
                                        item.remarks
                                    )}
                                </TableCell>
                                <TableCell>
                                    {item.is_abnormal && <Chip label="ANORMAL" color="error" size="small" />}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default LabOrderDetail;
