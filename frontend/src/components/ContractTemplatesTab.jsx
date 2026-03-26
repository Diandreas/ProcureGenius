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

function ContractTemplatesTab() {
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
      enqueueSnackbar('Erreur lors du chargement des modèles', { variant: 'error' });
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
      enqueueSnackbar('Le nom et le contenu sont requis', { variant: 'error' });
      return;
      }

      try {
      if (currentTemplate) {
        await contractsAPI.templates.update(currentTemplate.id, formData);
        enqueueSnackbar('Modèle mis à jour avec succès', { variant: 'success' });
      } else {
        await contractsAPI.templates.create(formData);
        enqueueSnackbar('Modèle créé avec succès', { variant: 'success' });
      }
      handleCloseDialog();
      fetchTemplates();
      } catch (err) {
      console.error('Error saving template:', err);
      enqueueSnackbar('Erreur lors de la sauvegarde du modèle', { variant: 'error' });
      }
      };

      const handleDeleteTemplate = async (id) => {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
      try {
        await contractsAPI.templates.delete(id);
        enqueueSnackbar('Modèle supprimé avec succès', { variant: 'success' });
        fetchTemplates();
      } catch (err) {
        console.error('Error deleting template:', err);
        enqueueSnackbar('Erreur lors de la suppression du modèle', { variant: 'error' });
      }
      }
      };

  const getTemplateTypeLabel = (type) => {
    const types = {
      contract: 'Contrat standard',
      payment: 'Contrat de paiement',
      receipt: 'Reçu de paiement',
      quote: 'Devis',
      other: 'Autre',
    };
    return types[type] || type;
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
          Nouveau Modèle
        </Button>
      </Box>

      {templates.length === 0 ? (
        <EmptyState
          title="Aucun modèle de contrat"
          description="Vous n'avez pas encore créé de modèle de contrat, de paiement ou de devis."
          actionLabel="Créer un modèle"
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
                      label={template.is_active ? 'Actif' : 'Inactif'}
                      size="small"
                      color={template.is_active ? 'success' : 'default'}
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {template.description || 'Aucune description'}
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
                      <IconButton size="small" color="error" onClick={() => handleDelete(template.id)}>
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
                <TableCell>Nom du modèle</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
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
                      label={template.is_active ? 'Actif' : 'Inactif'}
                      size="small"
                      color={template.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Aperçu / Voir">
                      <IconButton size="small" onClick={() => { setCurrentTemplate(template); setViewDialog(true); }}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Modifier">
                      <IconButton size="small" onClick={() => handleOpenDialog(template)} color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton size="small" color="error" onClick={() => handleDelete(template.id)}>
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
          {currentTemplate ? 'Modifier le modèle' : 'Nouveau modèle'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nom du modèle"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth required>
              <InputLabel>Type de document</InputLabel>
              <Select
                value={formData.template_type}
                label="Type de document"
                onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
              >
                <MenuItem value="contract">Contrat standard</MenuItem>
                <MenuItem value="payment">Contrat de paiement</MenuItem>
                <MenuItem value="receipt">Reçu de paiement</MenuItem>
                <MenuItem value="quote">Devis</MenuItem>
                <MenuItem value="other">Autre</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Contenu du modèle (HTML/Markdown)"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              fullWidth
              multiline
              rows={10}
              required
              helperText="Insérez le texte du modèle"
            />
            <TextField
              label="Instructions pour l'IA (Optionnel)"
              value={formData.ai_prompt_instructions}
              onChange={(e) => setFormData({ ...formData, ai_prompt_instructions: e.target.value })}
              fullWidth
              multiline
              rows={3}
              helperText="Ex: 'Utilise le prénom et le nom du fournisseur pour générer la signature finale.'"
            />
            <FormControl fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select
                value={formData.is_active ? 'active' : 'inactive'}
                label="Statut"
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
              >
                <MenuItem value="active">Actif</MenuItem>
                <MenuItem value="inactive">Inactif</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentTemplate?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="overline" color="textSecondary">Contenu du modèle :</Typography>
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, whiteSpace: 'pre-wrap', fontFamily: 'monospace', mb: 2 }}>
            {currentTemplate?.content}
          </Box>
          {currentTemplate?.ai_prompt_instructions && (
            <>
              <Typography variant="overline" color="textSecondary">Instructions IA :</Typography>
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, whiteSpace: 'pre-wrap' }}>
                {currentTemplate?.ai_prompt_instructions}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ContractTemplatesTab;
