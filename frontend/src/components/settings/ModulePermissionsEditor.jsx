import React, { useEffect, useState, useMemo } from 'react';
import {
    Box, Typography, Checkbox, Chip, Stack, CircularProgress,
    TextField, InputAdornment, Button, Divider, FormControlLabel, Switch, Alert,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { authAPI } from '../../services/api';

const CATEGORY_LABELS = {
    core: 'Système',
    supply: 'Gestion commerciale',
    healthcare: 'Santé & médical',
    other: 'Autres',
};

const GLOBAL_FLAGS = [
    { key: 'can_manage_users', label: 'Gérer les utilisateurs', hint: 'Créer et modifier les comptes et leurs droits' },
    { key: 'can_manage_settings', label: 'Gérer les paramètres', hint: "Modifier la configuration de l'organisation" },
    { key: 'can_view_analytics', label: 'Voir les analyses', hint: 'Accès aux rapports et statistiques' },
    { key: 'can_approve_purchases', label: 'Approuver les achats', hint: 'Valider les bons de commande' },
];

/**
 * Choix explicite de ce qu'un utilisateur peut FAIRE, module par module.
 *
 * Les rôles ne définissent plus les droits (ils ne servaient au mieux que de
 * point de départ) : on coche ici les actions réellement autorisées. Le
 * catalogue vient du backend pour que les deux côtés partagent la même
 * définition, et il est limité aux modules réellement actifs pour
 * l'organisation.
 *
 * `value` : { laboratory: ['view','validate'], patients: ['view'] }
 * Un module sans aucune action cochée = pas d'accès à ce module.
 */
const ModulePermissionsEditor = ({ value = {}, onChange, flags = {}, onFlagsChange }) => {
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtre, setFiltre] = useState('');

    useEffect(() => {
        let annule = false;
        authAPI.getPermissionCatalog()
            .then((res) => { if (!annule) setCatalog(res.data?.catalog || []); })
            .catch(() => { if (!annule) setCatalog([]); })
            .finally(() => { if (!annule) setLoading(false); });
        return () => { annule = true; };
    }, []);

    const groupes = useMemo(() => {
        const q = filtre.trim().toLowerCase();
        const visibles = q
            ? catalog.filter((m) => m.name.toLowerCase().includes(q) || m.module.includes(q))
            : catalog;
        return visibles.reduce((acc, m) => {
            const cat = m.category || 'other';
            (acc[cat] = acc[cat] || []).push(m);
            return acc;
        }, {});
    }, [catalog, filtre]);

    const actionsDe = (moduleCode) => value[moduleCode] || [];
    const aAcces = (moduleCode) => actionsDe(moduleCode).length > 0;

    const basculerAction = (moduleCode, action, toutesLesActions) => {
        const actuelles = actionsDe(moduleCode);
        let suivantes;
        if (actuelles.includes(action)) {
            suivantes = actuelles.filter((a) => a !== action);
        } else {
            // Cocher une action donne implicitement le droit de consulter :
            // on ne peut pas valider un examen qu'on ne peut pas ouvrir.
            suivantes = [...new Set([...actuelles, action, 'view'])]
                .filter((a) => toutesLesActions.includes(a));
        }
        const copie = { ...value };
        if (suivantes.length) copie[moduleCode] = suivantes;
        else delete copie[moduleCode];
        onChange(copie);
    };

    const basculerModule = (moduleCode, toutesLesActions) => {
        const copie = { ...value };
        if (aAcces(moduleCode)) delete copie[moduleCode];
        else copie[moduleCode] = [...toutesLesActions];
        onChange(copie);
    };

    const toutSelectionner = (tout) => {
        if (!tout) return onChange({});
        const copie = {};
        catalog.forEach((m) => { copie[m.module] = m.actions.map((a) => a.value); });
        onChange(copie);
    };

    const nbModules = Object.keys(value).filter((m) => value[m]?.length).length;

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>;
    }

    return (
        <Box>
            {onFlagsChange && (
                <>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Droits généraux
                    </Typography>
                    <Stack spacing={0.5} sx={{ mb: 2 }}>
                        {GLOBAL_FLAGS.map((f) => (
                            <FormControlLabel
                                key={f.key}
                                control={
                                    <Switch
                                        size="small"
                                        checked={!!flags[f.key]}
                                        onChange={(e) => onFlagsChange({ ...flags, [f.key]: e.target.checked })}
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body2">{f.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{f.hint}</Typography>
                                    </Box>
                                }
                            />
                        ))}
                    </Stack>
                    <Divider sx={{ mb: 2 }} />
                </>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" fontWeight={700}>
                    Accès par module
                </Typography>
                <Chip
                    size="small"
                    label={nbModules === 0 ? 'Aucun module' : nbModules + ' module(s)'}
                    color={nbModules === 0 ? 'default' : 'primary'}
                    variant={nbModules === 0 ? 'outlined' : 'filled'}
                />
                <Box sx={{ flex: 1 }} />
                <Button size="small" onClick={() => toutSelectionner(true)}>Tout cocher</Button>
                <Button size="small" color="inherit" onClick={() => toutSelectionner(false)}>Tout décocher</Button>
            </Box>

            {nbModules === 0 && (
                <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
                    Sans aucun module coché, cette personne pourra se connecter mais ne verra rien.
                </Alert>
            )}

            <TextField
                size="small" fullWidth placeholder="Rechercher un module..."
                value={filtre} onChange={(e) => setFiltre(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />

            <Stack spacing={2}>
                {Object.entries(groupes).map(([cat, modules]) => (
                    <Box key={cat}>
                        <Typography
                            variant="overline"
                            color="text.secondary"
                            sx={{ letterSpacing: '0.08em', display: 'block', mb: 0.5 }}
                        >
                            {CATEGORY_LABELS[cat] || cat}
                        </Typography>

                        <Stack spacing={1}>
                            {modules.map((m) => {
                                const toutes = m.actions.map((a) => a.value);
                                const actif = aAcces(m.module);
                                return (
                                    <Box
                                        key={m.module}
                                        sx={{
                                            border: '1px solid',
                                            borderColor: actif ? 'primary.main' : 'divider',
                                            borderRadius: 2,
                                            p: 1.25,
                                            bgcolor: actif ? 'action.hover' : 'transparent',
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Checkbox
                                                size="small"
                                                checked={actif}
                                                indeterminate={actif && actionsDe(m.module).length < toutes.length}
                                                onChange={() => basculerModule(m.module, toutes)}
                                                sx={{ p: 0.5 }}
                                            />
                                            <Typography
                                                variant="body2"
                                                fontWeight={600}
                                                color={actif ? 'primary.main' : 'text.primary'}
                                                sx={{ flex: 1 }}
                                            >
                                                {m.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {actionsDe(m.module).length}/{toutes.length}
                                            </Typography>
                                        </Box>

                                        {actif && (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1, pl: 4 }}>
                                                {m.actions.map((a) => {
                                                    const coche = actionsDe(m.module).includes(a.value);
                                                    return (
                                                        <Chip
                                                            key={a.value}
                                                            label={a.label}
                                                            size="small"
                                                            color={coche ? 'primary' : 'default'}
                                                            variant={coche ? 'filled' : 'outlined'}
                                                            onClick={() => basculerAction(m.module, a.value, toutes)}
                                                            sx={{ cursor: 'pointer' }}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
};

export default ModulePermissionsEditor;
