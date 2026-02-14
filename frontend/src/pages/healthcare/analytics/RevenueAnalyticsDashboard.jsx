import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Grid, Tabs, CircularProgress, Alert, Chip, Stack, useTheme, Paper, Avatar, Divider, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { SafeTab } from '../../../components/safe';
import { alpha } from '@mui/material/styles';
import {
    TrendingUp as TrendingUpIcon,
    AttachMoney as MoneyIcon,
    Receipt as ReceiptIcon,
    ShowChart as ChartIcon,
    LocalHospital as ConsultationIcon,
    Science as LabIcon,
    LocalPharmacy as PharmacyIcon,
    Description as StandardIcon,
    CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DateNavigator from '../../../components/common/DateNavigator';
import useCurrency from '../../../hooks/useCurrency';
import api from '../../../services/api';

const RevenueAnalyticsDashboard = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const { format: formatCurrency } = useCurrency();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState('day');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchRevenueAnalytics();
    }, [period, startDate, endDate]);

    const fetchRevenueAnalytics = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                period,
                ...(startDate && { start_date: startDate }),
                ...(endDate && { end_date: endDate }),
            });
            const response = await api.get(`/analytics/healthcare/revenue-enhanced/?${params}`);
            setData(response.data);
        } catch (err) {
            console.error('Error fetching revenue analytics:', err);
            setError('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const handlePeriodChange = (event, newValue) => {
        setPeriod(newValue);
    };

    const getActivityIcon = (activityType) => {
        switch (activityType) {
            case 'healthcare_consultation':
                return <ConsultationIcon />;
            case 'healthcare_laboratory':
                return <LabIcon />;
            case 'healthcare_pharmacy':
                return <PharmacyIcon />;
            default:
                return <StandardIcon />;
        }
    };

    const getActivityColor = (activityType) => {
        switch (activityType) {
            case 'healthcare_consultation':
                return theme.palette.info.main;
            case 'healthcare_laboratory':
                return theme.palette.success.main;
            case 'healthcare_pharmacy':
                return theme.palette.warning.main;
            default:
                return theme.palette.primary.main;
        }
    };

    const CHART_COLORS = [
        theme.palette.primary.main,
        theme.palette.info.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.error.main,
        theme.palette.secondary.main,
    ];

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress size={48} />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                    Tableau de Bord - Chiffre d'Affaires
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Analyse du chiffre d'affaires par jour, semaine et mois
                </Typography>
            </Box>

            {/* Period Selector & Date Range */}
            <Paper sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <Tabs value={period} onChange={handlePeriodChange} variant="fullWidth">
                                <SafeTab label="Jour" value="day" />
                                <SafeTab label="Semaine" value="week" />
                                <SafeTab label="Mois" value="month" />
                            </Tabs>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <DateNavigator
                                selectedDate={startDate}
                                onDateChange={(date) => setStartDate(date)}
                                label="Date de début"
                            />
                        </Grid>
                    </Grid>
                </Box>
            </Paper>

            {data && (
                <>
                    {/* Summary Cards */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={4}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card
                                    sx={{
                                        borderRadius: 3,
                                        background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.12)}, ${alpha(theme.palette.success.main, 0.04)})`,
                                        border: `2px solid ${alpha(theme.palette.success.main, 0.2)}`,
                                        position: 'relative',
                                        overflow: 'hidden',
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: 4,
                                            background: `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.success.light})`,
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Avatar
                                                sx={{
                                                    width: 56,
                                                    height: 56,
                                                    bgcolor: alpha(theme.palette.success.main, 0.15),
                                                    color: theme.palette.success.main,
                                                }}
                                            >
                                                <MoneyIcon fontSize="large" />
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                    Chiffre d'Affaires Total
                                                </Typography>
                                                <Typography
                                                    variant="h4"
                                                    fontWeight={800}
                                                    sx={{
                                                        background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                                                        backgroundClip: 'text',
                                                        WebkitBackgroundClip: 'text',
                                                        WebkitTextFillColor: 'transparent',
                                                    }}
                                                >
                                                    {formatCurrency(data.total_stats.total_revenue)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {data.total_stats.total_invoices} factures payées
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                            >
                                <Card
                                    sx={{
                                        borderRadius: 3,
                                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.primary.main, 0.04)})`,
                                        border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                        position: 'relative',
                                        overflow: 'hidden',
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: 4,
                                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Avatar
                                                sx={{
                                                    width: 56,
                                                    height: 56,
                                                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                                                    color: theme.palette.primary.main,
                                                }}
                                            >
                                                <ReceiptIcon fontSize="large" />
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                    Nombre de Factures
                                                </Typography>
                                                <Typography variant="h4" fontWeight={800} color="primary.main">
                                                    {data.total_stats.total_invoices}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Factures payées
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                            >
                                <Card
                                    sx={{
                                        borderRadius: 3,
                                        background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.12)}, ${alpha(theme.palette.info.main, 0.04)})`,
                                        border: `2px solid ${alpha(theme.palette.info.main, 0.2)}`,
                                        position: 'relative',
                                        overflow: 'hidden',
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: 4,
                                            background: `linear-gradient(90deg, ${theme.palette.info.main}, ${theme.palette.info.light})`,
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Avatar
                                                sx={{
                                                    width: 56,
                                                    height: 56,
                                                    bgcolor: alpha(theme.palette.info.main, 0.15),
                                                    color: theme.palette.info.main,
                                                }}
                                            >
                                                <TrendingUpIcon fontSize="large" />
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                    Montant Moyen
                                                </Typography>
                                                <Typography variant="h4" fontWeight={800} color="info.main">
                                                    {formatCurrency(data.total_stats.avg_invoice_amount)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Par facture
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    </Grid>

                    {/* Activity Breakdown */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        {data.by_activity.map((activity, index) => (
                            <Grid item xs={12} sm={6} md={3} key={activity.activity_type}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                >
                                    <Card
                                        sx={{
                                            borderRadius: 3,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: theme.shadows[8],
                                            },
                                        }}
                                    >
                                        <CardContent sx={{ p: 2.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                                <Avatar
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        bgcolor: alpha(getActivityColor(activity.activity_type), 0.15),
                                                        color: getActivityColor(activity.activity_type),
                                                        mr: 1.5,
                                                    }}
                                                >
                                                    {getActivityIcon(activity.activity_type)}
                                                </Avatar>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body2" fontWeight={700} noWrap>
                                                        {activity.activity_label}
                                                    </Typography>
                                                    <Chip
                                                        label={`${activity.count} factures`}
                                                        size="small"
                                                        sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                                                    />
                                                </Box>
                                            </Box>
                                            <Divider sx={{ my: 1.5 }} />
                                            <Typography variant="h6" fontWeight={800} color={getActivityColor(activity.activity_type)}>
                                                {formatCurrency(activity.revenue)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Moy: {formatCurrency(activity.avg_amount)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Charts */}
                    <Grid container spacing={3}>
                        {/* Timeline Chart */}
                        <Grid item xs={12} lg={8}>
                            <Card sx={{ borderRadius: 3 }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ChartIcon />
                                        Évolution du Chiffre d'Affaires
                                    </Typography>
                                    <Divider sx={{ my: 2 }} />
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={data.timeline}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: theme.palette.background.paper,
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    borderRadius: 8,
                                                }}
                                                formatter={(value) => formatCurrency(value)}
                                            />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke={theme.palette.primary.main}
                                                strokeWidth={3}
                                                dot={{ fill: theme.palette.primary.main, r: 5 }}
                                                activeDot={{ r: 7 }}
                                                name="Chiffre d'Affaires"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Pie Chart - Activity Distribution */}
                        <Grid item xs={12} lg={4}>
                            <Card sx={{ borderRadius: 3 }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" fontWeight={700} gutterBottom>
                                        Répartition par Activité
                                    </Typography>
                                    <Divider sx={{ my: 2 }} />
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={data.by_activity}
                                                dataKey="revenue"
                                                nameKey="activity_label"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label={(entry) => `${((entry.revenue / data.total_stats.total_revenue) * 100).toFixed(1)}%`}
                                            >
                                                {data.by_activity.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: theme.palette.background.paper,
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    borderRadius: 8,
                                                }}
                                                formatter={(value) => formatCurrency(value)}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </>
            )}
        </Box>
    );
};

export default RevenueAnalyticsDashboard;
