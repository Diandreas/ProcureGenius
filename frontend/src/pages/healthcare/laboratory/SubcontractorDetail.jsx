import React, { useState, useEffect } from 'react';
import {
    Box, Button, Card, CardContent, Grid, Typography, Chip, CircularProgress,
    Tab, Tabs, Table, TableHead, TableRow, TableCell, TableBody, Avatar,
    Stack, Divider, IconButton, Tooltip, Collapse,
} from '@mui/material';
import {
    Business as BusinessIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    LocationOn as LocationIcon,
    People as PeopleIcon,
    Receipt as ReceiptIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    OpenInNew as OpenInNewIcon,
    Science as ScienceIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import laboratoryAPI from '../../../services/laboratoryAPI';
import { invoicesAPI } from '../../../services/api';
import BackButton from '../../../components/navigation/BackButton';

const STATUS_COLORS = {
    pending: 'warning', sample_collected: 'info', in_progress: 'primary',
    completed: 'success', cancelled: 'error', reported: 'success',
};
const STATUS_LABELS = {
    pending: 'En attente', sample_collected: 'Prélevé', in_progress: 'En cours',
    completed: 'Terminé', cancelled: 'Annulé', reported: 'Rapporté',
};

const InfoRow = ({ label, value }) => (
    value ? (
        <Box mb={1}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="body2">{value}</Typography>
        </Box>
    ) : null
);

const PatientRow = ({ patient, subcontractorId }) => {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    const loadOrders = async () => {
        if (orders.length > 0) { setExpanded(e => !e); return; }
        setExpanded(true);
        if (!patient.client_id) return;
        setLoadingOrders(true);
        try {
            const data = await laboratoryAPI.getSubcontractorOrders(subcontractorId, { patient: patient.client_id });
            const list = Array.isArray(data) ? data : (data.results || []);
            setOrders(list);
        } catch {
            // ignore
        } finally {
            setLoadingOrders(false);
        }
    };

    const genderLabel = { M: 'Masculin', F: 'Féminin', O: 'Autre' };

    return (
        <>
            <TableRow hover sx={{ cursor: patient.client_id ? 'pointer' : 'default' }} onClick={patient.client_id ? loadOrders : undefined}>
                <TableCell>
                    <Typography variant="body2" fontWeight="600">{patient.full_name}</Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="text.secondary">{genderLabel[patient.gender] || '—'}</Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="text.secondary">
                        {patient.resolved_age != null ? `${patient.resolved_age} ans` : (patient.date_of_birth || '—')}
                    </Typography>
                </TableCell>
                <TableCell>
                    {patient.client_id ? (
                        <Chip size="small" label="Actif" color="success" variant="outlined" />
                    ) : (
                        <Chip size="small" label="Pas encore de commande" color="default" variant="outlined" />
                    )}
                </TableCell>
                <TableCell align="right">
                    {patient.client_id && (
                        <IconButton size="small" onClick={e => { e.stopPropagation(); loadOrders(); }}>
                            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                    )}
                </TableCell>
            </TableRow>
            {expanded && (
                <TableRow>
                    <TableCell colSpan={5} sx={{ p: 0, bgcolor: 'grey.50' }}>
                        <Collapse in={expanded}>
                            <Box p={2}>
                                {loadingOrders ? (
                                    <CircularProgress size={20} />
                                ) : orders.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">Aucune commande trouvée.</Typography>
                                ) : (
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>N° Commande</TableCell>
                                                <TableCell>Date</TableCell>
                                                <TableCell>Examens</TableCell>
                                                <TableCell>Statut</TableCell>
                                                <TableCell />
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {orders.map(order => (
                                                <TableRow key={order.id} hover>
                                                    <TableCell>
                                                        <Typography variant="caption" fontFamily="monospace">{order.order_number}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption">{new Date(order.order_date || order.created_at).toLocaleDateString('fr-FR')}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption">{(order.items || []).map(i => i.lab_test_name || i.lab_test).join(', ')}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip size="small" label={STATUS_LABELS[order.status] || order.status} color={STATUS_COLORS[order.status] || 'default'} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Tooltip title="Voir détails">
                                                            <IconButton size="small" onClick={() => navigate(`/healthcare/laboratory/orders/${order.id}`)}>
                                                                <OpenInNewIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};

const SubcontractorDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [sub, setSub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(0);

    const [patients, setPatients] = useState([]);
    const [loadingPatients, setLoadingPatients] = useState(false);

    const [invoices, setInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    useEffect(() => {
        fetchDetail();
    }, [id]);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const data = await laboratoryAPI.getSubcontractor(id);
            setSub(data);
        } catch {
            enqueueSnackbar('Erreur de chargement', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (_, newVal) => {
        setTab(newVal);
        if (newVal === 1 && patients.length === 0) fetchPatients();
        if (newVal === 2 && invoices.length === 0 && sub?.b2b_client_id) fetchInvoices(sub.b2b_client_id);
    };

    const fetchPatients = async () => {
        setLoadingPatients(true);
        try {
            const data = await laboratoryAPI.getSubcontractorPatients(id);
            setPatients(Array.isArray(data) ? data : (data.results || []));
        } catch {
            enqueueSnackbar('Erreur chargement patients', { variant: 'error' });
        } finally {
            setLoadingPatients(false);
        }
    };

    const fetchInvoices = async (clientId) => {
        setLoadingInvoices(true);
        try {
            const response = await invoicesAPI.list({ client: clientId, ordering: '-created_at' });
            setInvoices(response.data?.results || response.data || []);
        } catch {
            enqueueSnackbar('Erreur chargement factures', { variant: 'error' });
        } finally {
            setLoadingInvoices(false);
        }
    };

    if (loading) return <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>;
    if (!sub) return <Box p={3}><Typography color="error">Sous-traitant introuvable</Typography></Box>;

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <BackButton to="/healthcare/laboratory/subcontractors" />
                    <Box display="flex" alignItems="center" gap={1.5}>
                        {sub.logo_url ? (
                            <Avatar src={sub.logo_url} variant="rounded" sx={{ width: 48, height: 48, border: '1px solid', borderColor: 'divider' }} />
                        ) : (
                            <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: `${sub.brand_color || '#2563eb'}15` }}>
                                <BusinessIcon sx={{ color: sub.brand_color || 'primary.main', fontSize: 28 }} />
                            </Box>
                        )}
                        <Box>
                            <Typography variant="h5" fontWeight="700">{sub.name}</Typography>
                            {sub.city && <Typography variant="body2" color="text.secondary">{sub.city}</Typography>}
                        </Box>
                    </Box>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Chip label={sub.is_active ? 'Actif' : 'Inactif'} color={sub.is_active ? 'success' : 'default'} />
                    <Button variant="outlined" size="small" startIcon={<ScienceIcon />}
                        onClick={() => navigate(`/healthcare/laboratory/subcontractors/${id}/prices`)}>
                        Tarifs
                    </Button>
                    <Button variant="outlined" size="small" startIcon={<PeopleIcon />}
                        onClick={() => navigate(`/healthcare/laboratory/subcontractors/${id}/patients`)}>
                        Patients
                    </Button>
                </Stack>
            </Box>

            {/* Tabs */}
            <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Informations" />
                <Tab label={`Patients${patients.length > 0 ? ` (${patients.length})` : ''}`} icon={<PeopleIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
                <Tab label="Factures" icon={<ReceiptIcon sx={{ fontSize: 16 }} />} iconPosition="start" disabled={!sub.b2b_client_id} />
            </Tabs>

            {/* Tab 0: Informations */}
            {tab === 0 && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
                            <CardContent>
                                <Typography variant="subtitle2" fontWeight="700" mb={2}>Coordonnées</Typography>
                                {sub.address && (
                                    <Box display="flex" gap={1} mb={1}>
                                        <LocationIcon fontSize="small" color="action" />
                                        <Typography variant="body2">{sub.address}{sub.city ? `, ${sub.city}` : ''}</Typography>
                                    </Box>
                                )}
                                {sub.phone && (
                                    <Box display="flex" gap={1} mb={1}>
                                        <PhoneIcon fontSize="small" color="action" />
                                        <Typography variant="body2">{sub.phone}</Typography>
                                    </Box>
                                )}
                                {sub.fax && <InfoRow label="Fax" value={sub.fax} />}
                                {sub.email && (
                                    <Box display="flex" gap={1} mb={1}>
                                        <EmailIcon fontSize="small" color="action" />
                                        <Typography variant="body2">{sub.email}</Typography>
                                    </Box>
                                )}
                                {sub.website && <InfoRow label="Site web" value={sub.website} />}
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', height: '100%' }}>
                            <CardContent>
                                <Typography variant="subtitle2" fontWeight="700" mb={2}>Identifiants légaux</Typography>
                                <InfoRow label="NIU" value={sub.niu} />
                                <InfoRow label="Numéro contribuable" value={sub.tax_number} />
                                <InfoRow label="Numéro RC" value={sub.rc_number} />
                                <InfoRow label="Numéro RCCM" value={sub.rccm_number} />
                                <Divider sx={{ my: 1.5 }} />
                                <Typography variant="subtitle2" fontWeight="700" mb={1}>Banque</Typography>
                                <InfoRow label="Banque" value={sub.bank_name} />
                                <InfoRow label="Compte" value={sub.bank_account} />
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                            <CardContent>
                                <Typography variant="subtitle2" fontWeight="700" mb={2}>Statistiques</Typography>
                                <Box display="flex" gap={3}>
                                    <Box textAlign="center">
                                        <Typography variant="h4" fontWeight="700" color="primary">{sub.prices_count || 0}</Typography>
                                        <Typography variant="caption" color="text.secondary">Tarifs actifs</Typography>
                                    </Box>
                                    {sub.b2b_client_id && (
                                        <Box textAlign="center">
                                            <Typography variant="h4" fontWeight="700" color="secondary">{invoices.length}</Typography>
                                            <Typography variant="caption" color="text.secondary">Factures</Typography>
                                        </Box>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Tab 1: Patients */}
            {tab === 1 && (
                <Box>
                    {loadingPatients ? (
                        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                    ) : patients.length === 0 ? (
                        <Box textAlign="center" p={4}>
                            <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                            <Typography color="text.secondary">Aucun patient enregistré</Typography>
                            <Button variant="outlined" size="small" sx={{ mt: 2 }}
                                onClick={() => navigate(`/healthcare/laboratory/subcontractors/${id}/patients`)}>
                                Gérer les patients
                            </Button>
                        </Box>
                    ) : (
                        <>
                            <Box display="flex" justifyContent="flex-end" mb={1}>
                                <Button size="small" startIcon={<PeopleIcon />}
                                    onClick={() => navigate(`/healthcare/laboratory/subcontractors/${id}/patients`)}>
                                    Gérer
                                </Button>
                            </Box>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Nom complet</TableCell>
                                        <TableCell>Sexe</TableCell>
                                        <TableCell>Âge/Date de naiss.</TableCell>
                                        <TableCell>Statut</TableCell>
                                        <TableCell />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {patients.map(p => (
                                        <PatientRow key={p.id} patient={p} subcontractorId={id} />
                                    ))}
                                </TableBody>
                            </Table>
                        </>
                    )}
                </Box>
            )}

            {/* Tab 2: Factures */}
            {tab === 2 && (
                <Box>
                    {loadingInvoices ? (
                        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                    ) : invoices.length === 0 ? (
                        <Box textAlign="center" p={4}>
                            <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                            <Typography color="text.secondary">Aucune facture</Typography>
                        </Box>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>N° Facture</TableCell>
                                    <TableCell>Titre</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell align="right">Montant</TableCell>
                                    <TableCell>Statut</TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {invoices.map(inv => (
                                    <TableRow key={inv.id} hover>
                                        <TableCell>
                                            <Typography variant="caption" fontFamily="monospace">{inv.invoice_number}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{inv.title || '—'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption">{new Date(inv.created_at).toLocaleDateString('fr-FR')}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight="600">
                                                {Number(inv.total_amount || 0).toLocaleString('fr-FR')} {inv.currency || 'XAF'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                const INV_LABELS = { draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', overdue: 'En retard', cancelled: 'Annulée' };
                                                const INV_COLORS = { draft: 'default', sent: 'info', paid: 'success', overdue: 'error', cancelled: 'default' };
                                                return (
                                                    <Chip
                                                        size="small"
                                                        label={INV_LABELS[inv.status] || inv.status}
                                                        color={INV_COLORS[inv.status] || 'warning'}
                                                    />
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title="Voir la facture">
                                                <IconButton size="small" onClick={() => navigate(`/invoices/${inv.id}`)}>
                                                    <OpenInNewIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default SubcontractorDetail;
