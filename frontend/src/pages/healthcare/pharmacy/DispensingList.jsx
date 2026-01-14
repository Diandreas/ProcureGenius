import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    Chip,
    Avatar,
    InputAdornment,
    Stack,
    useTheme,
    useMediaQuery,
    alpha
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    ShoppingBag as DispenseIcon,
    Receipt as ReceiptIcon,
    Person as PersonIcon,
    LocalPharmacy as PharmacyIcon,
    AccessTime as TimeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import pharmacyAPI from '../../../services/pharmacyAPI';

const DispensingList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Compute stats
    const stats = {
        all: transactions.length,
        today: transactions.filter(tx => {
            const txDate = new Date(tx.dispensed_at);
            const today = new Date();
            return txDate.toDateString() === today.toDateString();
        }).length,
        thisWeek: transactions.filter(tx => {
            const txDate = new Date(tx.dispensed_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return txDate >= weekAgo;
        }).length,
        totalRevenue: transactions.reduce((sum, tx) => {
            const amount = parseFloat(tx.total_amount) || 0;
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0)
    };

    useEffect(() => {
        fetchDispensing();
    }, [search]);

    const fetchDispensing = async () => {
        setLoading(true);
        try {
            const data = await pharmacyAPI.getDispensingList({ search });
            setTransactions(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching dispensing history:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = transactions.filter(tx => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'today') {
            const txDate = new Date(tx.dispensed_at);
            const today = new Date();
            return txDate.toDateString() === today.toDateString();
        }
        if (statusFilter === 'thisWeek') {
            const txDate = new Date(tx.dispensed_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return txDate >= weekAgo;
        }
        return true;
    });

    const quickFilterCards = [
        { label: 'Toutes', count: stats.all, filter: 'all', icon: DispenseIcon, color: 'info' },
        { label: "Aujourd'hui", count: stats.today, filter: 'today', icon: TimeIcon, color: 'primary' },
        { label: '7 derniers jours', count: stats.thisWeek, filter: 'thisWeek', icon: ReceiptIcon, color: 'success' },
        {
            label: 'Revenu Total',
            count: `${new Intl.NumberFormat('fr-FR').format(isNaN(stats.totalRevenue) ? 0 : stats.totalRevenue)} XAF`,
            filter: null,
            icon: PharmacyIcon,
            color: 'warning',
            isRevenue: true
        }
    ];

    return (
        <Box>
            {/* Header with gradient */}
            <Box
                sx={{
                    mb: isMobile ? 2 : 4,
                    pb: isMobile ? 2 : 3,
                    borderBottom: `2px solid ${alpha(theme.palette.divider, 0.1)}`
                }}
            >
                <Stack
                    direction={isMobile ? 'column' : 'row'}
                    justifyContent="space-between"
                    alignItems={isMobile ? 'stretch' : 'center'}
                    spacing={2}
                >
                    <Typography
                        variant={isMobile ? 'h5' : 'h4'}
                        sx={{
                            fontWeight: 700,
                            background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5
                        }}
                    >
                        <DispenseIcon sx={{ fontSize: isMobile ? 28 : 36, color: theme.palette.success.main }} />
                        Dispensation & Ventes
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/healthcare/pharmacy/dispense/new')}
                        size={isMobile ? 'medium' : 'large'}
                        sx={{
                            py: isMobile ? 1 : 1.5,
                            px: isMobile ? 2 : 3,
                            borderRadius: 2,
                            fontWeight: 600,
                            textTransform: 'none',
                            bgcolor: 'success.main',
                            boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.3)}`,
                            '&:hover': {
                                bgcolor: 'success.dark',
                                boxShadow: `0 6px 16px ${alpha(theme.palette.success.main, 0.4)}`
                            }
                        }}
                    >
                        Nouvelle Dispensation
                    </Button>
                </Stack>
            </Box>

            {/* Quick Filter Stats */}
            <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mb: 3 }}>
                {quickFilterCards.map((card, index) => {
                    const Icon = card.icon;
                    const isActive = statusFilter === card.filter;
                    return (
                        <Grid item xs={6} sm={3} key={card.filter || `stat-${index}`}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card
                                    onClick={() => card.filter && setStatusFilter(card.filter)}
                                    sx={{
                                        cursor: card.filter ? 'pointer' : 'default',
                                        borderRadius: 3,
                                        background: theme => isActive
                                            ? `linear-gradient(135deg, ${alpha(theme.palette[card.color].main, 0.15)} 0%, ${alpha(theme.palette[card.color].main, 0.08)} 100%)`
                                            : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                                        border: `2px solid ${isActive ? theme.palette[card.color].main : 'transparent'}`,
                                        boxShadow: isActive
                                            ? `0 4px 16px ${alpha(theme.palette[card.color].main, 0.3)}`
                                            : `0 2px 8px ${alpha(theme.palette.common.black, 0.05)}`,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': card.filter ? {
                                            transform: 'translateY(-4px)',
                                            boxShadow: `0 8px 24px ${alpha(theme.palette[card.color].main, 0.25)}`
                                        } : {}
                                    }}
                                >
                                    <CardContent sx={{ textAlign: 'center', p: isMobile ? 2 : 2.5 }}>
                                        <Icon
                                            sx={{
                                                fontSize: isMobile ? 28 : 36,
                                                color: theme.palette[card.color].main,
                                                mb: 1
                                            }}
                                        />
                                        <Typography
                                            variant={isMobile ? (card.isRevenue ? 'body2' : 'h5') : (card.isRevenue ? 'h6' : 'h4')}
                                            sx={{
                                                fontWeight: 700,
                                                mb: 0.5,
                                                background: `linear-gradient(135deg, ${theme.palette[card.color].main}, ${theme.palette[card.color].dark})`,
                                                backgroundClip: 'text',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent'
                                            }}
                                        >
                                            {card.count}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            {card.label}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Search Bar */}
            <Card sx={{ mb: 3, borderRadius: 3 }}>
                <CardContent sx={{ p: isMobile ? 2 : 2.5 }}>
                    <TextField
                        fullWidth
                        placeholder="Rechercher par patient, prescripteur..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        size={isMobile ? 'small' : 'medium'}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            )
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: `0 0 0 2px ${alpha(theme.palette.success.main, 0.1)}`
                                },
                                '&.Mui-focused': {
                                    boxShadow: `0 0 0 2px ${alpha(theme.palette.success.main, 0.2)}`
                                }
                            }
                        }}
                    />
                </CardContent>
            </Card>

            {/* Dispensing Grid */}
            {loading ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="body1" color="text.secondary">
                        Chargement des dispensations...
                    </Typography>
                </Box>
            ) : filteredTransactions.length === 0 ? (
                <Card
                    sx={{
                        borderRadius: 3,
                        textAlign: 'center',
                        py: 8,
                        background: theme => `linear-gradient(135deg,
                            ${alpha(theme.palette.background.paper, 0.9)} 0%,
                            ${alpha(theme.palette.background.paper, 0.95)} 100%)`
                    }}
                >
                    <DispenseIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        Aucune dispensation trouvée
                    </Typography>
                </Card>
            ) : (
                <Grid container spacing={isMobile ? 2 : 3}>
                    <AnimatePresence mode="popLayout">
                        {filteredTransactions.map((tx, index) => (
                            <Grid item xs={12} sm={6} md={4} key={tx.id}>
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{
                                        duration: 0.4,
                                        delay: index * 0.05,
                                        ease: [0.6, 0.05, 0.01, 0.9]
                                    }}
                                    style={{ height: '100%' }}
                                >
                                    <Card
                                        onClick={() => navigate(`/healthcare/pharmacy/dispensing/${tx.id}`)}
                                        sx={{
                                            height: '100%',
                                            cursor: 'pointer',
                                            borderRadius: 3,
                                            background: theme => `linear-gradient(135deg,
                                                ${alpha(theme.palette.background.paper, 0.9)} 0%,
                                                ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                                            boxShadow: theme => `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`,
                                            border: '1px solid',
                                            borderColor: theme => alpha(theme.palette.divider, 0.1),
                                            backdropFilter: 'blur(20px)',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: theme => `0 16px 48px ${alpha(theme.palette.common.black, 0.12)}`
                                            },
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: 4,
                                                background: `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.success.light})`,
                                                borderRadius: '12px 12px 0 0'
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: isMobile ? 2 : 2.5 }}>
                                            {/* Header with Avatar and Status */}
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                                <Stack direction="row" spacing={1.5} alignItems="center" flex={1}>
                                                    <Avatar
                                                        sx={{
                                                            width: isMobile ? 40 : 48,
                                                            height: isMobile ? 40 : 48,
                                                            bgcolor: theme.palette.success.main,
                                                            fontSize: isMobile ? 16 : 18,
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        {tx.patient_name?.charAt(0) || 'C'}
                                                    </Avatar>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography
                                                            variant="subtitle1"
                                                            fontWeight="700"
                                                            sx={{
                                                                fontSize: isMobile ? '0.938rem' : '1rem',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {tx.patient_name || 'Client Comptoir'}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            #{tx.dispensing_number || tx.id}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                                <Chip
                                                    label="DISPENSÉ"
                                                    size="small"
                                                    sx={{
                                                        bgcolor: alpha(theme.palette.success.main, 0.1),
                                                        color: 'success.main',
                                                        fontWeight: 600,
                                                        fontSize: isMobile ? '0.688rem' : '0.75rem'
                                                    }}
                                                />
                                            </Stack>

                                            {/* Date and Time */}
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    mb: 2,
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: theme => alpha(theme.palette.info.main, 0.05),
                                                    border: '1px solid',
                                                    borderColor: theme => alpha(theme.palette.info.main, 0.1)
                                                }}
                                            >
                                                <TimeIcon sx={{ fontSize: 20, color: 'info.main' }} />
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body2" fontWeight="600">
                                                        {new Date(tx.dispensed_at).toLocaleDateString('fr-FR', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric'
                                                        })}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(tx.dispensed_at).toLocaleTimeString('fr-FR', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Items Count */}
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    mb: 2,
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: theme => alpha(theme.palette.background.default, 0.5)
                                                }}
                                            >
                                                <Typography variant="body2" color="text.secondary">
                                                    Articles dispensés
                                                </Typography>
                                                <Typography variant="h6" fontWeight="700" color="primary">
                                                    {tx.items_count || tx.items?.length || 0}
                                                </Typography>
                                            </Box>

                                            {/* Total Amount */}
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 2,
                                                    bgcolor: theme => alpha(theme.palette.success.main, 0.08),
                                                    border: '1px solid',
                                                    borderColor: theme => alpha(theme.palette.success.main, 0.2),
                                                    textAlign: 'center'
                                                }}
                                            >
                                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                    Montant Total
                                                </Typography>
                                                <Typography
                                                    variant="h5"
                                                    fontWeight="700"
                                                    sx={{
                                                        mt: 0.5,
                                                        background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                                                        backgroundClip: 'text',
                                                        WebkitBackgroundClip: 'text',
                                                        WebkitTextFillColor: 'transparent'
                                                    }}
                                                >
                                                    {new Intl.NumberFormat('fr-FR').format(isNaN(parseFloat(tx.total_amount)) ? 0 : parseFloat(tx.total_amount))} XAF
                                                </Typography>
                                            </Box>

                                            {/* Prescriber if available */}
                                            {tx.prescriber_name && (
                                                <Stack
                                                    direction="row"
                                                    alignItems="center"
                                                    spacing={1}
                                                    sx={{
                                                        mt: 2,
                                                        p: 1,
                                                        borderRadius: 1.5,
                                                        bgcolor: theme => alpha(theme.palette.background.default, 0.5)
                                                    }}
                                                >
                                                    <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                    <Typography variant="body2" color="text.secondary" fontSize={isMobile ? '0.813rem' : '0.875rem'}>
                                                        Dr. {tx.prescriber_name}
                                                    </Typography>
                                                </Stack>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </Grid>
                        ))}
                    </AnimatePresence>
                </Grid>
            )}
        </Box>
    );
};

export default DispensingList;
