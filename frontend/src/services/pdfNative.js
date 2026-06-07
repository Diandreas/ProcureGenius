// Helpers PDF pour l'app mobile native (Capacitor).
// Centralise : conversion blob->base64, telechargement REEL dans Documents,
// ouverture dans le lecteur natif, et partage. Reutilise par pdfService.js,
// pdfReportService.js et la visionneuse PdfViewerDialog.

import { isNativePlatform } from '../utils/platform';

export const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const ensurePdfName = (name = 'document') =>
  name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;

// Telecharge reellement le PDF dans le dossier Documents du telephone,
// puis l'ouvre dans le lecteur PDF natif (qui propose Imprimer/Partager).
export const savePdfToDevice = async (blob, filename = 'document.pdf') => {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { FileOpener } = await import('@capacitor-community/file-opener');
  const base64 = await blobToBase64(blob);
  const safeName = ensurePdfName(filename);
  const written = await Filesystem.writeFile({
    path: safeName,
    data: base64,
    directory: Directory.Documents,
    recursive: true,
  });
  await FileOpener.open({ filePath: written.uri, contentType: 'application/pdf' });
  return written.uri;
};

// Ouvre le PDF dans le lecteur natif (sans le "telecharger" definitivement :
// ecrit en cache). Utile pour une simple preview externe.
export const openPdfNatively = async (blob, filename = 'document.pdf') => {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { FileOpener } = await import('@capacitor-community/file-opener');
  const base64 = await blobToBase64(blob);
  const written = await Filesystem.writeFile({
    path: ensurePdfName(filename),
    data: base64,
    directory: Directory.Cache,
  });
  await FileOpener.open({ filePath: written.uri, contentType: 'application/pdf' });
  return written.uri;
};

// Partage le PDF via la feuille de partage native (mail, WhatsApp, Drive...).
export const sharePdf = async (blob, filename = 'document.pdf', title = 'Document') => {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const base64 = await blobToBase64(blob);
  const written = await Filesystem.writeFile({
    path: ensurePdfName(filename),
    data: base64,
    directory: Directory.Cache,
  });
  await Share.share({ title, url: written.uri, dialogTitle: title });
};

export { isNativePlatform };
