import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    FormControlLabel,
    Checkbox,
    FormGroup,
    Grid,
    Alert,
    Avatar,
} from '@mui/material';
import {
    Add,
    MoreVert,
    Edit,
    Delete,
    PersonAdd,
    CheckCircle,
    Cancel,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Mascot from '../../components/Mascot';
import subscriptionAPI from '../../services/subscriptionAPI';
import SeatManagerDialog from '../../components/subscription/SeatManagerDialog';

function UserManagement() {
    const { enqueueSnackbar } = useSnackbar();
    const { t } = useTranslation(['settings', 'common']);
    const navigate = useNavigate();

    // Modules disponibles
    const AVAILABLE_MODULES = [
        { id: 'dashboard', name: t('settings:userManagement.modules.dashboard') },
        { id: 'suppliers', name: t('settings:userManagement.modules.suppliers') },
        { id: 'purchase-orders', name: t('settings:userManagement.modules.purchase-orders') },
        { id: 'invoices', name: t('settings:userManagement.modules.invoices') },
        { id: 'products', name: t('settings:userManagement.modules.products') },
        { id: 'clients', name: t('settings:userManagement.modules.clients') },
        { id: 'e-sourcing', name: t('settings:userManagement.modules.e-sourcing') },
        { id: 'contracts', name: t('settings:userManagement.modules.contracts') },
    ];

    // Rôles avec modules suggérés
    const ROLES_CONFIG = {
        admin: {
            label: t('settings:userManagement.roles.admin'),
            modules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices', 'products', 'clients', 'e-sourcing', 'contracts'],
            permissions: {
                can_manage_users: true,
                can_manage_settings: true,
                can_view_analytics: true,
                can_approve_purchases: true,
            },
        },
        manager: {
            label: t('settings:userManagement.roles.manager'),
            modules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices', 'products', 'clients', 'e-sourcing', 'contracts'],
            permissions: {
                can_manage_users: false,
                can_manage_settings: true,
                can_view_analytics: true,
                can_approve_purchases: true,
            },
        },
        buyer: {
            label: t('settings:userManagement.roles.buyer'),
            modules: ['dashboard', 'suppliers', 'purchase-orders', 'products'],
            permissions: {
                can_manage_users: false,
                can_manage_settings: false,
                can_view_analytics: true,
                can_approve_purchases: false,
            },
        },
        accountant: {
            label: t('settings:userManagement.roles.accountant'),
            modules: ['dashboard', 'invoices', 'clients'],
            permissions: {
                can_manage_users: false,
                can_manage_settings: false,
                can_view_analytics: true,
                can_approve_purchases: false,
            },
        },
        viewer: {
            label: t('settings:userManagement.roles.viewer'),
            modules: ['dashboard'],
            permissions: {
                can_manage_users: false,
                can_manage_settings: false,
                can_view_analytics: false,
                can_approve_purchases: false,
            },
        },
    };
    const [users, setUsers] = useState([]);
    const [seatInfo, setSeatInfo] = useState({ seat_limit: null, active_users: 0 });
    const [seatDialogOpen, setSeatDialogOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const [inviteForm, setInviteForm] = useState({
        email: '',
        first_name: '',
        last_name: '',
        role: 'buyer',
    });

    const [permissionsForm, setPermissionsForm] = useState({
        can_manage_users: false,
        can_manage_settings: false,
        can_view_analytics: true,
        can_approve_purchases: false,
        module_access: [],
    });

    useEffect(() => {
        fetchUsers();
        fetchSeatInfo();
    }, []);

    const fetchSeatInfo = async () => {
        try {
            const res = await subscriptionAPI.getStatus();
            const d = res?.data || res || {};
            setSeatInfo(d); // statut complet (seat_limit, included_users, extra_seats, plan_code...)
        } catch { /* silencieux : le compteur reste masque */ }
    };

    // Nombre d'actifs derive de la liste (s'actualise apres invitation/suppression).
    const activeUsers = users.filter(u => u.is_active).length;
    const seatFull = seatInfo.seat_limit != null && activeUsers >= seatInfo.seat_limit;

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/v1/accounts/organization/users/', {
                headers: {
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
            } else if (response.status === 403) {
                enqueueSnackbar(t('settings:userManagement.permissionDenied'), { variant: 'error' });
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            enqueueSnackbar(t('settings:userManagement.loadingError'), { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleMenuOpen = (event, user) => {
        setAnchorEl(event.currentTarget);
        setSelectedUser(user);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleInviteUser = async () => {
        try {
            const response = await fetch('/api/v1/accounts/organization/users/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                },
                body: JSON.stringify(inviteForm),
            });

            if (response.ok) {
                const data = await response.json();
                const msg = data.email_sent
                    ? t('settings:userManagement.inviteDialog.inviteSuccessWithEmail', 'Utilisateur créé — un email avec ses identifiants a été envoyé.')
                    : t('settings:userManagement.inviteDialog.inviteSuccess');
                enqueueSnackbar(msg, { variant: 'success' });
                setInviteDialogOpen(false);
                setInviteForm({ email: '', first_name: '', last_name: '', role: 'buyer' });
                fetchUsers();
            } else if (response.status === 402) {
                // Limite de sièges atteinte : message clair + invitation à upgrader.
                const errData = await response.json().catch(() => ({}));
                setInviteDialogOpen(false);
                enqueueSnackbar(
                    errData.error || "Limite de sièges atteinte. Passez à un plan supérieur pour ajouter des utilisateurs.",
                    { variant: 'warning', persist: false, action: null }
                );
                navigate('/subscription/plans');
            } else {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to invite user');
            }
        } catch (error) {
            console.error('Error inviting user:', error);
            enqueueSnackbar(t('settings:userManagement.inviteDialog.inviteError'), { variant: 'error' });
        }
    };

    const handleEditPermissions = () => {
        if (selectedUser) {
            setPermissionsForm({
                can_manage_users: selectedUser.permissions.can_manage_users,
                can_manage_settings: selectedUser.permissions.can_manage_settings,
                can_view_analytics: selectedUser.permissions.can_view_analytics,
                can_approve_purchases: selectedUser.permissions.can_approve_purchases,
                module_access: selectedUser.permissions.module_access || [],
            });
            setPermissionsDialogOpen(true);
        }
        handleMenuClose();
    };

    const handleSavePermissions = async () => {
        if (!selectedUser) return;

        try {
            const response = await fetch(`/api/v1/accounts/organization/users/${selectedUser.id}/permissions/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                },
                body: JSON.stringify(permissionsForm),
            });

            if (response.ok) {
                enqueueSnackbar(t('settings:userManagement.permissionsDialog.saveSuccess'), { variant: 'success' });
                setPermissionsDialogOpen(false);
                fetchUsers();
            } else {
                throw new Error('Failed to update permissions');
            }
        } catch (error) {
            console.error('Error updating permissions:', error);
            enqueueSnackbar(t('settings:userManagement.permissionsDialog.saveError'), { variant: 'error' });
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        try {
            const response = await fetch(`/api/v1/accounts/organization/users/${selectedUser.id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                },
            });

            if (response.ok) {
                enqueueSnackbar(t('settings:userManagement.deleteDialog.deleteSuccess'), { variant: 'success' });
                setDeleteDialogOpen(false);
                fetchUsers();
            } else {
                throw new Error('Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            enqueueSnackbar(t('settings:userManagement.deleteDialog.deleteError'), { variant: 'error' });
        }
        handleMenuClose();
    };

    const getRoleChipColor = (role) => {
        const colors = {
            admin: 'error',
            manager: 'warning',
            buyer: 'primary',
            accountant: 'info',
            viewer: 'default',
        };
        return colors[role] || 'default';
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                <Mascot pose="thinking" animation="pulse" size={80} />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                        {t('settings:userManagement.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('settings:subtitle')}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {seatInfo.seat_limit != null && (
                        <Chip
                            icon={<PersonAdd sx={{ fontSize: 16 }} />}
                            label={`${activeUsers} / ${seatInfo.seat_limit} sièges`}
                            color={seatFull ? 'warning' : 'default'}
                            variant={seatFull ? 'filled' : 'outlined'}
                            onClick={() => setSeatDialogOpen(true)}
                            sx={{ fontWeight: 700, cursor: 'pointer' }}
                        />
                    )}
                    {seatFull ? (
                        <Button variant="contained" color="warning" onClick={() => setSeatDialogOpen(true)}>
                            Ajouter des sièges
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            startIcon={<PersonAdd />}
                            onClick={() => setInviteDialogOpen(true)}
                        >
                            {t('settings:userManagement.inviteUser')}
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Statistiques */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h3" color="primary.main">
                                {users.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t('common:total')}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h3" color="success.main">
                                {users.filter(u => u.is_active).length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t('settings:userManagement.status.active')}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h3" color="error.main">
                                {users.filter(u => u.role === 'admin').length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t('settings:userManagement.roles.admin')}s
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h3" color="text.secondary">
                                {users.filter(u => !u.is_active).length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t('settings:userManagement.status.inactive')}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Cartes utilisateurs */}
            {users.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Mascot pose="thinking" animation="float" size={80} />
                    <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                        {t('settings:userManagement.noUsers')}
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {users.map((user) => {
                        const roleColor = getRoleChipColor(user.role);
                        return (
                            <Grid item xs={12} sm={6} md={4} key={user.id}>
                                <Card sx={{
                                    borderRadius: 3, height: '100%', position: 'relative',
                                    border: '1px solid', borderColor: 'divider',
                                    transition: 'transform 0.18s, box-shadow 0.18s',
                                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 28px -14px rgba(15,23,42,0.3)' },
                                    opacity: user.is_active ? 1 : 0.7,
                                }}>
                                    <CardContent sx={{ p: 2.25 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                            <Avatar sx={{ width: 46, height: 46, bgcolor: `${roleColor}.main`, fontWeight: 700 }}>
                                                {user.first_name?.charAt(0) || user.username?.charAt(0) || '?'}
                                            </Avatar>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {user.first_name} {user.last_name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {user.email}
                                                </Typography>
                                            </Box>
                                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, user)} sx={{ mt: -0.5, mr: -0.5 }}>
                                                <MoreVert fontSize="small" />
                                            </IconButton>
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.75, flexWrap: 'wrap' }}>
                                            <Chip
                                                label={ROLES_CONFIG[user.role]?.label || user.role}
                                                size="small"
                                                color={roleColor}
                                                sx={{ fontWeight: 600 }}
                                            />
                                            {user.is_active ? (
                                                <Chip label={t('settings:userManagement.status.active')} size="small" color="success" variant="outlined" icon={<CheckCircle sx={{ fontSize: 14 }} />} />
                                            ) : (
                                                <Chip label={t('settings:userManagement.status.inactive')} size="small" variant="outlined" icon={<Cancel sx={{ fontSize: 14 }} />} />
                                            )}
                                        </Box>

                                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.25 }}>
                                            {user.enabled_modules?.length || 0} {t('settings:userManagement.table.modulesCount', 'module(s)')}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Menu contextuel */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleEditPermissions}>
                    <Edit fontSize="small" sx={{ mr: 1 }} />
                    {t('settings:userManagement.menu.editPermissions')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setDeleteDialogOpen(true);
                        handleMenuClose();
                    }}
                    sx={{ color: 'error.main' }}
                >
                    <Delete fontSize="small" sx={{ mr: 1 }} />
                    {t('settings:userManagement.menu.deactivate')}
                </MenuItem>
            </Menu>

            {/* Dialog d'invitation */}
            <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('settings:userManagement.inviteDialog.title')}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label={t('settings:userManagement.inviteDialog.email')}
                                type="email"
                                value={inviteForm.email}
                                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={t('settings:userManagement.inviteDialog.firstName')}
                                value={inviteForm.first_name}
                                onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={t('settings:userManagement.inviteDialog.lastName')}
                                value={inviteForm.last_name}
                                onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>{t('settings:userManagement.inviteDialog.role')}</InputLabel>
                                <Select
                                    value={inviteForm.role}
                                    label={t('settings:userManagement.inviteDialog.role')}
                                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                                >
                                    {Object.entries(ROLES_CONFIG).map(([key, config]) => (
                                        <MenuItem key={key} value={key}>
                                            {config.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Apercu clair de ce que le role permet */}
                        <Grid item xs={12}>
                            <Box sx={{ p: 1.75, borderRadius: 2, bgcolor: 'action.hover' }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
                                    Ce rôle peut :
                                </Typography>
                                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                    {(() => {
                                        const p = ROLES_CONFIG[inviteForm.role]?.permissions || {};
                                        const caps = [
                                            [p.can_manage_users, 'Gérer les utilisateurs'],
                                            [p.can_manage_settings, 'Gérer les paramètres'],
                                            [p.can_view_analytics, 'Voir les analyses'],
                                            [p.can_approve_purchases, 'Approuver les achats'],
                                        ];
                                        const active = caps.filter(([on]) => on);
                                        if (active.length === 0) return (
                                            <Typography variant="body2" color="text.secondary">Consultation uniquement.</Typography>
                                        );
                                        return active.map(([, label], i) => (
                                            <Chip key={i} size="small" icon={<CheckCircle sx={{ fontSize: 14 }} />} label={label}
                                                sx={{ bgcolor: 'success.50', color: 'success.dark', fontWeight: 600, fontSize: '0.72rem' }} />
                                        ));
                                    })()}
                                </Box>
                                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                                    Accès : {(ROLES_CONFIG[inviteForm.role]?.modules || []).length} module(s). Personnalisable après création.
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>

                    <Alert severity="info" sx={{ mt: 2 }}>
                        {t('settings:userManagement.inviteDialog.emailInfo')}
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInviteDialogOpen(false)}>{t('common:cancel')}</Button>
                    <Button onClick={handleInviteUser} variant="contained">
                        {t('settings:userManagement.inviteDialog.invite')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog de permissions */}
            <Dialog open={permissionsDialogOpen} onClose={() => setPermissionsDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('settings:userManagement.permissionsDialog.title')}</DialogTitle>
                <DialogContent>
                    {selectedUser && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                                {t('settings:userManagement.permissionsDialog.specialPermissions')}
                            </Typography>
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={permissionsForm.can_manage_users}
                                            onChange={(e) => setPermissionsForm({ ...permissionsForm, can_manage_users: e.target.checked })}
                                        />
                                    }
                                    label={t('settings:userManagement.permissions.manageUsers')}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={permissionsForm.can_manage_settings}
                                            onChange={(e) => setPermissionsForm({ ...permissionsForm, can_manage_settings: e.target.checked })}
                                        />
                                    }
                                    label={t('settings:userManagement.permissions.manageSettings')}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={permissionsForm.can_view_analytics}
                                            onChange={(e) => setPermissionsForm({ ...permissionsForm, can_view_analytics: e.target.checked })}
                                        />
                                    }
                                    label={t('settings:userManagement.permissions.viewAnalytics')}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={permissionsForm.can_approve_purchases}
                                            onChange={(e) => setPermissionsForm({ ...permissionsForm, can_approve_purchases: e.target.checked })}
                                        />
                                    }
                                    label={t('settings:userManagement.permissions.approvePurchases')}
                                />
                            </FormGroup>

                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 3 }}>
                                {t('settings:userManagement.permissionsDialog.moduleAccess')}
                            </Typography>
                            <FormGroup>
                                {AVAILABLE_MODULES.map((module) => (
                                    <FormControlLabel
                                        key={module.id}
                                        control={
                                            <Checkbox
                                                checked={permissionsForm.module_access.includes(module.id)}
                                                onChange={(e) => {
                                                    const newModules = e.target.checked
                                                        ? [...permissionsForm.module_access, module.id]
                                                        : permissionsForm.module_access.filter(m => m !== module.id);
                                                    setPermissionsForm({ ...permissionsForm, module_access: newModules });
                                                }}
                                            />
                                        }
                                        label={module.name}
                                    />
                                ))}
                            </FormGroup>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPermissionsDialogOpen(false)}>{t('common:cancel')}</Button>
                    <Button onClick={handleSavePermissions} variant="contained">
                        {t('common:save')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog de suppression */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>{t('settings:userManagement.deleteDialog.title')}</DialogTitle>
                <DialogContent>
                    <Typography>
                        {t('settings:userManagement.deleteDialog.confirmMessage', { name: `${selectedUser?.first_name} ${selectedUser?.last_name}` })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>{t('common:cancel')}</Button>
                    <Button onClick={handleDeleteUser} color="error" variant="contained">
                        {t('settings:userManagement.deleteDialog.deactivate')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Gestion des sièges (achat de sièges supplémentaires, proratisé) */}
            <SeatManagerDialog
                open={seatDialogOpen}
                status={seatInfo}
                onClose={() => setSeatDialogOpen(false)}
                onUpdated={() => fetchSeatInfo()}
            />
        </Box>
    );
}

export default UserManagement;

