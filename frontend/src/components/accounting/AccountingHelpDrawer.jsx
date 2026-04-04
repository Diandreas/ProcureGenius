import React from 'react';
import {
  Drawer, Box, Typography, Divider, IconButton, Tab, Tabs,
  Alert, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, List, ListItem, ListItemText, Chip,
} from '@mui/material';
import { Close, Lightbulb } from '@mui/icons-material';
import { ACCOUNTING_HELP_CONTENT, ACCOUNTING_TERMS } from '../../constants/accountingHelp';

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

const AccountingHelpDrawer = ({ open, onClose, context = 'journal_entry' }) => {
  const [tab, setTab] = React.useState(0);
  const content = ACCOUNTING_HELP_CONTENT[context] || ACCOUNTING_HELP_CONTENT.journal_entry;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 380, p: 0 } }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: 'primary.main', color: 'white' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Lightbulb fontSize="small" />
          <Typography variant="subtitle1" fontWeight={700}>
            Aide comptabilité
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {/* Title */}
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {content.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {content.intro}
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Concepts" sx={{ fontSize: '0.75rem' }} />
        {content.examples?.length > 0 && <Tab label="Exemples" sx={{ fontSize: '0.75rem' }} />}
        <Tab label="Glossaire" sx={{ fontSize: '0.75rem' }} />
      </Tabs>

      <Box sx={{ overflowY: 'auto', flex: 1, px: 2, pb: 3 }}>
        {/* Concepts tab */}
        <TabPanel value={tab} index={0}>
          {content.concepts.map((c, i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                {c.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {c.text}
              </Typography>
              {i < content.concepts.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}

          {content.tips?.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Conseils pratiques
              </Typography>
              {content.tips.map((tip, i) => (
                <Alert key={i} severity="info" icon={false} sx={{ mb: 1, py: 0.5, fontSize: '0.75rem' }}>
                  {tip}
                </Alert>
              ))}
            </>
          )}
        </TabPanel>

        {/* Exemples tab */}
        {content.examples?.length > 0 && (
          <TabPanel value={tab} index={1}>
            {content.examples.map((ex, i) => (
              <Box key={i} sx={{ mb: 3 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" gutterBottom>
                  {ex.label}
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700 }}>Compte</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'primary.main' }}>Débit €</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'error.main' }}>Crédit €</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ex.lines.map((line, j) => (
                        <TableRow key={j}>
                          <TableCell sx={{ fontSize: '0.7rem' }}>{line.account}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.7rem', color: line.debit ? 'primary.main' : 'text.disabled' }}>
                            {line.debit || '—'}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.7rem', color: line.credit ? 'error.main' : 'text.disabled' }}>
                            {line.credit || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </TabPanel>
        )}

        {/* Glossaire tab — dernier tab */}
        <TabPanel value={tab} index={content.examples?.length > 0 ? 2 : 1}>
          <List dense disablePadding>
            {Object.entries(ACCOUNTING_TERMS).map(([key, definition]) => (
              <React.Fragment key={key}>
                <ListItem alignItems="flex-start" sx={{ px: 0, py: 1 }}>
                  <ListItemText
                    primary={
                      <Chip
                        label={key.replace(/_/g, ' ')}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mb: 0.5, fontSize: '0.7rem', textTransform: 'uppercase' }}
                      />
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                        {definition}
                      </Typography>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        </TabPanel>
      </Box>
    </Drawer>
  );
};

export default AccountingHelpDrawer;
