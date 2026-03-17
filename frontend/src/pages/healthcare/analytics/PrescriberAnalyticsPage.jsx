import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Grid, Chip, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    FormControl, InputLabel, Select, MenuItem, Autocomplete, TextField, Stack,
} from '@mui/material';
import {
    People as PeopleIcon,
    AttachMoney as MoneyIcon,
    Science as LabIcon,
    AccountBalance as CommissionIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DateNavigator from '../../../components/common/DateNavigator';
import useCurrency from '../../../hooks/useCurrency';
import healthcareAnalyticsAPI from '../../../services/healthcareAnalyticsAPI';
import laboratoryAPI from '../../../services/laboratoryAPI';
import BackButton from '../../../components/navigation/BackButton';

const KpiCard = ({ icon, label, value, color = 'primary' }) => (
    <Card variant="outlined">
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
                sx={{
                    bgcolor: `${color}.light`,
                    borderRadius: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {React.cloneElement(icon, { sx: { color: `${color}.main`, fontSize: 28 } })}
            </Box>
            <Box>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="h6" fontWeight={700}>{value}</Typography>
            </Box>
        </CardContent>
    </Card>
);

export default function PrescriberAnalyticsPage() {
    const { format: formatCurrency } = useCurrency();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState('month');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedPrescriber, setSelectedPrescriber] = useState(null);
    const [prescribers, setPrescribers] = useState([]);
    const [data, setData] = useState(null);

    useEffect(() => {
        laboratoryAPI.getPrescribers({ active_only: true })
            .then(res => setPrescribers(Array.isArray(res) ? res : res.results || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [period, startDate, endDate, selectedPrescriber]);

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await healthcareAnalyticsAPI.getPrescriberAnalytics({
                period,
                start_date: startDate,
                end_date: endDate,
                prescriber_id: selectedPrescriber?.id || undefined,
            });
            setData(res);
        } catch {
            setError('Erreur lors du chargement des analytics prescripteurs');
        } finally {
            setLoading(false);
        }
    };

    const totalCommissions = data
        ? data.by_prescriber.reduce((sum, p) => sum + p.commission_amount, 0)
        : 0;
    const totalPatients = data
        ? data.by_prescriber.reduce((sum, p) => sum + p.patient_count, 0)
        : 0;
    const totalOrders = data
        ? data.by_prescriber.reduce((sum, p) => sum + p.orders_count, 0)
        : 0;

    return (
        <Box sx={{ p: 3 }}>
            <BackButton />
            <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
                Analyse Prescripteurs
            </Typography>

            {/* Filters */}
            <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start" flexWrap="wrap">
                        <DateNavigator
                            startDate={startDate}
                            endDate={endDate}
                            onStartDateChange={setStartDate}
                            onEndDateChange={setEndDate}
                        />
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Période</InputLabel>
                            <Select value={period} label="Période" onChange={e => setPeriod(e.target.value)}>
                                <MenuItem value="day">Jour</MenuItem>
                                <MenuItem value="week">Semaine</MenuItem>
                                <MenuItem value="month">Mois</MenuItem>
                            </Select>
                        </FormControl>
                        <Autocomplete
                            options={prescribers}
                            getOptionLabel={p => p.full_name || `${p.last_name} ${p.first_name}`}
                            value={selectedPrescriber}
                            onChange={(_, v) => setSelectedPrescriber(v)}
                            renderInput={params => (
                                <TextField {...params} label="Filtrer par prescripteur" size="small" sx={{ minWidth: 260 }} />
                            )}
                            isOptionEqualToValue={(a, b) => a.id === b.id}
                        />
                    </Stack>
                </CardContent>
            </Card>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : data && (
                <>
                    {/* KPI Cards */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <KpiCard
                                icon={<MoneyIcon />}
                                label="Revenu total"
                                value={formatCurrency(data.grand_total_revenue)}
                                color="primary"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <KpiCard
                                icon={<CommissionIcon />}
                                label="Commissions à payer"
                                value={formatCurrency(totalCommissions)}
                                color="warning"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <KpiCard
                                icon={<PeopleIcon />}
                                label="Patients distincts"
                                value={totalPatients.toLocaleString()}
                                color="success"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <KpiCard
                                icon={<LabIcon />}
                                label="Ordres de labo"
                                value={totalOrders.toLocaleString()}
                                color="info"
                            />
                        </Grid>
                    </Grid>

                    {/* Timeline chart */}
                    {data.timeline.length > 0 && (
                        <Card variant="outlined" sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                    Évolution du chiffre d'affaires
                                </Typography>
                                <ResponsiveContainer width="100%" height={240}>
                                    <LineChart data={data.timeline} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip formatter={v => formatCurrency(v)} />
                                        <Line type="monotone" dataKey="revenue" name="Revenu" stroke="#1976d2" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* Per-prescriber table */}
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                                Détail par prescripteur
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                                            <TableCell><strong>Prescripteur</strong></TableCell>
                                            <TableCell><strong>Cabinet</strong></TableCell>
                                            <TableCell align="right"><strong>Patients</strong></TableCell>
                                            <TableCell align="right"><strong>Ordres</strong></TableCell>
                                            <TableCell align="right"><strong>Revenu</strong></TableCell>
                                            <TableCell align="right"><strong>Part %</strong></TableCell>
                                            <TableCell align="right"><strong>Taux</strong></TableCell>
                                            <TableCell align="right"><strong>Montant à payer</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {data.by_prescriber.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                    Aucune donnée pour cette période
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            data.by_prescriber.map(row => (
                                                <TableRow key={row.prescriber_id} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={600}>{row.prescriber_name}</Typography>
                                                    </TableCell>
                                                    <TableCell>{row.clinic_name || '—'}</TableCell>
                                                    <TableCell align="right">{row.patient_count}</TableCell>
                                                    <TableCell align="right">{row.orders_count}</TableCell>
                                                    <TableCell align="right">{formatCurrency(row.total_revenue)}</TableCell>
                                                    <TableCell align="right">
                                                        <Chip label={`${row.revenue_share_pct} %`} size="small" variant="outlined" />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Chip label={`${row.commission_rate} %`} size="small" color="primary" variant="outlined" />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="body2" fontWeight={700} color="warning.main">
                                                            {formatCurrency(row.commission_amount)}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </>
            )}
        </Box>
    );
}
