import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, CardActions, Chip, CircularProgress,
  Grid, Tab, Tabs, TextField, Typography, useMediaQuery, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  IconButton, Tooltip, Alert
} from '@mui/material';
import {
  Download as DownloadIcon,
  Edit as EditIcon,
  Description as DocIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  Inventory as PackageIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import documentGeneratorAPI from '../../services/documentGeneratorAPI';
import BackButton from '../../components/navigation/BackButton';

const DOC_TYPES = [
  {
    type: 'price_list_public',
    label: 'Liste des tarifs (Public)',
    description: 'Tarifs publics des analyses de laboratoire, groupés par catégorie.',
    color: 'primary',
  },
  {
    type: 'price_list_subcontract',
    label: 'Liste des tarifs (Sous-traitance)',
    description: 'Tarifs préférentiels pour les partenaires et sous-traitants.',
    color: 'secondary',
  },
  {
    type: 'bilans_list',
    label: 'Liste des bilans',
    description: 'Catalogue des bilans et packs santé par catégorie (couples, maternité, séniors, général).',
    color: 'success',
  },
  {
    type: 'services_list',
    label: 'Liste des soins & services',
    description: 'Services médicaux proposés avec leurs tarifs (consultations, soins, chirurgie…).',
    color: 'info',
  },
  {
    type: 'full_catalog',
    label: 'Catalogue complet (24 pages)',
    description: 'Catalogue institutionnel complet avec tarifs, équipements et présentation.',
    color: 'warning',
  },
];

function DocumentCard({ config, onGenerate, onEdit, generating, job }) {
  const isRunning = generating === config.type;
  const isDone = job?.status === 'done';

  return (
    <Card sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PdfIcon color={config.color} />
            <Typography variant="subtitle1" fontWeight={700}>{config.label}</Typography>
          </Box>
          {isRunning && <Chip label="En cours…" size="small" color="warning" />}
          {isDone && <Chip label="Prêt" size="small" color="success" />}
        </Box>
        <Typography variant="body2" color="text.secondary">{config.description}</Typography>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0, gap: 0.5, flexWrap: 'wrap' }}>
        <Tooltip title="Paramètres du document">
          <IconButton size="small" onClick={() => onEdit(config.type)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {isDone && job.downloadUrl && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            href={job.downloadUrl}
            download
            color="success"
          >
            Télécharger
          </Button>
        )}
        <Button
          variant="contained"
          size="small"
          startIcon={isRunning ? <CircularProgress size={14} /> : <RefreshIcon />}
          onClick={() => onGenerate(config.type)}
          disabled={isRunning}
          color={config.color}
        >
          {isRunning ? 'En cours…' : isDone ? 'Regénérer' : 'Générer PDF'}
        </Button>
      </CardActions>
    </Card>
  );
}

function DocumentEditDialog({ open, docType, onClose, onSaved }) {
  const { enqueueSnackbar } = useSnackbar();
  const config = DOC_TYPES.find(d => d.type === docType);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', subtitle: '', revision_date: '', custom_fields: {} });

  useEffect(() => {
    if (!open || !docType) return;
    setLoading(true);
    documentGeneratorAPI.getDocuments({ document_type: docType })
      .then(data => {
        const results = Array.isArray(data) ? data : data.results || [];
        const existing = results.find(d => d.document_type === docType);
        if (existing) {
          setDoc(existing);
          setForm({
            title: existing.title || '',
            subtitle: existing.subtitle || '',
            revision_date: existing.revision_date || '',
            custom_fields: existing.custom_fields || {}
          });
        } else {
          setDoc(null);
          setForm({ title: config?.label || '', subtitle: '', revision_date: '', custom_fields: {} });
        }
      })
      .catch(() => enqueueSnackbar('Erreur de chargement', { variant: 'error' }))
      .finally(() => setLoading(false));
  }, [open, docType]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, document_type: docType };
      if (doc) {
        await documentGeneratorAPI.updateDocument(doc.id, payload);
      } else {
        await documentGeneratorAPI.createDocument(payload);
      }
      enqueueSnackbar('Document mis à jour', { variant: 'success' });
      onSaved();
      onClose();
    } catch {
      enqueueSnackbar('Erreur lors de l\'enregistrement', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Paramètres — {config?.label}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Titre du document"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              size="small" fullWidth
            />
            <TextField
              label="Sous-titre"
              value={form.subtitle}
              onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
              size="small" fullWidth
            />
            <TextField
              label="Date de révision"
              type="date"
              value={form.revision_date}
              onChange={e => setForm(f => ({ ...f, revision_date: e.target.value }))}
              size="small" fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <Alert severity="info" sx={{ mt: 1 }}>
              Les prix et données sont automatiquement récupérés depuis le catalogue labo et les packs santé.
            </Alert>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
          {saving ? <CircularProgress size={18} /> : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PackagesTab() {
  const { enqueueSnackbar } = useSnackbar();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [form, setForm] = useState({
    name: '', category: 'general', description: '',
    original_price: '', discounted_price: '', included_tests_text: '', display_order: 0
  });
  const [saving, setSaving] = useState(false);

  const CATEGORIES = [
    { value: 'couples', label: 'Couples & Bilan Prénuptial' },
    { value: 'maternity', label: 'Maternité & Suivi de Grossesse' },
    { value: 'seniority', label: 'Sénior & Bilan de Santé Général' },
    { value: 'general', label: 'Bilan Général' },
  ];

  const load = async () => {
    setLoading(true);
    try {
      const data = await documentGeneratorAPI.getPackages();
      setPackages(Array.isArray(data) ? data : data.results || []);
    } catch {
      enqueueSnackbar('Erreur de chargement des packs', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditPkg(null);
    setForm({ name: '', category: 'general', description: '', original_price: '', discounted_price: '', included_tests_text: '', display_order: 0 });
    setDialogOpen(true);
  };

  const openEdit = (pkg) => {
    setEditPkg(pkg);
    setForm({
      name: pkg.name || '',
      category: pkg.category || 'general',
      description: pkg.description || '',
      original_price: pkg.original_price || '',
      discounted_price: pkg.discounted_price || '',
      included_tests_text: pkg.included_tests_text || '',
      display_order: pkg.display_order || 0
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editPkg) {
        await documentGeneratorAPI.updatePackage(editPkg.id, form);
        enqueueSnackbar('Pack mis à jour', { variant: 'success' });
      } else {
        await documentGeneratorAPI.createPackage(form);
        enqueueSnackbar('Pack créé', { variant: 'success' });
      }
      setDialogOpen(false);
      load();
    } catch {
      enqueueSnackbar('Erreur lors de l\'enregistrement', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce pack ?')) return;
    try {
      await documentGeneratorAPI.deletePackage(id);
      enqueueSnackbar('Pack supprimé', { variant: 'success' });
      load();
    } catch {
      enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
    }
  };

  const grouped = packages.reduce((acc, pkg) => {
    const cat = CATEGORIES.find(c => c.value === pkg.category)?.label || pkg.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(pkg);
    return acc;
  }, {});

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<PackageIcon />} onClick={openCreate}>
          Nouveau pack
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : packages.length === 0 ? (
        <Alert severity="info">Aucun pack santé configuré. Créez-en un pour l'inclure dans le catalogue.</Alert>
      ) : (
        Object.entries(grouped).map(([cat, pkgs]) => (
          <Box key={cat} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, color: 'primary.main' }}>{cat}</Typography>
            <Grid container spacing={1.5}>
              {pkgs.map(pkg => (
                <Grid item xs={12} sm={6} md={4} key={pkg.id}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ pb: '8px !important' }}>
                      <Typography variant="subtitle2" fontWeight={700}>{pkg.name}</Typography>
                      {pkg.discounted_price && (
                        <Typography variant="body2" color="success.main" fontWeight={600}>
                          {parseFloat(pkg.discounted_price).toLocaleString('fr-FR')} FCFA
                          {pkg.original_price && (
                            <Typography component="span" variant="body2" color="text.disabled" sx={{ ml: 1, textDecoration: 'line-through' }}>
                              {parseFloat(pkg.original_price).toLocaleString('fr-FR')}
                            </Typography>
                          )}
                        </Typography>
                      )}
                      {pkg.included_tests_text && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.75rem' }} noWrap>
                          {pkg.included_tests_text}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
                      <Button size="small" onClick={() => openEdit(pkg)}>Modifier</Button>
                      <Button size="small" color="error" onClick={() => handleDelete(pkg.id)}>Supprimer</Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editPkg ? 'Modifier le pack' : 'Nouveau pack santé'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Nom du pack *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} size="small" fullWidth />
            <TextField
              label="Catégorie" value={form.category} size="small" fullWidth
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              select
              SelectProps={{ native: true }}
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </TextField>
            <TextField label="Prix original (FCFA)" type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} size="small" fullWidth />
            <TextField label="Prix remisé (FCFA) *" type="number" value={form.discounted_price} onChange={e => setForm(f => ({ ...f, discounted_price: e.target.value }))} size="small" fullWidth />
            <TextField label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} multiline rows={2} size="small" fullWidth />
            <TextField label="Analyses incluses (texte libre)" value={form.included_tests_text} onChange={e => setForm(f => ({ ...f, included_tests_text: e.target.value }))} multiline rows={3} size="small" fullWidth helperText="Ex: NFS, Glycémie, Créatinine, TPHA/VDRL..." />
            <TextField label="Ordre d'affichage" type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} size="small" fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function DocumentManager() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [generating, setGenerating] = useState(null);
  const [editDialogType, setEditDialogType] = useState(null);
  // {docType: {jobId, status, downloadUrl}}
  const [jobs, setJobs] = useState({});

  const handleGenerate = async (docType) => {
    if (generating === docType) return;
    setGenerating(docType);
    const snackKey = enqueueSnackbar('Génération PDF en cours… vous pouvez continuer à naviguer.', {
      variant: 'info', persist: true,
    });

    try {
      const { job_id } = await documentGeneratorAPI.startPDFJob(docType);
      setJobs(j => ({ ...j, [docType]: { jobId: job_id, status: 'pending' } }));

      // Poll every 2 seconds until done or error
      const poll = setInterval(async () => {
        try {
          const result = await documentGeneratorAPI.getPDFJobStatus(job_id);
          if (result.status === 'done') {
            clearInterval(poll);
            setGenerating(null);
            closeSnackbar(snackKey);
            setJobs(j => ({ ...j, [docType]: { jobId: job_id, status: 'done', downloadUrl: result.download_url } }));
            const config = DOC_TYPES.find(d => d.type === docType);
            // Auto-download
            const a = document.createElement('a');
            a.href = result.download_url;
            a.download = `${config?.label || docType}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            enqueueSnackbar('PDF prêt — téléchargement démarré !', { variant: 'success' });
          } else if (result.status === 'error') {
            clearInterval(poll);
            setGenerating(null);
            closeSnackbar(snackKey);
            enqueueSnackbar(`Erreur PDF : ${result.error || 'Erreur inconnue'}`, { variant: 'error' });
          }
        } catch {
          clearInterval(poll);
          setGenerating(null);
          closeSnackbar(snackKey);
          enqueueSnackbar('Impossible de vérifier le statut du PDF.', { variant: 'error' });
        }
      }, 2000);

      // Safety timeout after 3 minutes
      setTimeout(() => {
        clearInterval(poll);
        if (generating === docType) {
          setGenerating(null);
          closeSnackbar(snackKey);
          enqueueSnackbar('La génération PDF a pris trop longtemps.', { variant: 'warning' });
        }
      }, 180000);

    } catch {
      setGenerating(null);
      closeSnackbar(snackKey);
      enqueueSnackbar('Erreur lors du lancement de la génération PDF', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      <BackButton />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <DocIcon color="primary" fontSize="large" />
        <Box>
          <Typography variant="h5" fontWeight={700}>Générateur de documents</Typography>
          <Typography variant="body2" color="text.secondary">
            Générez les documents officiels du centre de santé au format PDF
          </Typography>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Documents PDF" icon={<PdfIcon />} iconPosition="start" />
        <Tab label="Packs santé" icon={<PackageIcon />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={2.5}>
          {DOC_TYPES.map(config => (
            <Grid item xs={12} sm={6} key={config.type}>
              <DocumentCard
                config={config}
                onGenerate={handleGenerate}
                onEdit={(type) => setEditDialogType(type)}
                generating={generating}
                job={jobs[config.type]}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {tab === 1 && <PackagesTab />}

      <DocumentEditDialog
        open={Boolean(editDialogType)}
        docType={editDialogType}
        onClose={() => setEditDialogType(null)}
        onSaved={() => {}}
      />
    </Box>
  );
}
