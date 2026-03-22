import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Typography, Paper, CircularProgress, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Select, MenuItem, FormControl, InputLabel, Divider, Stack, Card, CardContent,
} from '@mui/material';
import {
    Business as BusinessIcon,
    TrendingUp as RevenueIcon,
    Assignment as OrderIcon,
    People as PeopleIcon,
    Science as ScienceIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import healthcareAnalyticsAPI from '../../../services/healthcareAnalyticsAPI';
import laboratoryAPI from '../../../services/laboratoryAPI';
import DateRangeSelector from '../../../components/analytics/DateRangeSelector';
import BackButton from '../../../components/navigation/BackButton';
import dayjs from 'dayjs';

const fmt = v => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(v || 0);
const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatCard = ({ title, value, icon, color }) => (
    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: `${color}15` }}>
                {React.cloneElement(icon, { sx: { color, fontSize: 24 } })}
            </Box>
            <Box>
                <Typography variant="caption" color="text.secondary">{title}</Typography>
                <Typography variant="h6" fontWeight="700">{value}</Typography>
            </Box>
        </Box>
    </Paper>
);

const STATUS_LABELS = {
    pending: 'En attente', sample_collected: 'Prélevé', in_progress: 'En cours',
    completed: 'Terminé', results_ready: 'Résultats prêts', results_delivered: 'Remis', cancelled: 'Annulé',
};
const STATUS_COLORS = {
    pending: '#f59e0b', sample_collected: '#3b82f6', in_progress: '#8b5cf6',
    completed: '#10b981', results_ready: '#06b6d4', results_delivered: '#22c55e', cancelled: '#ef4444',
};

const SubcontractorStats = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subcontractors, setSubcontractors] = useState([]);
    const [selectedSub, setSelectedSub] = useState('');
    const [dateRange, setDateRange] = useState({
        start_date: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
        end_date: dayjs().format('YYYY-MM-DD'),
    });

    useEffect(() => {
        laboratoryAPI.getSubcontractors({ active_only: 'true' }).then(d => {
            setSubcontractors(Array.isArray(d) ? d : d.results || []);
        });
    }, []);

    useEffect(() => { fetchStats(); }, [dateRange, selectedSub]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const result = await healthcareAnalyticsAPI.getSubcontractorStats({
                ...dateRange,
                subcontractor_id: selectedSub || undefined,
            });
            setData(result);
        } catch { }
        finally { setLoading(false); }
    };

    const summary = data?.summary || {};
    const bySub = data?.by_subcontractor || [];

    return (
        <Box p={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <BackButton to="/healthcare/laboratory/subcontractors" />
                    <Box>
                        <Typography variant="h5" fontWeight="700">Statistiques Sous-traitance</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Volume, revenus et performances par laboratoire sous-traitant
                        </Typography>
                    </Box>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Sous-traitant</InputLabel>
                        <Select value={selectedSub} label="Sous-traitant" onChange={e => setSelectedSub(e.target.value)}>
                            <MenuItem value="">Tous les sous-traitants</MenuItem>
                            {subcontractors.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <DateRangeSelector value={dateRange} onChange={setDateRange} />
                </Stack>
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
            ) : (
                <>
                    {/* KPIs */}
                    <Grid container spacing={2} mb={3}>
                        <Grid item xs={6} sm={3}>
                            <StatCard title="Commandes" value={summary.total_orders || 0} icon={<OrderIcon />} color="#2563eb" />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <StatCard title="Patients" value={summary.total_patients || 0} icon={<PeopleIcon />} color="#10b981" />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <StatCard title="CA encaissé" value={fmt(summary.revenue_paid)} icon={<RevenueIcon />} color="#f59e0b" />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <StatCard title="En attente paiement" value={fmt(summary.revenue_pending)} icon={<RevenueIcon />} color="#ef4444" />
                        </Grid>
                    </Grid>

                    {bySub.length === 0 ? (
                        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}>
                            <BusinessIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                            <Typography color="text.secondary">Aucune commande sous-traitée sur cette période</Typography>
                        </Paper>
                    ) : (
                        <Grid container spacing={3}>
                            {/* Tableau récap par sous-traitant */}
                            <Grid item xs={12} md={7}>
                                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                    <Box p={2}><Typography variant="subtitle1" fontWeight="700">Par laboratoire sous-traitant</Typography></Box>
                                    <Divider />
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                                    <TableCell>Laboratoire</TableCell>
                                                    <TableCell align="center">Commandes</TableCell>
                                                    <TableCell align="center">Patients</TableCell>
                                                    <TableCell align="right">CA payé</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {bySub.map((s, i) => (
                                                    <TableRow key={s.id} hover>
                                                        <TableCell>
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length] }} />
                                                                <Typography variant="body2" fontWeight="600">{s.name}</Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="center">{s.orders_count}</TableCell>
                                                        <TableCell align="center">{s.patients_count}</TableCell>
                                                        <TableCell align="right">{fmt(s.revenue_paid)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            </Grid>

                            {/* Pie CA par sous-traitant */}
                            <Grid item xs={12} md={5}>
                                <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                                    <Typography variant="subtitle1" fontWeight="700" mb={1}>Répartition CA</Typography>
                                    {bySub.some(s => s.revenue_paid > 0) ? (
                                        <ResponsiveContainer width="100%" height={220}>
                                            <PieChart>
                                                <Pie
                                                    data={bySub.filter(s => s.revenue_paid > 0).map(s => ({ name: s.name, value: s.revenue_paid }))}
                                                    cx="50%" cy="50%" outerRadius={80} dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    labelLine={false}
                                                >
                                                    {bySub.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={v => fmt(v)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <Typography color="text.secondary" variant="body2">Aucun CA payé sur la période</Typography>
                                    )}
                                </Paper>
                            </Grid>

                            {/* Détail par sous-traitant */}
                            {bySub.map((s, i) => (
                                <Grid item xs={12} md={6} key={s.id}>
                                    <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length] }} />
                                            <Typography variant="subtitle1" fontWeight="700">{s.name}</Typography>
                                        </Box>

                                        {/* Statuts */}
                                        {Object.keys(s.status_breakdown || {}).length > 0 && (
                                            <Box mb={2}>
                                                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Statuts des commandes</Typography>
                                                <Box display="flex" flexWrap="wrap" gap={0.5}>
                                                    {Object.entries(s.status_breakdown).map(([status, count]) => (
                                                        <Chip
                                                            key={status} size="small"
                                                            label={`${STATUS_LABELS[status] || status}: ${count}`}
                                                            sx={{ bgcolor: `${STATUS_COLORS[status] || '#94a3b8'}20`, color: STATUS_COLORS[status] || '#64748b', fontSize: 11 }}
                                                        />
                                                    ))}
                                                </Box>
                                            </Box>
                                        )}

                                        {/* Top examens */}
                                        {s.top_tests?.length > 0 && (
                                            <>
                                                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Top examens</Typography>
                                                <Table size="small">
                                                    <TableBody>
                                                        {s.top_tests.map(t => (
                                                            <TableRow key={t.code}>
                                                                <TableCell sx={{ py: 0.5, px: 0 }}>
                                                                    <Chip label={t.code} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                                                                </TableCell>
                                                                <TableCell sx={{ py: 0.5 }}><Typography variant="caption">{t.name}</Typography></TableCell>
                                                                <TableCell align="right" sx={{ py: 0.5 }}>
                                                                    <Typography variant="caption" fontWeight="700">{t.count}×</Typography>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </>
                                        )}
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </>
            )}
        </Box>
    );
};

export default SubcontractorStats;
