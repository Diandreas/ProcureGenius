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
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';

function ProductStatisticsCard({ statistics, loading }) {
    const { format: formatCurrency } = useCurrency();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    if (loading) {
        return (
            <Card sx={{ borderRadius: 1 }}>
                <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                    <Skeleton variant="text" width="60%" height={24} />
                    <Grid container spacing={isMobile ? 1 : 1.5} sx={{ mt: 0.5 }}>
                        {[1, 2, 3, 4].map((i) => (
                            <Grid item xs={6} md={3} key={i}>
                                <Skeleton variant="rectangular" height={isMobile ? 70 : 80} sx={{ borderRadius: 1 }} />
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
        <Card sx={{ borderRadius: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isMobile ? 1 : 1.5 }}>
                    <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" sx={{ fontSize: isMobile ? '0.95rem' : '1.25rem' }}>
                        Statistiques de vente
                    </Typography>
                    {statistics.sales_trend && (
                        <Chip
                            icon={getTrendIcon(statistics.sales_trend.trend_percent)}
                            label={`${statistics.sales_trend.trend_percent > 0 ? '+' : ''}${statistics.sales_trend.trend_percent}%`}
                            color={getTrendColor(statistics.sales_trend.trend_percent)}
                            size="small"
                            sx={{ borderRadius: 0.5, fontSize: '0.7rem', height: 20 }}
                        />
                    )}
                </Box>

                <Grid container spacing={isMobile ? 1 : 1.5}>
                    {stats.map((stat, index) => (
                        <Grid item xs={6} md={3} key={index}>
                            <Box
                                sx={{
                                    p: isMobile ? 1.25 : 1.5,
                                    borderRadius: 1,
                                    bgcolor: `${stat.color}.50`,
                                    border: 1,
                                    borderColor: `${stat.color}.100`,
                                    textAlign: 'center',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        transform: 'translateY(-1px)',
                                        boxShadow: 1,
                                    },
                                }}
                            >
                                <Box sx={{ color: `${stat.color}.main`, mb: 0.5, fontSize: isMobile ? 18 : 20 }}>
                                    {React.cloneElement(stat.icon, { fontSize: isMobile ? 'small' : 'medium' })}
                                </Box>
                                <Typography
                                    variant={isMobile ? 'subtitle1' : 'h6'}
                                    fontWeight="bold"
                                    color={`${stat.color}.main`}
                                    sx={{ fontSize: isMobile ? '0.95rem' : '1.25rem', lineHeight: 1.2 }}
                                >
                                    {stat.value}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
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

