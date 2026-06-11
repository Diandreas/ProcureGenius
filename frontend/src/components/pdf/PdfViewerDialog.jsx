// Visionneuse PDF integree (s'affiche DANS l'app, sans sortir).
// Rendu via react-pdf (pdf.js). Boutons Telecharger + Partager :
//  - natif (Capacitor) : Filesystem + FileOpener / Share
//  - web : <a download> / nouvel onglet
//
// Usage : <PdfViewerDialog open={bool} blob={Blob} filename="x.pdf" onClose={fn} />

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import {
  Dialog, Box, IconButton, Typography, CircularProgress, Button, useMediaQuery,
} from '@mui/material';
import {
  Close, Download, Share as ShareIcon, NavigateBefore, NavigateNext,
} from '@mui/icons-material';
import { isNativePlatform, savePdfToDevice, sharePdf } from '../../services/pdfNative';

// Worker pdf.js.
// - Natif (Capacitor) : worker local du bundle (servi correctement par la
//   webview, fonctionne hors-ligne).
// - Web : worker depuis un CDN. Le worker local .mjs est servi par Nginx en
//   "application/octet-stream" -> rejete par le navigateur (MIME strict). Le
//   CDN le sert avec le bon type JS.
pdfjs.GlobalWorkerOptions.workerSrc = isNativePlatform()
  ? new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  : `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BG = '#1e222d';

export default function PdfViewerDialog({ open, blob, filename = 'document.pdf', title, onClose }) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const isSmall = useMediaQuery('(max-width:768px)');

  // URL objet pour le rendu (revoquee a la fermeture).
  const fileUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);
  useEffect(() => { if (open) setPage(1); }, [open]);

  const onLoad = useCallback(({ numPages }) => setNumPages(numPages), []);

  const handleDownload = async () => {
    if (!blob) return;
    setBusy(true);
    try {
      if (isNativePlatform()) {
        await savePdfToDevice(blob, filename);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally { setBusy(false); }
  };

  const handleShare = async () => {
    if (!blob) return;
    setBusy(true);
    try {
      if (isNativePlatform()) {
        await sharePdf(blob, filename, title || 'Document');
      } else if (navigator.share) {
        await navigator.share({ files: [new File([blob], filename, { type: 'application/pdf' })], title });
      } else {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch { /* annulation utilisateur : silencieux */ }
    finally { setBusy(false); }
  };

  // Largeur de page adaptee a l'ecran (max 800 sur grand ecran).
  const pageWidth = isSmall ? Math.min(window.innerWidth - 16, 720) : 800;

  return (
    <Dialog fullScreen open={open} onClose={onClose}
      PaperProps={{ sx: { bgcolor: BG } }}>
      {/* Barre du haut */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
        bgcolor: 'rgba(0,0,0,0.35)', color: '#fff',
        position: 'sticky', top: 0, zIndex: 2,
      }}>
        <IconButton onClick={onClose} sx={{ color: '#fff' }} aria-label="Fermer">
          <Close />
        </IconButton>
        <Typography sx={{ flex: 1, fontWeight: 600, fontSize: '0.95rem', noWrap: true,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title || filename}
        </Typography>
        <IconButton onClick={handleShare} disabled={busy} sx={{ color: '#fff' }} aria-label="Partager">
          <ShareIcon />
        </IconButton>
        <IconButton onClick={handleDownload} disabled={busy} sx={{ color: '#fff' }} aria-label="Telecharger">
          {busy ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <Download />}
        </IconButton>
      </Box>

      {/* Zone de rendu, defilable */}
      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column',
        alignItems: 'center', py: 2, gap: 2 }}>
        {fileUrl && (
          <Document
            file={fileUrl}
            onLoadSuccess={onLoad}
            loading={<CircularProgress sx={{ color: '#fff', mt: 6 }} />}
            error={<Typography sx={{ color: '#fff', mt: 6 }}>Impossible d'afficher le PDF.</Typography>}
          >
            <Page
              pageNumber={page}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={<CircularProgress sx={{ color: '#fff', mt: 6 }} />}
            />
          </Document>
        )}
      </Box>

      {/* Navigation pages (si plusieurs) */}
      {numPages > 1 && (
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
          py: 1, bgcolor: 'rgba(0,0,0,0.35)', color: '#fff',
          position: 'sticky', bottom: 0,
        }}>
          <IconButton disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            sx={{ color: '#fff' }}><NavigateBefore /></IconButton>
          <Typography sx={{ fontSize: '0.9rem' }}>{page} / {numPages}</Typography>
          <IconButton disabled={page >= numPages} onClick={() => setPage((p) => p + 1)}
            sx={{ color: '#fff' }}><NavigateNext /></IconButton>
        </Box>
      )}

      {/* Boutons bas (mobile-friendly) */}
      <Box sx={{ display: 'flex', gap: 1.5, p: 1.5, bgcolor: 'rgba(0,0,0,0.25)' }}>
        <Button fullWidth startIcon={<Download />} onClick={handleDownload} disabled={busy}
          variant="contained" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
          Telecharger
        </Button>
        <Button fullWidth startIcon={<ShareIcon />} onClick={handleShare} disabled={busy}
          variant="outlined" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700,
          color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
          Partager
        </Button>
      </Box>
    </Dialog>
  );
}
