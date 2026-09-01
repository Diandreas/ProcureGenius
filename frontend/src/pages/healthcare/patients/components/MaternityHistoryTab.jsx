import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Chip, Stack, Button, Alert, Grid } from '@mui/material';
import { PregnantWoman as MaternityIcon, ChildCare as ChildIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import maternityAPI from '../../../../services/maternityAPI';
import { formatDate } from '../../../../utils/formatters';

const STATUS_LABELS = { ongoing: 'En cours', delivered: 'Accouchée', terminated: 'Interrompue' };
const STATUS_COLORS = { ongoing: 'info', delivered: 'success', terminated: 'default' };

const MaternityHistoryTab = ({ patientId, initialInfo }) => {
    const navigate = useNavigate();
    const [info, setInfo] = useState(initialInfo || null);
    const [loading, setLoading] = useState(!initialInfo);

    useEffect(() => {
        if (initialInfo) { setInfo(initialInfo); setLoading(false); return; }
        if (!patientId) return;
        maternityAPI.getPatientMaternityInfo(patientId).then(setInfo).catch(() => setInfo(null)).finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, initialInfo]);

    if (loading) return null;

    const pregnancies = info?.pregnancies || [];
    const asChild = info?.as_child_of;

    if (pregnancies.length === 0 && !asChild) {
        return (
            <Box>
                <Alert severity="info" sx={{ mb: 2 }}>Aucun dossier de grossesse pour ce patient.</Alert>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate(`/healthcare/maternity/new?patientId=${patientId}`)}>
                    Créer un dossier de grossesse
                </Button>
            </Box>
        );
    }

    return (
        <Box>
            {asChild && (
                <Card sx={{ mb: 2, bgcolor: 'info.50' }}>
                    <CardContent>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <ChildIcon sx={{ color: 'info.main' }} />
                            <Typography variant="body2">
                                Ce patient est enregistré comme nouveau-né de{' '}
                                <Button size="small" onClick={() => navigate(`/healthcare/patients/${asChild.mother_patient_id}`)}>
                                    {asChild.mother_name}
                                </Button>
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {pregnancies.length > 0 && (
                <>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Typography variant="subtitle1" fontWeight="700">Dossiers de grossesse</Typography>
                        <Button size="small" startIcon={<AddIcon />} onClick={() => navigate(`/healthcare/maternity/new?patientId=${patientId}`)}>
                            Nouveau dossier
                        </Button>
                    </Stack>
                    <Grid container spacing={2}>
                        {pregnancies.map(p => (
                            <Grid item xs={12} sm={6} key={p.id}>
                                <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={() => navigate(`/healthcare/maternity/${p.id}`)}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <MaternityIcon sx={{ color: '#ec4899' }} />
                                                <Typography variant="body2" fontWeight="600">
                                                    Grossesse du {formatDate(p.created_at)}
                                                </Typography>
                                            </Stack>
                                            <Chip size="small" label={STATUS_LABELS[p.status] || p.status} color={STATUS_COLORS[p.status] || 'default'} />
                                        </Stack>
                                        {p.expected_delivery_date && (
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                                DPA : {formatDate(p.expected_delivery_date)}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}
        </Box>
    );
};

export default MaternityHistoryTab;
