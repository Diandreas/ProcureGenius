import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Card,
    CardContent,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Science,
    TrendingUp,
    Assignment,
    AttachMoney,
    CheckCircle,
    Pending
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import laboratoryAPI from '../../../services/laboratoryAPI';
import useCurrency from '../../../hooks/useCurrency';

// Ensure ChartJS registration (likely already done in App or Dashboard, but good to be safe if reusing components)
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const LabStats = () => {
    const { format } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            // Mocking data for now as specific stats endpoint might not return all this yet
            // In real scenario: const response = await laboratoryAPI.getStats();
            // Using a mock for demonstration until backend endpoint is fully ready for detailed stats

            // Simulating API call
            setTimeout(() => {
                setStats({
                    overview: {
                        today_orders: 12,
                        pending: 5,
                        completed: 7,
                        revenue_today: 150000,
                        revenue_month: 4500000
                    },
                    trends: {
                        labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
                        orders: [10, 15, 8, 20, 18, 12, 5],
                        revenue: [100000, 150000, 80000, 200000, 180000, 120000, 50000]
                    },
                    top_tests: [
                        { name: 'NFS (Hématologie)', count: 145 },
                        { name: 'Goutte Épaisse', count: 120 },
                        { name: 'Glycémie', count: 98 },
                        { name: 'Groupe Sanguin', count: 76 },
                        { name: 'Widal', count: 54 }
                    ],
                    status_distribution: [15, 45, 30, 10] // Pending, Completed, Delivered, Cancelled
                });
                setLoading(false);
            }, 1000);

        } catch (err) {
            console.error(err);
            setError("Impossible de charger les statistiques du laboratoire.");
            setLoading(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    if (error) return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;
    if (!stats) return null;

    const summaryCards = [
        { title: "Commandes Aujourd'hui", value: stats.overview.today_orders, icon: <Assignment />, color: '#3B82F6' },
        { title: "En Attente", value: stats.overview.pending, icon: <Pending />, color: '#F59E0B' },
        { title: "Terminées (Jour)", value: stats.overview.completed, icon: <CheckCircle />, color: '#10B981' },
        { title: "Revenu (Jour)", value: format(stats.overview.revenue_today), icon: <AttachMoney />, color: '#8B5CF6' },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
                Statistiques Laboratoire
            </Typography>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {summaryCards.map((card, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2, height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ p: 1, borderRadius: 1, bgcolor: `${card.color}20`, color: card.color, mr: 2 }}>
                                    {card.icon}
                                </Box>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {card.title}
                                </Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                {card.value}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Charts Row 1 */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2, height: '400px' }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Évolution des Commandes (Semaine)</Typography>
                        <Box sx={{ height: '340px' }}>
                            <Line
                                data={{
                                    labels: stats.trends.labels,
                                    datasets: [
                                        {
                                            label: 'Commandes',
                                            data: stats.trends.orders,
                                            borderColor: '#3B82F6',
                                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                            tension: 0.4,
                                            fill: true
                                        }
                                    ]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: { y: { beginAtZero: true, grid: { borderDash: [2, 2] } }, x: { grid: { display: false } } }
                                }}
                            />
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2, height: '400px' }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Distribution des Statuts</Typography>
                        <Box sx={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Doughnut
                                data={{
                                    labels: ['En attente', 'Terminé', 'Livré', 'Annulé'],
                                    datasets: [{
                                        data: stats.status_distribution,
                                        backgroundColor: ['#F59E0B', '#3B82F6', '#10B981', '#EF4444'],
                                        borderWidth: 0
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: 'bottom' } },
                                    cutout: '70%'
                                }}
                            />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Charts Row 2 */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Top 5 Examens</Typography>
                        <Box sx={{ height: '300px' }}>
                            <Bar
                                data={{
                                    labels: stats.top_tests.map(t => t.name),
                                    datasets: [{
                                        label: 'Nombre de tests',
                                        data: stats.top_tests.map(t => t.count),
                                        backgroundColor: '#8B5CF6',
                                        borderRadius: 4
                                    }]
                                }}
                                options={{
                                    indexAxis: 'y',
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: { x: { display: false }, y: { grid: { display: false } } }
                                }}
                            />
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>Revenus (Semaine)</Typography>
                        <Box sx={{ height: '300px' }}>
                            <Bar
                                data={{
                                    labels: stats.trends.labels,
                                    datasets: [
                                        {
                                            label: 'Revenu',
                                            data: stats.trends.revenue,
                                            backgroundColor: '#10B981',
                                            borderRadius: 4
                                        }
                                    ]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: { y: { beginAtZero: true, grid: { borderDash: [2, 2] } }, x: { grid: { display: false } } }
                                }}
                            />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default LabStats;
