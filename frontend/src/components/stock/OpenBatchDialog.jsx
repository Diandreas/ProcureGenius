import React, { useEffect, useMemo, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack,
    Typography, Alert, FormControlLabel, Checkbox, Autocomplete, CircularProgress,
} from '@mui/material';
import { LockOpen as OpenIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import batchAPI from '../../services/batchAPI';

const CONSERVATIONS = [
    '2-8 °C (réfrigérateur)',
    'Température ambiante (15-25 °C)',
    '-20 °C (congélateur)',
    "À l'abri de la lumière",
];

const aujourdhuiISO = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const versDate = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`) : null);
const formater = (d) => (d ? d.toLocaleDateString('fr-FR') : '-');

/** Ouvre l'etiquette d'ouverture (PDF) dans un nouvel onglet. */
export const imprimerEtiquetteOuverture = async (batchId, enqueueSnackbar) => {
    try {
        const blob = await batchAPI.getOpeningLabel(batchId);
        const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (e) {
        enqueueSnackbar?.("Impossible de générer l'étiquette d'ouverture", { variant: 'error' });
    }
};

/**
 * Ouverture d'un lot (reactif, flacon, paquet), partagee par l'ecran Reactifs,
 * la liste des lots d'un produit et le formulaire produit.
 *
 * La date d'ouverture est SAISIE et obligatoire : un flacon est souvent ouvert
 * a la paillasse et enregistre plus tard, la date du clic ne dit pas la verite.
 * La date limite d'utilisation affichee est la plus proche entre la peremption
 * imprimee et « ouverture + stabilite » — c'est celle qui part sur l'etiquette.
 *
 * props.batch   : { id, batch_number, expiry_date, shelf_life_after_opening_days, product_name? }
 * props.product : { name?, default_shelf_life_after_opening?, storage_conditions? } (facultatif)
 */
const OpenBatchDialog = ({ open, batch, product, onClose, onOpened }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [dateOuverture, setDateOuverture] = useState('');
    const [peremption, setPeremption] = useState('');
    const [stabilite, setStabilite] = useState('');
    const [memoriser, setMemoriser] = useState(false);
    const [conservation, setConservation] = useState('');
    const [testsParFlacon, setTestsParFlacon] = useState('');
    const [imprimer, setImprimer] = useState(true);
    const [tentative, setTentative] = useState(false);
    const [envoi, setEnvoi] = useState(false);

    useEffect(() => {
        if (!open) return;
        // Volontairement vide : la date doit etre choisie, pas acceptee par defaut.
        setDateOuverture('');
        // La peremption imprimee est pre-remplie avec ce qui est en base, mais
        // reste modifiable : on la relit sur le flacon au moment de l'ouvrir,
        // et elle a parfois ete saisie de travers a la reception.
        setPeremption((batch?.expiry_date || '').slice(0, 10));
        setStabilite(
            String(batch?.shelf_life_after_opening_days
                ?? product?.default_shelf_life_after_opening
                ?? ''),
        );
        setMemoriser(false);
        setConservation(product?.storage_conditions || '');
        setTestsParFlacon(String(product?.tests_per_unit ?? ''));
        setImprimer(true);
        setTentative(false);
    }, [open, batch, product]);

    const jours = parseInt(stabilite, 10);
    const limite = useMemo(() => {
        const ouverture = versDate(dateOuverture);
        const dateParPeremption = versDate(peremption);
        const parStabilite = ouverture && jours > 0
            ? new Date(ouverture.getTime() + jours * 86400000)
            : null;
        const candidates = [dateParPeremption, parStabilite].filter(Boolean);
        if (!ouverture || candidates.length === 0) return null;
        const plusProche = new Date(Math.min(...candidates.map((d) => d.getTime())));
        return {
            date: plusProche,
            parPeremption: dateParPeremption && plusProche.getTime() === dateParPeremption.getTime()
                && parStabilite && dateParPeremption < parStabilite,
        };
    }, [dateOuverture, jours, peremption]);

    const peremptionInitiale = (batch?.expiry_date || '').slice(0, 10);
    const peremptionChangee = peremption && peremption !== peremptionInitiale;

    const dejaDepasse = limite && limite.date < versDate(aujourdhuiISO());

    const valider = async () => {
        setTentative(true);
        if (!dateOuverture) {
            enqueueSnackbar("Saisissez la date d'ouverture", { variant: 'warning' });
            return;
        }
        if (!peremption) {
            enqueueSnackbar('La date de péremption est obligatoire', { variant: 'warning' });
            return;
        }
        if (stabilite && !(jours > 0)) {
            enqueueSnackbar('La stabilité doit être un nombre de jours positif', { variant: 'warning' });
            return;
        }
        const tests = parseInt(testsParFlacon, 10);
        if (testsParFlacon && !(tests > 0)) {
            enqueueSnackbar('Le nombre de tests par flacon doit être un entier positif', { variant: 'warning' });
            return;
        }
        setEnvoi(true);
        try {
            const ouvert = await batchAPI.openBatch(batch.id, {
                opened_at: dateOuverture,
                // Corrige la peremption imprimee si elle a ete rectifiee ici
                expiry_date: peremption,
                shelf_life_after_opening_days: jours > 0 ? jours : null,
                save_as_product_default: memoriser && jours > 0,
                storage_conditions: conservation,
                // null = ne change rien au reglage existant du reactif
                tests_per_unit: tests > 0 ? tests : null,
            });
            enqueueSnackbar(`Lot ${batch.batch_number} ouvert`, { variant: 'success' });
            if (imprimer) await imprimerEtiquetteOuverture(batch.id, enqueueSnackbar);
            onOpened?.(ouvert);
            onClose();
        } catch (e) {
            enqueueSnackbar(e.response?.data?.error || "Échec de l'ouverture du lot", { variant: 'error' });
        } finally {
            setEnvoi(false);
        }
    };

    const nomProduit = product?.name || batch?.product_name || '';

    return (
        <Dialog open={open} onClose={() => !envoi && onClose()} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Typography variant="h6" fontWeight={700}>Ouvrir le lot {batch?.batch_number}</Typography>
                {nomProduit && <Typography variant="body2" color="text.secondary">{nomProduit}</Typography>}
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <TextField
                        label="Date d'ouverture" type="date" required autoFocus fullWidth
                        value={dateOuverture}
                        onChange={(e) => setDateOuverture(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ max: aujourdhuiISO() }}
                        error={tentative && !dateOuverture}
                        helperText={tentative && !dateOuverture
                            ? "Obligatoire : indiquez le jour où le flacon a été réellement ouvert"
                            : "Le jour où le flacon a été réellement ouvert (pas forcément aujourd'hui)"}
                    />

                    <TextField
                        label="Date de péremption imprimée" type="date" required fullWidth
                        value={peremption}
                        onChange={(e) => setPeremption(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        error={tentative && !peremption}
                        helperText={peremptionChangee
                            ? `Corrigée (était le ${formater(versDate(peremptionInitiale))}) — la correction sera enregistrée et tracée`
                            : 'Celle qui figure sur le flacon. Corrigez-la ici si elle a été mal saisie.'}
                    />

                    <TextField
                        label="Stabilité après ouverture (jours)" type="number" fullWidth
                        value={stabilite}
                        onChange={(e) => setStabilite(e.target.value)}
                        inputProps={{ min: 1 }}
                        helperText="Selon la notice du fabricant. Laissez vide si le réactif n'a pas de limite après ouverture."
                    />
                    {jours > 0 && (
                        <FormControlLabel
                            sx={{ mt: -1 }}
                            control={<Checkbox size="small" checked={memoriser} onChange={(e) => setMemoriser(e.target.checked)} />}
                            label={<Typography variant="body2">Retenir {jours} jours comme durée par défaut pour ce réactif</Typography>}
                        />
                    )}

                    <Autocomplete
                        freeSolo
                        options={CONSERVATIONS}
                        inputValue={conservation}
                        onInputChange={(e, v) => setConservation(v)}
                        renderInput={(params) => (
                            <TextField {...params} label="Conservation" helperText="Imprimée sur l'étiquette, retenue pour ce réactif" />
                        )}
                    />

                    <TextField
                        label="Tests par flacon / kit (facultatif)" type="number" fullWidth
                        value={testsParFlacon}
                        onChange={(e) => setTestsParFlacon(e.target.value)}
                        inputProps={{ min: 1 }}
                        helperText="Renseigné : chaque examen décompte des tests sur ce flacon, et une unité sort du stock quand il est vide. Vide : décompte en unités, comme aujourd'hui."
                    />
                    {product?.untracked_tests > 0 && (
                        <Alert severity="info">
                            {product.untracked_tests} test(s) réalisé(s) sans flacon ouvert seront décomptés sur ce flacon.
                        </Alert>
                    )}

                    {limite ? (
                        <Alert severity={dejaDepasse ? 'error' : 'info'}>
                            À utiliser avant le <strong>{formater(limite.date)}</strong>
                            {limite.parPeremption && ' (péremption imprimée, plus proche que la stabilité)'}
                            {dejaDepasse && ' — cette date est déjà dépassée'}
                        </Alert>
                    ) : (
                        <Alert severity="warning">
                            Saisissez la date d&apos;ouverture pour calculer la date limite d&apos;utilisation.
                        </Alert>
                    )}

                    <FormControlLabel
                        control={<Checkbox size="small" checked={imprimer} onChange={(e) => setImprimer(e.target.checked)} />}
                        label={<Typography variant="body2">Imprimer l&apos;étiquette d&apos;ouverture à coller sur le flacon</Typography>}
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} disabled={envoi}>Annuler</Button>
                <Button
                    variant="contained"
                    startIcon={envoi ? <CircularProgress size={16} /> : <OpenIcon />}
                    onClick={valider}
                    disabled={envoi}
                >
                    Confirmer l&apos;ouverture
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default OpenBatchDialog;
