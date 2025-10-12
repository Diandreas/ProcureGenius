import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Grid,
    Box,
    Chip,
    Skeleton,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    TrendingFlat,
    Receipt,
    AttachMoney,
    PendingActions,
    CheckCircle,
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/formatters';

function ClientStatisticsCard({ statistics, loading }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Skeleton variant="text" width="60%" height={30} />
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {[1, 2, 3, 4].map((i) => (
                            <Grid item xs={6} md={3} key={i}>
                                <Skeleton variant="rectangular" height={80} />
                            </Grid>
                        ))}
                    </Grid>
                </CardContent>
            </Card>
        );
    }

    if (!statistics) {
        return null;
    }

    const getTrendIcon = (trendPercent) => {
        if (trendPercent > 5) return <TrendingUp sx={{ fontSize: 20 }} />;
        if (trendPercent < -5) return <TrendingDown sx={{ fontSize: 20 }} />;
        return <TrendingFlat sx={{ fontSize: 20 }} />;
    };

    const getTrendColor = (trendPercent) => {
        if (trendPercent > 5) return 'success';
        if (trendPercent < -5) return 'error';
        return 'default';
    };

    const stats = [
        {
            label: 'Total factures',
            value: statistics.invoice_summary?.total_invoices || 0,
            icon: <Receipt />,
            color: 'primary',
        },
        {
            label: 'Chiffre d\'affaires',
            value: formatCurrency(statistics.invoice_summary?.total_sales_amount || 0),
            icon: <AttachMoney />,
            color: 'success',
        },
        {
            label: 'Montant payé',
            value: formatCurrency(statistics.invoice_summary?.total_paid_amount || 0),
            icon: <CheckCircle />,
            color: 'info',
        },
        {
            label: 'En attente',
            value: formatCurrency(statistics.invoice_summary?.total_outstanding || 0),
            icon: <PendingActions />,
            color: 'warning',
        },
    ];

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                        Statistiques client
                    </Typography>
                    {statistics.sales_trend && (
                        <Chip
                            icon={getTrendIcon(statistics.sales_trend.trend_percent)}
                            label={`${statistics.sales_trend.trend_percent > 0 ? '+' : ''}${statistics.sales_trend.trend_percent}%`}
                            color={getTrendColor(statistics.sales_trend.trend_percent)}
                            size="small"
                        />
                    )}
                </Box>

                <Grid container spacing={2}>
                    {stats.map((stat, index) => (
                        <Grid item xs={6} md={3} key={index}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: `${stat.color}.50`,
                                    border: 1,
                                    borderColor: `${stat.color}.100`,
                                    textAlign: 'center',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: 2,
                                    },
                                }}
                            >
                                <Box sx={{ color: `${stat.color}.main`, mb: 1 }}>
                                    {stat.icon}
                                </Box>
                                <Typography
                                    variant={isMobile ? 'body2' : 'h6'}
                                    fontWeight="bold"
                                    color={`${stat.color}.main`}
                                >
                                    {stat.value}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {stat.label}
                                </Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    );
}

export default ClientStatisticsCard;

