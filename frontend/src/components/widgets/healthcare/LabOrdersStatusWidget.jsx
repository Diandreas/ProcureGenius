import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Grid, Typography, Chip, CircularProgress,
    Paper, Stack, Alert
} from '@mui/material';
import {
    Science as LabIcon,
    Warning as WarningIcon,
    CheckCircle as OkIcon,
    AttachMoney as MoneyIcon,
    Assignment as OrderIcon,
} from '@mui/icons-material';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import * as widgetsAPI from '../../../services/widgetsAPI';

const STATUS_CONFIG = {
    pending:           { label: 'En attente',        color: '#f59e0b', chipColor: 'warning' },
    sample_collected:  { label: 'Prélevé',           color: '#3b82f6', chipColor: 'info' },
    in_progress:       { label: 'En analyse',        color: '#8b5cf6', chipColor: 'secondary' },
    completed:         { label: 'Résultats saisis',  color: '#10b981', chipColor: 'success' },
    results_ready:     { label: 'Validé',            color: '#06b6d4', chipColor: 'info' },
    results_delivered: { label: 'Remis',             color: '#22c55e', chipColor: 'success' },
};

const formatCurrency = (v) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(v || 0);

const KpiCard = ({ label, value, icon, color }) => (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderTop: 3, borderTopColor: color }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: `${color}18` }}>
                    {React.cloneElement(icon, { sx: { fontSize: 20, color } })}
                </Box>
                <Typography variant="h5" fontWeight="800" color={color}>{value}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" fontWeight="600" mt={0.5} display="block">
                {label}
            </Typography>
        </CardContent>
    </Card>
);

const LabOrdersStatusWidget = ({ period = 'last_30_days', dateRange }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const params = { period, compare: true };
                if (dateRange?.start_date) params.start_date = dateRange.start_date;
                if (dateRange?.end_date) params.end_date = dateRange.end_date;
                const response = await widgetsAPI.getWidgetData('lab_orders_status', params);
                if (response.success) setData(response.data);
            } catch (error) {
                console.error('Error fetching laboratory data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [period, dateRange]);

    if (loading) {
        return (
            <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary" mt={1}>Chargement...</Typography>
            </Paper>
        );
    }

    if (!data) {
        return (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Typography color="text.secondary" variant="body2">Données indisponibles</Typography>
            </Paper>
        );
    }

    const stats = data.laboratory || {};
    const byStatus = stats.by_status || {};

    const chartData = Object.entries(byStatus)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
            name: STATUS_CONFIG[key]?.label || key,
            value,
            color: STATUS_CONFIG[key]?.color || '#94a3b8',
        }));

    const activeOrders = (byStatus.pending || 0) + (byStatus.sample_collected || 0) +
        (byStatus.in_progress || 0) + (byStatus.completed || 0) + (byStatus.results_ready || 0);

    return (
        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
                <LabIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="700">Activité Laboratoire</Typography>
            </Box>

            {/* KPI cards */}
            <Grid container spacing={1.5} mb={2}>
                <Grid item xs={6}>
                    <KpiCard label="Commandes totales" value={stats.total_orders || 0}
                        icon={<OrderIcon />} color="#2563eb" />
                </Grid>
                <Grid item xs={6}>
                    <KpiCard label="Actives en cours" value={activeOrders}
                        icon={<LabIcon />} color="#8b5cf6" />
                </Grid>
                <Grid item xs={12}>
                    <KpiCard label="Revenus (période)" value={formatCurrency(stats.revenue)}
                        icon={<MoneyIcon />} color="#10b981" />
                </Grid>
            </Grid>

            {/* Alerte critiques */}
            {stats.critical_results > 0 && (
                <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2, py: 0.5 }}>
                    <strong>{stats.critical_results}</strong> résultat{stats.critical_results > 1 ? 's' : ''} critique{stats.critical_results > 1 ? 's' : ''} à traiter
                </Alert>
            )}

            {/* Pie chart */}
            {chartData.length > 0 && (
                <Box mb={2}>
                    <Typography variant="caption" color="text.secondary" fontWeight="700" display="block" mb={1}>
                        RÉPARTITION PAR STATUT
                    </Typography>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={chartData} cx="50%" cy="50%" outerRadius={65}
                                dataKey="value" labelLine={false}
                                label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}>
                                {chartData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v, name) => [v, name]} />
                            <Legend iconType="circle" iconSize={10}
                                formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>} />
                        </PieChart>
                    </ResponsiveContainer>
                </Box>
            )}

            {/* Détail statuts */}
            <Stack spacing={0.5}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const count = byStatus[key] || 0;
                    if (!count) return null;
                    return (
                        <Box key={key} display="flex" alignItems="center" justifyContent="space-between">
                            <Box display="flex" alignItems="center" gap={1}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
                                <Typography variant="caption" color="text.secondary">{cfg.label}</Typography>
                            </Box>
                            <Chip label={count} size="small" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700, bgcolor: `${cfg.color}20`, color: cfg.color }} />
                        </Box>
                    );
                })}
            </Stack>
        </Paper>
    );
};

export default LabOrdersStatusWidget;
