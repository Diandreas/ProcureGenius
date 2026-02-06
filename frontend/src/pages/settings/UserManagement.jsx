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
    VpnKey,
    Dashboard as DashboardIcon,
    Business,
    ShoppingCart,
    Receipt,
    Inventory,
    Group,
    MedicalServices,
    AssignmentInd,
    Science,
    LocalPharmacy,
    HealthAndSafety,
    Category as CategoryIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import Mascot from '../../components/Mascot';

function UserManagement() {
    const { enqueueSnackbar } = useSnackbar();
    const { t } = useTranslation(['settings', 'common']);

    // Modules disponibles enrichis
    const AVAILABLE_MODULES = [
        // CORE
        { id: 'dashboard', name: t('settings:userManagement.modules.dashboard'), icon: <DashboardIcon />, category: 'core', description: 'Vue d\'ensemble et statistiques clés' },

        // SUPPLY CHAIN
        { id: 'suppliers', name: t('settings:userManagement.modules.suppliers'), icon: <Business />, category: 'supply', description: 'Gestion des fournisseurs et catalogues' },
        { id: 'purchase-orders', name: t('settings:userManagement.modules.purchase-orders'), icon: <ShoppingCart />, category: 'supply', description: 'Commandes d\'achat et réapprovisionnement' },
        { id: 'invoices', name: t('settings:userManagement.modules.invoices'), icon: <Receipt />, category: 'supply', description: 'Facturation clients et encaissements' },
        { id: 'products', name: t('settings:userManagement.modules.products'), icon: <Inventory />, category: 'supply', description: 'Inventaire, produits et services' },
        { id: 'clients', name: t('settings:userManagement.modules.clients'), icon: <Group />, category: 'supply', description: 'Base de données clients et historique' },

        // HEALTHCARE
        { id: 'patients', name: t('settings:userManagement.modules.patients'), icon: <AssignmentInd />, category: 'healthcare', description: 'Dossiers médicaux et historique patients' },
        { id: 'reception', name: t('settings:userManagement.modules.reception'), icon: <MedicalServices />, category: 'healthcare', description: 'Accueil, rendez-vous et files d\'attente' },
        { id: 'consultations', name: t('settings:userManagement.modules.consultations'), icon: <HealthAndSafety />, category: 'healthcare', description: 'Consultations médicales et prescriptions' },
        { id: 'laboratory', name: t('settings:userManagement.modules.laboratory'), icon: <Science />, category: 'healthcare', description: 'Examens, résultats et plateaux techniques' },
        { id: 'pharmacy', name: t('settings:userManagement.modules.pharmacy'), icon: <LocalPharmacy />, category: 'healthcare', description: 'Dispensation et stocks de médicaments' },
    ];

    const MODULE_CATEGORIES = [
        { id: 'core', name: 'Système', icon: <DashboardIcon fontSize="small" /> },
        { id: 'supply', name: 'Gestion Commerciale', icon: <ShoppingCart fontSize="small" /> },
        { id: 'healthcare', name: 'Santé & Médical', icon: <MedicalServices fontSize="small" /> },
    ];

    // Rôles avec modules suggérés
    const ROLES_CONFIG = {
        admin: {
            label: t('settings:userManagement.roles.admin'),
            modules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices', 'products', 'clients'],
            permissions: {
                can_manage_users: true,
                can_manage_settings: true,
                can_view_analytics: true,
                can_approve_purchases: true,
            },
        },
        manager: {
            label: t('settings:userManagement.roles.manager'),
            modules: ['dashboard', 'suppliers', 'purchase-orders', 'invoices', 'products', 'clients'],
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
        doctor: {
            label: t('settings:userManagement.roles.doctor'),
            modules: ['dashboard', 'patients', 'consultations', 'laboratory', 'pharmacy'],
            permissions: {
                can_manage_users: false,
                can_manage_settings: false,
                can_view_analytics: true,
                can_approve_purchases: false,
            },
        },
        nurse: {
            label: t('settings:userManagement.roles.nurse'),
            modules: ['dashboard', 'patients', 'consultations'],
            permissions: {
                can_manage_users: false,
                can_manage_settings: false,
                can_view_analytics: true,
                can_approve_purchases: false,
            },
        },
        lab_tech: {
            label: t('settings:userManagement.roles.lab_tech'),
            modules: ['dashboard', 'patients', 'laboratory'],
            permissions: {
                can_manage_users: false,
                can_manage_settings: false,
                can_view_analytics: true,
                can_approve_purchases: false,
            },
        },
        pharmacist: {
            label: t('settings:userManagement.roles.pharmacist'),
            modules: ['dashboard', 'patients', 'pharmacy'],
            permissions: {
                can_manage_users: false,
                can_manage_settings: false,
                can_view_analytics: true,
                can_approve_purchases: false,
            },
        },
        receptionist: {
            label: t('settings:userManagement.roles.receptionist'),
            modules: ['dashboard', 'patients'],
            permissions: {
                can_manage_users: false,
                can_manage_settings: false,
                can_view_analytics: false,
                can_approve_purchases: false,
            },
        },
    };
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        password: '',
        confirmPassword: '',
    });

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
    }, []);

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
                enqueueSnackbar(t('settings:userManagement.inviteDialog.inviteSuccess'), { variant: 'success' });
                setInviteDialogOpen(false);
                setInviteForm({ email: '', first_name: '', last_name: '', role: 'buyer' });
                fetchUsers();
            } else {
                throw new Error('Failed to invite user');
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

    const handlePasswordChange = async () => {
        if (!passwordForm.password || passwordForm.password !== passwordForm.confirmPassword) {
            enqueueSnackbar(t('settings:userManagement.passwordDialog.errorMatch'), { variant: 'error' });
            return;
        }

        if (passwordForm.password.length < 8) {
            enqueueSnackbar(t('settings:userManagement.passwordDialog.errorLength'), { variant: 'error' });
            return;
        }

        try {
            const response = await fetch(`/api/v1/accounts/organization/users/${selectedUser.id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${localStorage.getItem('authToken')}`,
                },
                body: JSON.stringify({
                    password: passwordForm.password
                }),
            });

            if (response.ok) {
                enqueueSnackbar(t('settings:userManagement.passwordDialog.success'), { variant: 'success' });
                setPasswordDialogOpen(false);
                setPasswordForm({ password: '', confirmPassword: '' });
            } else {
                const data = await response.json();
                enqueueSnackbar(data.error || t('settings:userManagement.passwordDialog.error'), { variant: 'error' });
            }
        } catch (error) {
            enqueueSnackbar(t('common:error'), { variant: 'error' });
        }
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
                <Button
                    variant="contained"
                    startIcon={<PersonAdd />}
                    onClick={() => setInviteDialogOpen(true)}
                >
                    {t('settings:userManagement.inviteUser')}
                </Button>
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

            {/* Table des utilisateurs */}
            <Card>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('settings:userManagement.table.user')}</TableCell>
                                <TableCell>{t('settings:userManagement.table.email')}</TableCell>
                                <TableCell>{t('settings:userManagement.table.role')}</TableCell>
                                <TableCell>{t('settings:userManagement.table.modules')}</TableCell>
                                <TableCell>{t('settings:userManagement.table.status')}</TableCell>
                                <TableCell align="right">{t('settings:userManagement.table.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar>
                                                {user.first_name?.charAt(0) || user.username?.charAt(0) || '?'}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle2">
                                                    {user.first_name} {user.last_name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    @{user.username}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={ROLES_CONFIG[user.role]?.label || user.role}
                                            size="small"
                                            color={getRoleChipColor(user.role)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {user.enabled_modules?.length || 0} {t('settings:userManagement.table.modulesCount')}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {user.is_active ? (
                                            <Chip label={t('settings:userManagement.status.active')} size="small" color="success" icon={<CheckCircle />} />
                                        ) : (
                                            <Chip label={t('settings:userManagement.status.inactive')} size="small" color="default" icon={<Cancel />} />
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={(e) => handleMenuOpen(e, user)}
                                        >
                                            <MoreVert />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {users.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Mascot pose="thinking" animation="float" size={80} />
                        <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                            {t('settings:userManagement.noUsers')}
                        </Typography>
                    </Box>
                )}
            </Card>

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
                <MenuItem onClick={() => {
                    setPasswordDialogOpen(true);
                    handleMenuClose();
                }}>
                    <VpnKey fontSize="small" sx={{ mr: 1 }} />
                    {t('settings:userManagement.menu.changePassword')}
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

            {/* Dialog de permissions - Redessiné */}
            <Dialog
                open={permissionsDialogOpen}
                onClose={() => setPermissionsDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 2 }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <Edit />
                        </Avatar>
                        <Box>
                            <Typography variant="h6">{t('settings:userManagement.permissionsDialog.title')}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {selectedUser?.first_name} {selectedUser?.last_name} (@{selectedUser?.username})
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    {selectedUser && (
                        <Box sx={{ py: 1 }}>
                            {/* Section Permissions Spéciales */}
                            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                                {t('settings:userManagement.permissionsDialog.specialPermissions')}
                            </Typography>
                            <Grid container spacing={1} sx={{ mb: 4 }}>
                                {[
                                    { id: 'can_manage_users', label: t('settings:userManagement.permissions.manageUsers') },
                                    { id: 'can_manage_settings', label: t('settings:userManagement.permissions.manageSettings') },
                                    { id: 'can_view_analytics', label: t('settings:userManagement.permissions.viewAnalytics') },
                                    { id: 'can_approve_purchases', label: t('settings:userManagement.permissions.approvePurchases') },
                                ].map((perm) => (
                                    <Grid item xs={12} sm={6} key={perm.id}>
                                        <Card variant="outlined" sx={{
                                            transition: '0.2s',
                                            '&:hover': { bgcolor: 'action.hover' },
                                            borderColor: permissionsForm[perm.id] ? 'primary.light' : 'divider',
                                            bgcolor: permissionsForm[perm.id] ? 'primary.50' : 'background.paper'
                                        }}>
                                            <CardContent sx={{ py: '8px !important', px: 2 }}>
                                                <FormControlLabel
                                                    sx={{ width: '100%', m: 0 }}
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={permissionsForm[perm.id]}
                                                            onChange={(e) => setPermissionsForm({ ...permissionsForm, [perm.id]: e.target.checked })}
                                                        />
                                                    }
                                                    label={<Typography variant="body2" fontWeight={500}>{perm.label}</Typography>}
                                                />
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>

                            {/* Section Accès Modules */}
                            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                                {t('settings:userManagement.permissionsDialog.moduleAccess')}
                            </Typography>

                            {MODULE_CATEGORIES.map((category) => (
                                <Box key={category.id} sx={{ mb: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pl: 0.5 }}>
                                        {category.icon}
                                        <Typography variant="subtitle2" fontWeight={600}>{category.name}</Typography>
                                    </Box>
                                    <Grid container spacing={2}>
                                        {AVAILABLE_MODULES.filter(m => m.category === category.id).map((module) => (
                                            <Grid item xs={12} sm={6} md={4} key={module.id}>
                                                <Card
                                                    variant="outlined"
                                                    sx={{
                                                        height: '100%',
                                                        cursor: 'pointer',
                                                        transition: '0.2s',
                                                        borderColor: permissionsForm.module_access.includes(module.id) ? 'primary.main' : 'divider',
                                                        bgcolor: permissionsForm.module_access.includes(module.id) ? 'primary.50' : 'background.paper',
                                                        '&:hover': {
                                                            borderColor: 'primary.main',
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                                        }
                                                    }}
                                                    onClick={() => {
                                                        const isSelected = permissionsForm.module_access.includes(module.id);
                                                        const newModules = isSelected
                                                            ? permissionsForm.module_access.filter(m => m !== module.id)
                                                            : [...permissionsForm.module_access, module.id];
                                                        setPermissionsForm({ ...permissionsForm, module_access: newModules });
                                                    }}
                                                >
                                                    <CardContent sx={{ p: 2 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                                            <Box sx={{
                                                                p: 1,
                                                                borderRadius: 1,
                                                                bgcolor: permissionsForm.module_access.includes(module.id) ? 'primary.main' : 'grey.100',
                                                                color: permissionsForm.module_access.includes(module.id) ? 'white' : 'text.secondary',
                                                                display: 'flex'
                                                            }}>
                                                                {React.cloneElement(module.icon, { fontSize: 'small' })}
                                                            </Box>
                                                            <Box sx={{ flexGrow: 1 }}>
                                                                <Typography variant="body2" fontWeight={700} sx={{ color: permissionsForm.module_access.includes(module.id) ? 'primary.main' : 'text.primary' }}>
                                                                    {module.name}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.2 }}>
                                                                    {module.description}
                                                                </Typography>
                                                            </Box>
                                                            <Checkbox
                                                                size="small"
                                                                checked={permissionsForm.module_access.includes(module.id)}
                                                                sx={{ p: 0, mt: 0.5 }}
                                                            />
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Button onClick={() => setPermissionsDialogOpen(false)} color="inherit">
                        {t('common:cancel')}
                    </Button>
                    <Button
                        onClick={handleSavePermissions}
                        variant="contained"
                        size="large"
                        sx={{ px: 4, borderRadius: 2 }}
                    >
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

            {/* Dialog de changement de mot de passe */}
            <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{t('settings:userManagement.passwordDialog.title')}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        {t('settings:userManagement.passwordDialog.subtitle', { name: `${selectedUser?.first_name} ${selectedUser?.last_name}` })}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            label={t('settings:userManagement.passwordDialog.newPassword')}
                            type="password"
                            value={passwordForm.password}
                            onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            fullWidth
                            label={t('settings:userManagement.passwordDialog.confirmPassword')}
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPasswordDialogOpen(false)}>{t('common:cancel')}</Button>
                    <Button onClick={handlePasswordChange} variant="contained" color="primary">
                        {t('common:save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default UserManagement;

