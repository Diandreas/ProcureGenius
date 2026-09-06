import React, { useState, useEffect } from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Avatar,
    Button,
    Tooltip,
    CircularProgress,
} from '@mui/material';
import {
    Close as CloseIcon,
    OpenInNew as OpenInNewIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import patientAPI from '../../services/patientAPI';
import MedicalSummaryTab from '../../pages/healthcare/patients/components/MedicalSummaryTab';

/**
 * Panneau latéral "coup d'œil" sur le dossier d'un patient — pensé pour être
 * ouvert PENDANT une saisie en cours ailleurs (consultation, commande labo,
 * ordonnance...) sans jamais quitter la page ni perdre ce qui est en train
 * d'être rempli. Réutilise MedicalSummaryTab tel quel (déjà autonome : groupe
 * sanguin, allergies, conditions chroniques, derniers vitaux, dernière
 * consultation, suivis récents).
 *
 * Pour le cas où le résumé ne suffit pas, un bouton "ouvrir dans un nouvel
 * onglet" donne accès au dossier complet sans fermer/perdre la page actuelle
 * non plus.
 */
export const PatientQuickViewDrawer = ({ patientId, open, onClose }) => {
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !patientId) return;
        let cancelled = false;
        setLoading(true);
        patientAPI.getPatient(patientId)
            .then(data => { if (!cancelled) setPatient(data); })
            .catch(() => { if (!cancelled) setPatient(null); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open, patientId]);

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100%', sm: 480, md: 560 } } }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* En-tête */}
                <Box sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    bgcolor: 'primary.main',
                    color: '#fff',
                    flexShrink: 0,
                }}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)' }}>
                        {patient?.name ? patient.name.charAt(0) : <PersonIcon />}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={700} noWrap>
                            {patient?.name || 'Dossier patient'}
                        </Typography>
                        {patient && (
                            <Typography variant="caption" sx={{ opacity: 0.85 }}>
                                {patient.patient_number}
                                {patient.age != null ? ` · ${patient.age} ans` : ''}
                                {patient.gender ? ` / ${patient.gender}` : ''}
                            </Typography>
                        )}
                    </Box>
                    <Tooltip title="Ouvrir le dossier complet dans un nouvel onglet">
                        <IconButton
                            size="small"
                            sx={{ color: '#fff' }}
                            onClick={() => window.open(`/healthcare/patients/${patientId}`, '_blank', 'noopener')}
                        >
                            <OpenInNewIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* Contenu — résumé médical, déjà autonome */}
                <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
                    {loading && !patient ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : (
                        patientId && <MedicalSummaryTab patientId={patientId} />
                    )}
                </Box>
            </Box>
        </Drawer>
    );
};

/**
 * Bouton prêt à l'emploi : gère lui-même l'état ouvert/fermé du volet.
 * À placer près du nom du patient dans tout formulaire/modale où l'identité
 * du patient est déjà connue (patientId) mais son dossier pas affiché.
 *
 * <PatientQuickViewButton patientId={patientId} patientName={patient?.name} />
 */
const PatientQuickViewButton = ({ patientId, patientName, size = 'medium', variant = 'outlined', sx }) => {
    const [open, setOpen] = useState(false);

    if (!patientId) return null;

    return (
        <>
            <Button
                variant={variant}
                size={size}
                color="inherit"
                startIcon={<PersonIcon />}
                onClick={() => setOpen(true)}
                sx={{ borderRadius: 2, textTransform: 'none', whiteSpace: 'nowrap', ...sx }}
            >
                {patientName ? `Dossier : ${patientName}` : 'Voir le dossier'}
            </Button>
            <PatientQuickViewDrawer patientId={patientId} open={open} onClose={() => setOpen(false)} />
        </>
    );
};

export default PatientQuickViewButton;
