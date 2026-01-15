import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    CircularProgress
} from '@mui/material';
import {
    Print,
    Receipt,
    Download,
    Close
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * Reusable Print Modal
 * Mimics the Invoice Detail PDF generation dialog.
 * 
 * @param {boolean} open - Whether the dialog is open
 * @param {function} onClose - Function to close the dialog
 * @param {string} title - Title of the dialog
 * @param {boolean} loading - Loading state for action buttons
 * @param {function} onPreview - Callback for Preview action
 * @param {function} onPrint - Callback for Print action
 * @param {function} onDownload - Callback for Download action
 */
const PrintModal = ({
    open,
    onClose,
    title,
    loading = false,
    onPreview,
    onPrint,
    onDownload,
    helpText
}) => {
    const { t } = useTranslation(['common']);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {title || t('common:buttons.print', 'Imprimer')}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        {helpText || t('common:printHelp', 'Choisissez une action pour ce document.')}
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    {t('common:buttons.cancel', 'Annuler')}
                </Button>

                {onPreview && (
                    <Button
                        onClick={onPreview}
                        variant="outlined"
                        disabled={loading}
                        startIcon={<Receipt />}
                    >
                        {t('common:buttons.preview', 'Aperçu')}
                    </Button>
                )}

                {onPrint && (
                    <Button
                        onClick={onPrint}
                        variant="outlined"
                        color="secondary"
                        disabled={loading}
                        startIcon={<Print />}
                    >
                        {t('common:buttons.print', 'Imprimer')}
                    </Button>
                )}

                {onDownload && (
                    <Button
                        onClick={onDownload}
                        variant="contained"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <Download />}
                    >
                        {loading ? t('common:buttons.generating', 'Génération...') : t('common:buttons.download', 'Télécharger')}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default PrintModal;
