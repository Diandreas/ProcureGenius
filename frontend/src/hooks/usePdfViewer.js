// Hook reutilisable pour la previsualisation PDF dans l'app.
// Fournit l'etat du dialog + une fonction `preview(blob, filename, title)`
// et `download(blob, filename)`. A coupler avec <PdfViewerDialog {...viewer.dialogProps} />.

import { useState, useCallback } from 'react';
import { isNativePlatform, savePdfToDevice } from '../services/pdfNative';

export default function usePdfViewer() {
  const [open, setOpen] = useState(false);
  const [blob, setBlob] = useState(null);
  const [filename, setFilename] = useState('document.pdf');
  const [title, setTitle] = useState('');

  // Ouvre la visionneuse integree.
  const preview = useCallback((b, name = 'document.pdf', t = '') => {
    setBlob(b); setFilename(name); setTitle(t || name); setOpen(true);
  }, []);

  // Telechargement direct (sans ouvrir la visionneuse).
  const download = useCallback(async (b, name = 'document.pdf') => {
    if (isNativePlatform()) {
      await savePdfToDevice(b, name);
    } else {
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return {
    preview,
    download,
    dialogProps: { open, blob, filename, title, onClose: close },
  };
}
