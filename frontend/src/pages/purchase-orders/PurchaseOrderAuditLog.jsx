import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle as ApproveIcon,
    Send as SendIcon,
    Cancel as CancelIcon,
    Refresh as RefreshIcon,
    Assignment as LogIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { analyticsAPI } from '../../services/api';

// Mirror de LabAuditLog.jsx (module Labo) mais pour le journal d'audit
// généraliste (ActivityLog) — actions Achats (bons de commande, fournisseurs)
// pour l'instant ; le backend accepte d'autres entity_type au besoin.
const ACTION_COLORS = {
    create: 'success',
    update: 'warning',
    delete: 'error',
    approve: 'success',
    send: 'info',
    cancel: 'error',
};

const ACTION_ICONS = {
    create: <AddIcon fontSize="small" />,
    update: <EditIcon fontSize="small" />,
    delete: <DeleteIcon fontSize="small" />,
    approve: <ApproveIcon fontSize="small" />,
    send: <SendIcon fontSize="small" />,
    cancel: <CancelIcon fontSize="small" />,
};

const ENTITY_LABELS = {
    purchase_order: 'Bon de commande',
    supplier: 'Fournisseur',
    invoice: 'Facture',
};

export default function PurchaseOrderAuditLog() {
    const { enqueueSnackbar } = useSnackbar();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        action_type: '',
        entity_type: '',
        date_from: '',
        date_to: '',
    });

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.action_type) params.action_type = filters.action_type;
            if (filters.entity_type) params.entity_type = filters.entity_type;
            if (filters.date_from) params.date_from = filters.date_from;
            if (filters.date_to) params.date_to = filters.date_to;
            const { data } = await analyticsAPI.getActivityLogs(params);
            setLogs(Array.isArray(data) ? data : data.results || []);
        } catch {
            enqueueSnackbar("Impossible de charger le journal d'audit", { variant: 'error' });
        } finally {
            setLoading(false);
        }
    }, [filters, enqueueSnackbar]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const formatMetadata = (metadata) => {
        if (!metadata || Object.keys(metadata).length === 0) return null;
        return (
            <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.75rem' }}>
                {Object.entries(metadata).map(([key, value]) => (
                    value === null || value === '' ? null : (
                        <li key={key}>
                            <strong>{key}</strong>: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </li>
                    )
                ))}
            </Box>
        );
    };

    return (
        <Box>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
                <LogIcon color="primary" />
                <Typography variant="h5" fontWeight="bold">Journal d'audit — Achats</Typography>
                <IconButton onClick={fetchLogs} size="small" sx={{ ml: 'auto' }}>
                    <RefreshIcon />
                </IconButton>
            </Box>

            {/* Filtres */}
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={3}>
                            <TextField
                                select fullWidth size="small" label="Action"
                                name="action_type" value={filters.action_type} onChange={handleFilterChange}
                            >
                                <MenuItem value="">Toutes</MenuItem>
                                <MenuItem value="create">Création</MenuItem>
                                <MenuItem value="update">Modification</MenuItem>
                                <MenuItem value="approve">Approbation</MenuItem>
                                <MenuItem value="send">Envoi</MenuItem>
                                <MenuItem value="delete">Suppression</MenuItem>
                                <MenuItem value="cancel">Annulation</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                select fullWidth size="small" label="Type"
                                name="entity_type" value={filters.entity_type} onChange={handleFilterChange}
                            >
                                <MenuItem value="">Tous</MenuItem>
                                <MenuItem value="purchase_order">Bons de commande</MenuItem>
                                <MenuItem value="supplier">Fournisseurs</MenuItem>
                                <MenuItem value="invoice">Factures</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth size="small" label="Du" type="date"
                                name="date_from" value={filters.date_from} onChange={handleFilterChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth size="small" label="Au" type="date"
                                name="date_to" value={filters.date_to} onChange={handleFilterChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Tableau */}
            {loading ? (
                <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
            ) : (
                <Paper>
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'grey.50' }}>
                                    <TableCell><strong>Horodatage</strong></TableCell>
                                    <TableCell><strong>Utilisateur</strong></TableCell>
                                    <TableCell><strong>Action</strong></TableCell>
                                    <TableCell><strong>Type</strong></TableCell>
                                    <TableCell><strong>Description</strong></TableCell>
                                    <TableCell><strong>Détails</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                            Aucune activité trouvée
                                        </TableCell>
                                    </TableRow>
                                ) : logs.map(log => (
                                    <TableRow key={log.id} hover>
                                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                            {new Date(log.created_at).toLocaleString('fr-FR')}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.85rem' }}>{log.user_name}</TableCell>
                                        <TableCell>
                                            <Tooltip title={log.action_label}>
                                                <Chip
                                                    icon={ACTION_ICONS[log.action_type]}
                                                    label={log.action_label}
                                                    color={ACTION_COLORS[log.action_type] || 'default'}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={ENTITY_LABELS[log.entity_type] || log.entity_type_label}
                                                size="small"
                                                variant="outlined"
                                                color="info"
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.85rem', maxWidth: 260 }}>
                                            <Tooltip title={log.entity_id}>
                                                <span>{log.description}</span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            {formatMetadata(log.metadata)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
        </Box>
    );
}
