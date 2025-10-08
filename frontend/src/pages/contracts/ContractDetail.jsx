import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  CheckCircle,
  PlayArrow,
  Stop,
  Autorenew,
  Psychology,
  ExpandMore,
  VerifiedUser,
  Warning,
  Info,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchContract,
  approveContract,
  activateContract,
  terminateContract,
  extractClauses,
  verifyClause,
} from '../../store/slices/contractsSlice';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function ContractDetail() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();

  const { currentContract, loading, extractionResult } = useSelector((state) => state.contracts);

  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [contractText, setContractText] = useState('');
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    dispatch(fetchContract(id));
  }, [id, dispatch]);

  const handleApprove = async () => {
    try {
      await dispatch(approveContract({ id, notes: '' })).unwrap();
      enqueueSnackbar('Contrat approuvé avec succès', { variant: 'success' });
      dispatch(fetchContract(id));
    } catch (error) {
      enqueueSnackbar("Erreur lors de l'approbation", { variant: 'error' });
    }
  };

  const handleActivate = async () => {
    try {
      await dispatch(activateContract(id)).unwrap();
      enqueueSnackbar('Contrat activé avec succès', { variant: 'success' });
      dispatch(fetchContract(id));
    } catch (error) {
      enqueueSnackbar("Erreur lors de l'activation", { variant: 'error' });
    }
  };

  const handleTerminate = async () => {
    try {
      await dispatch(terminateContract(id)).unwrap();
      enqueueSnackbar('Contrat résilié avec succès', { variant: 'success' });
      dispatch(fetchContract(id));
    } catch (error) {
      enqueueSnackbar('Erreur lors de la résiliation', { variant: 'error' });
    }
  };

  const handleExtractClauses = async () => {
    if (!contractText.trim()) {
      enqueueSnackbar('Veuillez saisir le texte du contrat', { variant: 'warning' });
      return;
    }

    setExtracting(true);
    try {
      await dispatch(extractClauses({ id, contractText, language: 'fr' })).unwrap();
      enqueueSnackbar('Clauses extraites avec succès par l\'IA', { variant: 'success' });
      setExtractDialogOpen(false);
      setContractText('');
      dispatch(fetchContract(id));
    } catch (error) {
      enqueueSnackbar('Erreur lors de l\'extraction des clauses', { variant: 'error' });
    } finally {
      setExtracting(false);
    }
  };

  const handleVerifyClause = async (clauseId) => {
    try {
      await dispatch(verifyClause(clauseId)).unwrap();
      enqueueSnackbar('Clause vérifiée', { variant: 'success' });
      dispatch(fetchContract(id));
    } catch (error) {
      enqueueSnackbar('Erreur lors de la vérification', { variant: 'error' });
    }
  };

  const getRiskChip = (riskLevel) => {
    const riskConfig = {
      low: { label: 'Risque faible', color: 'success', icon: <Info /> },
      medium: { label: 'Risque moyen', color: 'warning', icon: <Warning /> },
      high: { label: 'Risque élevé', color: 'error', icon: <Warning /> },
      critical: { label: 'Risque critique', color: 'error', icon: <ErrorIcon /> },
    };

    const config = riskConfig[riskLevel] || { label: 'Non évalué', color: 'default' };
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        icon={config.icon}
      />
    );
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      draft: { label: 'Brouillon', color: 'default' },
      pending_review: { label: 'En révision', color: 'info' },
      pending_approval: { label: 'En attente', color: 'warning' },
      approved: { label: 'Approuvé', color: 'success' },
      active: { label: 'Actif', color: 'primary' },
      expiring_soon: { label: 'Expire bientôt', color: 'warning' },
      expired: { label: 'Expiré', color: 'error' },
      terminated: { label: 'Résilié', color: 'error' },
      renewed: { label: 'Renouvelé', color: 'default' },
    };

    const config = statusConfig[status] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color} />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  if (loading || !currentContract) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/contracts')}
        sx={{ mb: 2 }}
      >
        Retour à la liste
      </Button>

      <Grid container spacing={3}>
        {/* En-tête */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Box>
                  <Typography variant="h5" component="h1" gutterBottom>
                    {currentContract.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentContract.contract_number} • {currentContract.supplier_name}
                  </Typography>
                </Box>
                <Box>{getStatusChip(currentContract.status)}</Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {currentContract.status === 'draft' && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => navigate(`/contracts/${id}/edit`)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<CheckCircle />}
                      onClick={handleApprove}
                    >
                      Approuver
                    </Button>
                  </>
                )}

                {currentContract.status === 'approved' && (
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={handleActivate}
                  >
                    Activer
                  </Button>
                )}

                {currentContract.status === 'active' && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<Autorenew />}
                      onClick={() => navigate(`/contracts/${id}/renew`)}
                    >
                      Renouveler
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Stop />}
                      onClick={handleTerminate}
                    >
                      Résilier
                    </Button>
                  </>
                )}

                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<Psychology />}
                  onClick={() => setExtractDialogOpen(true)}
                >
                  Extraire les clauses (IA)
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Informations générales */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Typography variant="body1" paragraph>
                {currentContract.description}
              </Typography>

              {currentContract.terms_and_conditions && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Termes et conditions
                  </Typography>
                  <Typography variant="body1" paragraph style={{ whiteSpace: 'pre-line' }}>
                    {currentContract.terms_and_conditions}
                  </Typography>
                </>
              )}

              {currentContract.payment_terms && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Conditions de paiement
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {currentContract.payment_terms}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Informations clés */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informations clés
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Type de contrat
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {currentContract.contract_type === 'purchase' ? 'Achat' :
                   currentContract.contract_type === 'service' ? 'Service' :
                   currentContract.contract_type}
                </Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Date de début
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(currentContract.start_date)}
                </Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Date de fin
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(currentContract.end_date)}
                </Typography>
              </Box>

              {currentContract.days_until_expiry !== null && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Jours avant expiration
                  </Typography>
                  <Typography
                    variant="h5"
                    color={currentContract.days_until_expiry < 30 ? 'error' : 'primary'}
                  >
                    {currentContract.days_until_expiry}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Valeur totale
                </Typography>
                <Typography variant="h5" color="primary">
                  {parseFloat(currentContract.total_value).toLocaleString()} {currentContract.currency}
                </Typography>
              </Box>

              {currentContract.auto_renewal && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Renouvellement automatique
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Clauses extraites par IA */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Clauses ({currentContract.clauses?.length || 0})
                </Typography>
                {currentContract.clauses?.some(c => c.extracted_by_ai) && (
                  <Chip
                    icon={<Psychology />}
                    label="Extraction IA"
                    color="secondary"
                    size="small"
                  />
                )}
              </Box>

              {currentContract.clauses?.length === 0 ? (
                <Alert severity="info">
                  Aucune clause extraite. Utilisez le bouton "Extraire les clauses (IA)" pour analyser le contrat.
                </Alert>
              ) : (
                currentContract.clauses?.map((clause, index) => (
                  <Accordion key={clause.id}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Typography sx={{ flexGrow: 1 }}>
                          {clause.title}
                          {clause.section_reference && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              ({clause.section_reference})
                            </Typography>
                          )}
                        </Typography>
                        {clause.risk_level && getRiskChip(clause.risk_level)}
                        {clause.verified && (
                          <Chip icon={<VerifiedUser />} label="Vérifié" color="success" size="small" />
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box>
                        <Typography variant="body2" paragraph>
                          {clause.content}
                        </Typography>

                        {clause.ai_analysis && (
                          <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Analyse IA:
                            </Typography>
                            <Typography variant="body2">{clause.ai_analysis}</Typography>
                          </Alert>
                        )}

                        {clause.ai_recommendations && (
                          <Alert severity="warning" sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Recommandations:
                            </Typography>
                            <Typography variant="body2">{clause.ai_recommendations}</Typography>
                          </Alert>
                        )}

                        {clause.ai_confidence_score && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              Confiance IA: {clause.ai_confidence_score}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={clause.ai_confidence_score}
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        )}

                        {!clause.verified && (
                          <Box sx={{ mt: 2 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VerifiedUser />}
                              onClick={() => handleVerifyClause(clause.id)}
                            >
                              Vérifier cette clause
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Jalons */}
        {currentContract.milestones?.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Jalons ({currentContract.milestones.length})
                </Typography>

                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Titre</TableCell>
                        <TableCell>Date d'échéance</TableCell>
                        <TableCell>Montant</TableCell>
                        <TableCell>Statut</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentContract.milestones.map((milestone) => (
                        <TableRow key={milestone.id}>
                          <TableCell>{milestone.title}</TableCell>
                          <TableCell>{formatDate(milestone.due_date)}</TableCell>
                          <TableCell>
                            {milestone.payment_amount
                              ? `${parseFloat(milestone.payment_amount).toLocaleString()} $`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                milestone.status === 'pending' ? 'En attente' :
                                milestone.status === 'completed' ? 'Complété' :
                                milestone.status === 'delayed' ? 'Retardé' :
                                'Annulé'
                              }
                              size="small"
                              color={
                                milestone.status === 'completed' ? 'success' :
                                milestone.status === 'delayed' ? 'error' :
                                'default'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Dialog extraction IA */}
      <Dialog
        open={extractDialogOpen}
        onClose={() => !extracting && setExtractDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Psychology color="secondary" />
            Extraction de clauses par IA Mistral
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Collez le texte complet du contrat ci-dessous. L'IA Mistral va analyser et extraire automatiquement
            toutes les clauses importantes avec une évaluation des risques.
          </Alert>

          <TextField
            fullWidth
            multiline
            rows={12}
            label="Texte du contrat"
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            disabled={extracting}
            placeholder="Collez ici le texte complet du contrat..."
          />

          {extracting && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Extraction en cours... Cela peut prendre quelques secondes.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtractDialogOpen(false)} disabled={extracting}>
            Annuler
          </Button>
          <Button
            onClick={handleExtractClauses}
            variant="contained"
            color="secondary"
            disabled={extracting || !contractText.trim()}
            startIcon={<Psychology />}
          >
            {extracting ? 'Extraction...' : 'Extraire les clauses'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ContractDetail;
