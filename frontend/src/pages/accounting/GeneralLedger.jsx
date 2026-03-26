import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Select, MenuItem, FormControl, InputLabel,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, Chip, CircularProgress, Alert, Button, Accordion,
  AccordionSummary, AccordionDetails, useMediaQuery, useTheme,
  Stack, Divider, IconButton,
} from '@mui/material';
import { ExpandMore, FilterList } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import accountingAPI from '../../services/accountingAPI';
import { formatDate } from '../../utils/formatters';
import useCurrency from '../../hooks/useCurrency';
import AccountingNav from './AccountingNav';

export default function GeneralLedger() {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const [start, setStart] = useState(firstDay);
  const [end, setEnd] = useState(today);
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { format } = useCurrency();

  useEffect(() => {
    accountingAPI.getAccounts({ active: 'true' }).then((r) => setAccounts(r.data));
    load();
  }, []);

  const load = () => {
    setLoading(true);
    const params = { start_date: start, end_date: end };
    if (accountId) params.account_id = accountId;
    accountingAPI.getGeneralLedger(params)
      .then((r) => { setData(r.data); setError(null); })
      .catch(() => setError('Erreur chargement du grand livre'))
      .finally(() => setLoading(false));
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showFilters, setShowFilters] = useState(false);

  return (
    <Box p={isMobile ? 1.5 : 3} sx={{ pb: isMobile ? 10 : 3 }}>
      <AccountingNav title="Grand Livre" subtitle={isMobile ? "" : "Mouvements détaillés par compte"} />

      {/* Mobile Filters Header */}
      {isMobile && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" fontWeight={700}>Filtres</Typography>
          <IconButton 
            size="small" 
            onClick={() => setShowFilters(!showFilters)}
            sx={{ 
              bgcolor: showFilters ? 'primary.main' : 'transparent',
              color: showFilters ? 'white' : 'inherit'
            }}
          >
            <FilterList fontSize="small" />
          </IconButton>
        </Box>
      )}

      {(showFilters || !isMobile) && (
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 2, 
            mb: 3, 
            flexDirection: isMobile ? 'column' : 'row',
            p: isMobile ? 2 : 0,
            bgcolor: isMobile ? 'background.paper' : 'transparent',
            borderRadius: isMobile ? 2 : 0,
            boxShadow: isMobile ? 1 : 0
          }}
        >
          <TextField size="small" type="date" label="Du" InputLabelProps={{ shrink: true }}
            value={start} onChange={(e) => setStart(e.target.value)} fullWidth={isMobile} />
          <TextField size="small" type="date" label="Au" InputLabelProps={{ shrink: true }}
            value={end} onChange={(e) => setEnd(e.target.value)} fullWidth={isMobile} />
          <FormControl size="small" sx={{ minWidth: isMobile ? '100%' : 260 }}>
            <InputLabel>Compte (optionnel)</InputLabel>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} label="Compte (optionnel)">
              <MenuItem value="">Tous les comptes</MenuItem>
              {accounts.map((a) => <MenuItem key={a.id} value={a.id}>{a.code} — {a.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={load} disabled={loading} fullWidth={isMobile}>
            {loading ? <CircularProgress size={20} /> : 'Actualiser'}
          </Button>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {data && data.accounts.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>Aucun mouvement pour la période sélectionnée.</Alert>
      )}

      {data && data.accounts.map((acc) => (
        <Accordion 
          key={acc.account_id} 
          defaultExpanded={data.accounts.length === 1}
          elevation={0} 
          sx={{ 
            border: '1px solid', 
            borderColor: 'divider', 
            mb: 1.5, 
            borderRadius: '12px !important',
            overflow: 'hidden',
            '&:before': { display: 'none' } 
          }}
        >
          <AccordionSummary 
            expandIcon={<ExpandMore />}
            sx={{ 
              px: isMobile ? 1.5 : 2,
              '& .MuiAccordionSummary-content': { m: 0 }
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', width: '100%', gap: isMobile ? 1 : 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography fontFamily="monospace" fontWeight={700} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), px: 0.8, py: 0.2, borderRadius: 1, fontSize: '0.9rem' }}>
                  {acc.code}
                </Typography>
                <Typography fontWeight={600} noWrap sx={{ maxWidth: isMobile ? 180 : 'none' }}>
                  {acc.name}
                </Typography>
              </Box>
              
              <Box sx={{ 
                ml: isMobile ? 0 : 'auto', 
                display: 'flex', 
                gap: isMobile ? 1 : 3, 
                justifyContent: isMobile ? 'space-between' : 'flex-end',
                width: isMobile ? '100%' : 'auto',
                borderTop: isMobile ? `1px solid ${theme.palette.divider}` : 'none',
                pt: isMobile ? 1 : 0
              }}>
                <Box textAlign={isMobile ? "left" : "right"}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>Débit</Typography>
                  <Typography variant="body2" color="primary.main" fontWeight={700}>{format(parseFloat(acc.total_debit))}</Typography>
                </Box>
                <Box textAlign={isMobile ? "left" : "right"}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>Crédit</Typography>
                  <Typography variant="body2" color="secondary.main" fontWeight={700}>{format(parseFloat(acc.total_credit))}</Typography>
                </Box>
                <Box textAlign={isMobile ? "right" : "right"}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>Solde</Typography>
                  <Typography variant="body2" fontWeight={800}
                    color={parseFloat(acc.solde) >= 0 ? 'success.main' : 'error.main'}>
                    {parseFloat(acc.solde) >= 0 ? '+' : ''}{format(parseFloat(acc.solde))}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {isMobile ? (
              <Box sx={{ p: 1.5 }}>
                {acc.movements.map((mv, i) => (
                  <Box 
                    key={i} 
                    sx={{ 
                      p: 1.5, 
                      mb: 1, 
                      borderRadius: 2, 
                      bgcolor: i % 2 === 0 ? alpha(theme.palette.action.hover, 0.5) : 'transparent',
                      border: `1px solid ${theme.palette.divider}`
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" fontWeight={700}>{formatDate(mv.date)}</Typography>
                      <Typography variant="caption" fontFamily="monospace" color="text.secondary">{mv.entry_number}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>{mv.description}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                      <Chip label={mv.journal} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                      <Box sx={{ textAlign: 'right' }}>
                        {parseFloat(mv.debit) > 0 ? (
                          <Typography variant="body2" color="primary.main" fontWeight={700}>{format(parseFloat(mv.debit))}</Typography>
                        ) : (
                          <Typography variant="body2" color="secondary.main" fontWeight={700}>{format(parseFloat(mv.credit))}</Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>N° écriture</strong></TableCell>
                      <TableCell><strong>Journal</strong></TableCell>
                      <TableCell><strong>Libellé</strong></TableCell>
                      <TableCell><strong>Référence</strong></TableCell>
                      <TableCell align="right"><strong>Débit</strong></TableCell>
                      <TableCell align="right"><strong>Crédit</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {acc.movements.map((mv, i) => (
                      <TableRow key={i} hover>
                        <TableCell>{formatDate(mv.date)}</TableCell>
                        <TableCell><Typography variant="body2" fontFamily="monospace">{mv.entry_number}</Typography></TableCell>
                        <TableCell><Chip label={mv.journal} size="small" variant="outlined" /></TableCell>
                        <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{mv.description}</Typography></TableCell>
                        <TableCell>{mv.reference || '—'}</TableCell>
                        <TableCell align="right">{parseFloat(mv.debit) > 0 ? format(parseFloat(mv.debit)) : '—'}</TableCell>
                        <TableCell align="right">{parseFloat(mv.credit) > 0 ? format(parseFloat(mv.credit)) : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
