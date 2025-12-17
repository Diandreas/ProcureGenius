import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Send,
  Close,
  Email,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';

function SendInvoiceEmailModal({ open, onClose, invoice, onSent }) {
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation();
  const [recipientEmail, setRecipientEmail] = useState(invoice?.client?.email || '');
  const [subject, setSubject] = useState(`Facture ${invoice?.invoice_number || ''} - ProcureGenius`);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!recipientEmail) {
      enqueueSnackbar(t('invoices:messages.emailRequired'), { variant: 'error' });
      return;
    }

    try {
      setSending(true);
      const response = await fetch(`/api/invoices/${invoice.id}/send-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          recipient_email: recipientEmail,
          subject: subject,
          message: message,
        }),
      });

      const data = await response.json();
      if (data.success || response.ok) {
        enqueueSnackbar(data.message || t('invoices:messages.invoiceSentSuccess'), { variant: 'success' });
        if (onSent) onSent();
        onClose();
      } else {
        enqueueSnackbar(data.error || t('invoices:messages.sendError'), { variant: 'error' });
      }
    } catch (error) {
      console.error('Error sending invoice email:', error);
      enqueueSnackbar(t('invoices:messages.emailError'), { variant: 'error' });
    } finally {
      setSending(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Email />
            <Typography variant="h6">{t('invoices:dialogs.sendEmail.title')}</Typography>
          </Box>
          <Button onClick={onClose} size="small" sx={{ minWidth: 'auto', p: 0.5 }}>
            <Close />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="info" sx={{ mb: 1 }}>
            {t('invoices:dialogs.sendEmail.pdfAttachment', 'La facture sera envoyée en PDF en pièce jointe.')}
          </Alert>

          <TextField
            fullWidth
            label={t('invoices:dialogs.sendEmail.recipient')}
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            required
            helperText={t('invoices:dialogs.sendEmail.recipientHelp')}
          />

          <TextField
            fullWidth
            label={t('invoices:dialogs.sendEmail.subject', 'Objet')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label={t('invoices:dialogs.sendEmail.message')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('invoices:dialogs.sendEmail.messagePlaceholder', 'Message personnalisé à inclure dans l\'email...')}
            helperText={t('invoices:dialogs.sendEmail.messageHelp')}
          />

          <Divider />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {t('invoices:dialogs.sendEmail.invoiceDetails', 'Détails de la facture')}:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('invoices:invoiceNumber')}: {invoice.invoice_number || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('invoices:labels.total')}: {invoice.total_amount?.toFixed(2) || '0.00'} {invoice.currency || 'CAD'}
            </Typography>
            {invoice.client && (
              <Typography variant="body2" color="text.secondary">
                {t('invoices:labels.client')}: {invoice.client.name || (invoice.client.first_name + ' ' + invoice.client.last_name)}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          {t('invoices:buttons.cancel')}
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          startIcon={sending ? <CircularProgress size={16} /> : <Send />}
          disabled={sending || !recipientEmail}
        >
          {sending ? t('invoices:labels.sending') : t('invoices:dialogs.sendEmail.send')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SendInvoiceEmailModal;

