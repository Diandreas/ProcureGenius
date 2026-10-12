import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { contractsAPI } from '../services/api';
import EmptyState from './EmptyState';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';

function ContractTemplatesTab() {
  const { t } = useTranslation(['contracts', 'common']);
  const { enqueueSnackbar } = useSnackbar();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentTemplate, setCurrentTemplate] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    template_type: 'contract',
    description: '',
    content: '',
    ai_prompt_instructions: '',
    is_active: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await contractsAPI.templates.list();
      setTemplates(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching templates:', err);
      enqueueSnackbar(t('contracts:templates.messages.loadError'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (template = null) => {
    if (template) {
      setCurrentTemplate(template);
      setFormData({
        name: template.name,
        template_type: template.template_type,
        description: template.description || '',
        content: template.content,
        ai_prompt_instructions: template.ai_prompt_instructions || '',
        is_active: template.is_active,
      });
    } else {
      setCurrentTemplate(null);
      setFormData({
        name: '',
        template_type: 'contract',
        description: '',
        content: '',
        ai_prompt_instructions: '',
        is_active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentTemplate(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      enqueueSnackbar(t('contracts:templates.messages.nameContentRequired'), { variant: 'error' });
      return;
      }

      try {
      if (currentTemplate) {
        await contractsAPI.templates.update(currentTemplate.id, formData);
        enqueueSnackbar(t('contracts:templates.messages.updateSuccess'), { variant: 'success' });
      } else {
        await contractsAPI.templates.create(formData);
        enqueueSnackbar(t('contracts:templates.messages.createSuccess'), { variant: 'success' });
      }
      handleCloseDialog();
      fetchTemplates();
      } catch (err) {
      console.error('Error saving template:', err);
      enqueueSnackbar(t('contracts:templates.messages.saveError'), { variant: 'error' });
      }
      };

      const handleDeleteTemplate = async (id) => {
      if (window.confirm(t('contracts:templates.messages.deleteConfirm'))) {
      try {
        await contractsAPI.templates.delete(id);
        enqueueSnackbar(t('contracts:templates.messages.deleteSuccess'), { variant: 'success' });
        fetchTemplates();
      } catch (err) {
        console.error('Error deleting template:', err);
        enqueueSnackbar(t('contracts:templates.messages.deleteError'), { variant: 'error' });
      }
      }
      };

  const getTemplateTypeLabel = (type) => {
    const types = ['contract', 'payment', 'receipt', 'quote', 'other'];
    return types.includes(type) ? t(`contracts:templates.types.${type}`) : type;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          {t('contracts:templates.newTemplate')}
        </Button>
      </Box>

      {templates.length === 0 ? (
        <EmptyState
          title={t('contracts:templates.empty.title')}
          description={t('contracts:templates.empty.description')}
          actionLabel={t('contracts:templates.empty.action')}
          onAction={() => handleOpenDialog()}
        />
      ) : isMobile ? (
        <Grid container spacing={2}>
          {templates.map((template) => (
            <Grid item xs={12} key={template.id}>
              <Card variant="outlined" sx={{ borderRadius: 3, position: 'relative' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionIcon color="primary" sx={{ fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={700}>
                        {template.name}
                      </Typography>
                    </Box>
                    <Chip
                      label={template.is_active ? t('contracts:templates.active') : t('contracts:templates.inactive')}
                      size="small"
                      color={template.is_active ? 'success' : 'default'}
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {template.description || t('contracts:templates.noDescription')}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip label={getTemplateTypeLabel(template.template_type)} size="small" variant="outlined" sx={{ height: 24, fontSize: '0.7rem' }} />
                    <Box>
                      <IconButton size="small" onClick={() => { setCurrentTemplate(template); setViewDialog(true); }}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleOpenDialog(template)} color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteTemplate(template.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('contracts:templates.fields.name')}</TableCell>
                <TableCell>{t('contracts:templates.columns.type')}</TableCell>
                <TableCell>{t('contracts:templates.fields.description')}</TableCell>
                <TableCell>{t('contracts:templates.fields.status')}</TableCell>
                <TableCell align="right">{t('contracts:templates.columns.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell sx={{ fontWeight: 500 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionIcon fontSize="small" color="primary" />
                      {template.name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={getTemplateTypeLabel(template.template_type)} size="small" />
                  </TableCell>
                  <TableCell>{template.description}</TableCell>
                  <TableCell>
                    <Chip
                      label={template.is_active ? t('contracts:templates.active') : t('contracts:templates.inactive')}
                      size="small"
                      color={template.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={t('contracts:templates.tooltips.view')}>
                      <IconButton size="small" onClick={() => { setCurrentTemplate(template); setViewDialog(true); }}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common:buttons.edit', 'Modifier')}>
                      <IconButton size="small" onClick={() => handleOpenDialog(template)} color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('common:buttons.delete', 'Supprimer')}>
                      <IconButton size="small" color="error" onClick={() => handleDeleteTemplate(template.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentTemplate ? t('contracts:templates.dialog.editTitle') : t('contracts:templates.dialog.newTitle')}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('contracts:templates.fields.name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth required>
              <InputLabel>{t('contracts:templates.fields.documentType')}</InputLabel>
              <Select
                value={formData.template_type}
                label={t('contracts:templates.fields.documentType')}
                onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
              >
                <MenuItem value="contract">{t('contracts:templates.types.contract')}</MenuItem>
                <MenuItem value="payment">{t('contracts:templates.types.payment')}</MenuItem>
                <MenuItem value="receipt">{t('contracts:templates.types.receipt')}</MenuItem>
                <MenuItem value="quote">{t('contracts:templates.types.quote')}</MenuItem>
                <MenuItem value="other">{t('contracts:templates.types.other')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={t('contracts:templates.fields.description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label={t('contracts:templates.fields.content')}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              fullWidth
              multiline
              rows={10}
              required
              helperText={t('contracts:templates.fields.contentHelper')}
            />
            <TextField
              label={t('contracts:templates.fields.aiInstructions')}
              value={formData.ai_prompt_instructions}
              onChange={(e) => setFormData({ ...formData, ai_prompt_instructions: e.target.value })}
              fullWidth
              multiline
              rows={3}
              helperText={t('contracts:templates.fields.aiInstructionsHelper')}
            />
            <FormControl fullWidth>
              <InputLabel>{t('contracts:templates.fields.status')}</InputLabel>
              <Select
                value={formData.is_active ? 'active' : 'inactive'}
                label={t('contracts:templates.fields.status')}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
              >
                <MenuItem value="active">{t('contracts:templates.active')}</MenuItem>
                <MenuItem value="inactive">{t('contracts:templates.inactive')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common:buttons.cancel', 'Annuler')}</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            {t('contracts:wizard.actions.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentTemplate?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="overline" color="textSecondary">{t('contracts:templates.view.content')}</Typography>
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, whiteSpace: 'pre-wrap', fontFamily: 'monospace', mb: 2 }}>
            {currentTemplate?.content}
          </Box>
          {currentTemplate?.ai_prompt_instructions && (
            <>
              <Typography variant="overline" color="textSecondary">{t('contracts:templates.view.aiInstructions')}</Typography>
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, whiteSpace: 'pre-wrap' }}>
                {currentTemplate?.ai_prompt_instructions}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>{t('common:buttons.close', 'Fermer')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ContractTemplatesTab;
