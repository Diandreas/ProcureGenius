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
import Mascot from '../../components/Mascot';

function UserManagement() {
    const { enqueueSnackbar } = useSnackbar();
    const { t } = useTranslation(['settings', 'common']);

    // Modules disponibles
    const AVAILABLE_MODULES = [
        { id: 'dashboard', name: t('settings:userManagement.modules.dashboard') },
        { id: 'suppliers', name: t('settings:userManagement.modules.suppliers') },
        { id: 'purchase-orders', name: t('settings:userManagement.modules.purchase-orders') },
        { id: 'invoices', name: t('settings:userManagement.modules.invoices') },
        { id: 'products', name: t('settings:userManagement.modules.products') },
        { id: 'clients', name: t('settings:userManagement.modules.clients') },
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
    };
    const [users, setUsers] = useState([]);
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
        </Box>
    );
}

export default UserManagement;

