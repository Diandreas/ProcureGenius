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
    People,
    Schedule,
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '../../utils/formatters';

function ProductStatisticsCard({ statistics, loading }) {
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
            label: 'Factures',
            value: statistics.sales_summary?.total_invoices || 0,
            icon: <Receipt />,
            color: 'primary',
        },
        {
            label: 'Total des ventes',
            value: formatCurrency(statistics.sales_summary?.total_sales_amount || 0),
            icon: <AttachMoney />,
            color: 'success',
        },
        {
            label: 'Clients uniques',
            value: statistics.sales_summary?.unique_clients || 0,
            icon: <People />,
            color: 'info',
        },
        {
            label: 'Dernière vente',
            value: statistics.recent_invoices && statistics.recent_invoices.length > 0
                ? formatDate(statistics.recent_invoices[0].created_at)
                : 'Aucune vente',
            icon: <Schedule />,
            color: 'secondary',
        },
    ];

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                        Statistiques de vente
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
                                    variant={isMobile ? 'h6' : 'h5'}
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

export default ProductStatisticsCard;

