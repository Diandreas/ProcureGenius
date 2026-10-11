// Facture préparée dans la démo IA de la page d'accueil, gardée sur l'appareil
// pour être retrouvée dans le compte du visiteur après son inscription.

const KEY = 'procura_demo_invoice';
const DUREE_MS = 14 * 24 * 60 * 60 * 1000; // 14 jours

export function saveDemoInvoice(invoice) {
  if (!invoice) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ invoice, saved_at: Date.now() }));
  } catch { /* stockage bloqué : la démo continue sans */ }
}

export function loadDemoInvoice() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { invoice, saved_at: savedAt } = JSON.parse(raw);
    if (!invoice || Date.now() - (savedAt || 0) > DUREE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return invoice;
  } catch {
    return null;
  }
}

export function clearDemoInvoice() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
