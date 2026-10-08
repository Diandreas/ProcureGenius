import crmAPI from '../../services/crmAPI';

// Listes courtes lues par plusieurs écrans à la fois (motifs, campagnes actives) :
// une seule requête partagée, remise à zéro après un réglage.
let motifs = null;
let campagnes = null;

export const chargerMotifs = () => {
  if (!motifs) motifs = crmAPI.listReasons().catch((e) => { motifs = null; throw e; });
  return motifs;
};

export const chargerCampagnesActives = () => {
  if (!campagnes) {
    campagnes = crmAPI.listCampaigns({ active: 1 }).then((d) => d.results || [])
      .catch((e) => { campagnes = null; throw e; });
  }
  return campagnes;
};

export const viderCacheCrm = () => { motifs = null; campagnes = null; };

export const CANAUX = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Appel' },
  { value: 'visit', label: 'Visite' },
  { value: 'other', label: 'Autre' },
];

export const ISSUES = [
  { value: 'agreed', label: "D'accord pour venir", color: 'success' },
  { value: 'sent', label: 'Contacté, en attente', color: 'default' },
  { value: 'callback', label: 'À rappeler', color: 'warning' },
  { value: 'no_answer', label: 'Pas de réponse', color: 'default' },
  { value: 'declined', label: 'Pas intéressé', color: 'error' },
];

export const libelleIssue = (code) => (ISSUES.find((i) => i.value === code) || {}).label || code;

// Ce qu'est devenue une relance : venu / attendu / pas venu / rien d'attendu.
export const ETATS = {
  came: { label: 'Venu', color: 'success' },
  waiting: { label: 'Attendu', color: 'info' },
  missed: { label: 'Pas venu', color: 'warning' },
  none: { label: '', color: 'default' },
};

// Date locale AAAA-MM-JJ dans n jours (sans décalage de fuseau).
export const dansJours = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const RACCOURCIS_DATE = [
  { label: 'Demain', jours: 1 },
  { label: 'Dans 3 jours', jours: 3 },
  { label: 'Dans 1 semaine', jours: 7 },
  { label: 'Dans 1 mois', jours: 30 },
];

export const jourCourt = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  } catch (e) {
    return '';
  }
};

export const ilYa = (jours) => {
  if (jours === null || jours === undefined) return '';
  if (jours < 1) return "aujourd'hui";
  if (jours === 1) return 'hier';
  if (jours < 60) return `il y a ${jours} j`;
  return `il y a ${Math.round(jours / 30)} mois`;
};
