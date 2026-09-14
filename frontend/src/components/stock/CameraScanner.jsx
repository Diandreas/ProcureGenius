import React, { useEffect, useRef, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Box,
    Typography, Alert, IconButton, Tooltip,
} from '@mui/material';
import {
    Close as CloseIcon, Cameraswitch as SwitchIcon,
} from '@mui/icons-material';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// Formats reellement presents sur les boites en pharmacie et au labo :
// QR (nos etiquettes), DataMatrix (boites de medicaments, GS1), EAN-13/EAN-8
// (code-barres fournisseur) et Code 128/39 (consommables, reactifs).
const FORMATS = [
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.DATA_MATRIX,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
];

const ZONE_ID = 'zone-scanner-camera';

/**
 * Scanner par la camera du telephone / de la tablette, dans l'application.
 *
 * S'ouvre en plein ecran sur mobile, prefere la camera arriere, et rend le
 * code lu UNE seule fois via `onDetected` avant de se fermer : sans ca, la
 * camera relit la meme boite plusieurs fois par seconde et declenche autant de
 * recherches.
 *
 * La camera est toujours arretee a la fermeture — une camera laissee allumee
 * vide la batterie et bloque la camera pour les autres applications.
 */
const CameraScanner = ({ open, onClose, onDetected, title = 'Scanner un code' }) => {
    const scannerRef = useRef(null);
    const dejaLuRef = useRef(false);
    const [erreur, setErreur] = useState('');
    const [cameras, setCameras] = useState([]);
    // null = premier demarrage : on choisit la camera arriere automatiquement.
    const [indexCamera, setIndexCamera] = useState(null);
    const indexActifRef = useRef(0);

    const arreter = async () => {
        const s = scannerRef.current;
        scannerRef.current = null;
        if (!s) return;
        try {
            if (s.isScanning) await s.stop();
            s.clear();
        } catch (e) {
            // La camera a deja ete liberee (fermeture rapide) : rien a faire.
        }
    };

    useEffect(() => {
        if (!open) return undefined;
        let annule = false;
        dejaLuRef.current = false;
        setErreur('');

        const demarrer = async () => {
            try {
                const liste = await Html5Qrcode.getCameras();
                if (annule) return;
                if (!liste || liste.length === 0) {
                    setErreur("Aucune caméra détectée sur cet appareil.");
                    return;
                }
                setCameras(liste);

                // Camera arriere en priorite : c'est celle qu'on pointe sur une boite.
                const arriere = liste.findIndex((c) => /back|rear|arri|environment/i.test(c.label));
                const index = indexCamera === null
                    ? Math.max(arriere, 0)
                    : indexCamera % liste.length;
                indexActifRef.current = index;
                const cible = liste[index];

                const scanner = new Html5Qrcode(ZONE_ID, { formatsToSupport: FORMATS, verbose: false });
                scannerRef.current = scanner;

                await scanner.start(
                    cible.id,
                    {
                        fps: 10,
                        // Cadre large et bas : les codes-barres lineaires sont
                        // plus larges que hauts, un carre les couperait.
                        qrbox: (w, h) => ({
                            width: Math.floor(Math.min(w, h * 1.6) * 0.8),
                            height: Math.floor(Math.min(w, h) * 0.5),
                        }),
                        aspectRatio: 1.333,
                    },
                    (texte) => {
                        if (dejaLuRef.current) return;
                        dejaLuRef.current = true;
                        if (navigator.vibrate) navigator.vibrate(80);
                        arreter().finally(() => onDetected(texte));
                    },
                    () => { /* aucune lecture sur cette image : normal, on continue */ },
                );
            } catch (e) {
                if (annule) return;
                const msg = String(e?.message || e || '');
                if (/permission|NotAllowed/i.test(msg)) {
                    setErreur("L'accès à la caméra a été refusé. Autorisez la caméra pour ce site dans les réglages du navigateur, puis réessayez.");
                } else if (/NotReadable|in use|Could not start/i.test(msg)) {
                    setErreur("La caméra est utilisée par une autre application. Fermez-la puis réessayez.");
                } else {
                    setErreur("Impossible de démarrer la caméra : " + msg);
                }
            }
        };

        // Laisse le Dialog monter la zone video avant d'y attacher la camera.
        const t = setTimeout(demarrer, 150);
        return () => {
            annule = true;
            clearTimeout(t);
            arreter();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, indexCamera]);

    const fermer = () => {
        arreter().finally(onClose);
    };

    const changerCamera = () => {
        if (cameras.length < 2) return;
        arreter().finally(() => setIndexCamera((indexActifRef.current + 1) % cameras.length));
    };

    return (
        <Dialog open={open} onClose={fermer} fullWidth maxWidth="sm"
            PaperProps={{ sx: { m: { xs: 1, sm: 3 } } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
                <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>{title}</Typography>
                {cameras.length > 1 && (
                    <Tooltip title="Changer de caméra">
                        <IconButton onClick={changerCamera}><SwitchIcon /></IconButton>
                    </Tooltip>
                )}
                <IconButton onClick={fermer}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ px: { xs: 1, sm: 3 } }}>
                {erreur ? (
                    <Alert severity="warning">{erreur}</Alert>
                ) : (
                    <>
                        <Box
                            id={ZONE_ID}
                            sx={{
                                width: '100%', minHeight: 260, bgcolor: '#000',
                                borderRadius: 2, overflow: 'hidden',
                                '& video': { width: '100% !important', objectFit: 'cover' },
                            }}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, textAlign: 'center' }}>
                            Placez le code-barres ou le QR dans le cadre. La lecture est automatique.
                        </Typography>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={fermer}>Fermer</Button>
            </DialogActions>
        </Dialog>
    );
};

export default CameraScanner;
