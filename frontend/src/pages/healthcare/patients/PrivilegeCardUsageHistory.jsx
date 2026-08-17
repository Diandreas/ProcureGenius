import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import patientAPI from '../../../services/patientAPI';
import LoadingState from '../../../components/LoadingState';
import BackButton from '../../../components/navigation/BackButton';

const MODULE_LABELS = {
    laboratory: 'Laboratoire',
    imaging: 'Imagerie',
    pharmacy: 'Pharmacie',
    consultation: 'Consultation',
};

export default function PrivilegeCardUsageHistory() {
    const { id } = useParams();
    const { enqueueSnackbar } = useSnackbar();
    const [patient, setPatient] = useState(null);
    const [usages, setUsages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            patientAPI.getPatient(id),
            patientAPI.getPrivilegeCardUsages(id),
        ]).then(([patientData, usageData]) => {
            setPatient(patientData);
            setUsages(Array.isArray(usageData) ? usageData : usageData.results || []);
        }).catch(() => {
            enqueueSnackbar("Erreur lors du chargement de l'historique", { variant: 'error' });
        }).finally(() => setLoading(false));
    }, [id, enqueueSnackbar]);

    if (loading) return <LoadingState />;

    const totalSaved = usages.reduce((sum, u) => sum + (parseFloat(u.discount_amount) || 0), 0);

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <BackButton />
            <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5, mt: 1 }}>
                Historique Carte Privilège{patient ? ` — ${patient.name}` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {usages.length} passage{usages.length > 1 ? 's' : ''} · {new Intl.NumberFormat('fr-FR').format(totalSaved)} FCFA économisés au total
            </Typography>

            <Card>
                <CardContent sx={{ p: 0 }}>
                    <TableContainer component={Paper} elevation={0}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Module</TableCell>
                                    <TableCell>Utilisé par</TableCell>
                                    <TableCell>Facture</TableCell>
                                    <TableCell align="right">Montant économisé</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {usages.map(u => (
                                    <TableRow key={u.id} hover>
                                        <TableCell>{dayjs(u.used_at).format('DD/MM/YYYY HH:mm')}</TableCell>
                                        <TableCell>
                                            <Chip size="small" label={MODULE_LABELS[u.module] || u.module} variant="outlined" />
                                        </TableCell>
                                        <TableCell>{u.used_by_display}</TableCell>
                                        <TableCell>{u.invoice_number || '—'}</TableCell>
                                        <TableCell align="right">
                                            {new Intl.NumberFormat('fr-FR').format(u.discount_amount)} FCFA
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {usages.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <Typography color="text.secondary" sx={{ py: 3 }}>
                                                Aucune utilisation de la carte privilège pour l'instant
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
}
