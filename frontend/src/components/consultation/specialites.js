// Configuration de la consultation par spécialité : motifs et diagnostics fréquents (pastilles),
// examens proposés (codes réels du catalogue labo / imagerie). Une pastille écrit une ligne dans le champ
// texte ; le texte reste toujours modifiable.
//
// Les suggestions tiennent compte du SEXE et de l'ÂGE du patient : chaque entrée peut porter
//   sexe: 'F' | 'M'      (absent = pour tous)       ageMin / ageMax : âge en années, bornes incluses
// Si le sexe ou l'âge ne sont pas connus, rien n'est masqué.

export const SPECIALITES = [
    { code: 'general', libelle: 'Médecine générale', cle: null },
    { code: 'gynecology', libelle: 'Gynécologie', cle: 'gyneco', sexe: 'F' },
    { code: 'cardiology', libelle: 'Cardiologie', cle: 'cardio' },
    { code: 'aesthetic', libelle: 'Médecine esthétique', cle: 'esthetique' },
    { code: 'pediatrics', libelle: 'Pédiatrie', cle: 'pediatrie' },
];

// une entrée (chaîne ou objet) convient-elle à ce patient ?
export const convient = (x, sexe, ageAns) => {
    if (typeof x === 'string') return true;
    if (x.sexe && sexe && x.sexe !== sexe) return false;
    if (ageAns !== null && ageAns !== undefined) {
        if (x.ageMin !== undefined && ageAns < x.ageMin) return false;
        if (x.ageMax !== undefined && ageAns > x.ageMax) return false;
    }
    return true;
};

export const specialitesPour = (sexe) => SPECIALITES.filter(s => convient(s, sexe, null));

const F = (t, extra = {}) => ({ t, sexe: 'F', ageMin: 12, ...extra });
const M = (t, extra = {}) => ({ t, sexe: 'M', ageMin: 12, ...extra });

export const MOTIFS = {
    general: [
        'Fièvre', 'Céphalées', 'Vomissements', 'Diarrhée', 'Douleur abdominale', 'Toux', 'Brûlures mictionnelles',
        'Asthénie', 'Courbatures', 'Douleur épigastrique',
        // spécifiques à la femme
        F('Leucorrhées'), F('Prurit vulvaire'), F('Douleur pelvienne'), F('Retard de règles', { ageMax: 55 }), F('Règles douloureuses', { ageMax: 55 }),
        F('Saignements anormaux'), F('Douleur des seins'), F('Suivi de grossesse', { ageMax: 55 }), F('Contraception', { ageMax: 55 }),
        // spécifiques à l'homme
        M('Écoulement urétral'), M('Douleur testiculaire'), M('Troubles urinaires (jet faible, nycturie)', { ageMin: 40 }),
        M('Dysfonction érectile', { ageMin: 18 }), M('Lésion ou prurit génital'),
        'Plaie / traumatisme', 'Présentation des résultats', 'Contrôle',
    ],
    gynecology: [
        'Leucorrhées', 'Prurit vulvaire', 'Douleur pelvienne', 'Retard de règles', 'Règles douloureuses',
        'Saignements anormaux', { t: 'Désir de grossesse', ageMax: 50 }, { t: 'Contraception', ageMax: 55 }, { t: 'Suivi de grossesse', ageMax: 55 }, 'Douleur des seins',
        { t: 'Ménopause (bouffées de chaleur)', ageMin: 40 }, 'Contrôle',
    ],
    cardiology: [
        'Suivi HTA', 'Douleur thoracique', 'Palpitations', 'Essoufflement', 'Œdèmes des jambes', 'Vertiges',
        'Malaise', 'Bilan préopératoire', 'Contrôle',
    ],
    aesthetic: [
        'Taches', 'Acné', 'Rides', 'Cicatrice', 'Vergetures', 'Chute de cheveux', 'Peau sèche', 'Séance de soin',
        F('Pilosité excessive (hirsutisme)'), M('Boutons après rasage (pseudofolliculite)'), M('Calvitie débutante', { ageMin: 18 }),
    ],
    pediatrics: [
        'Fièvre', 'Toux', 'Diarrhée', 'Vomissements', { t: 'Refus de téter / manger', ageMax: 2 }, 'Pleurs inhabituels',
        'Éruption cutanée', 'Convulsions', 'Suivi croissance', 'Vaccination', { t: 'Brûlures mictionnelles' },
        { t: 'Pertes vaginales', sexe: 'F', ageMin: 1 }, { t: 'Gonflement des bourses', sexe: 'M' }, 'Contrôle',
    ],
};

// diagnostics fréquents + examens proposés (codes du catalogue du centre) ; `d` = diagnostic, `labo` = codes d'examens de
// biologie, `img` = motifs cherchés dans le code et le nom des examens d'imagerie (le premier examen trouvé est proposé)
export const DIAGNOSTICS = {
    general: [
        { d: 'Paludisme simple', labo: ['PARA-PALU', 'HEM-NFS'] },
        { d: 'Paludisme grave', labo: ['PARA-PALU', 'HEM-NFS', 'BIO-CRP-H', 'BIO-CREAS', 'BIO-GLU'] },
        { d: 'Fièvre typhoïde', labo: ['PARA-THYP', 'HEM-NFS', 'BIO-CRP-H'] },
        { d: 'Infection urinaire', labo: ['URO-CHIM', 'BACT-ECBU'] },
        { d: 'Gastro-entérite aiguë', labo: ['PARA-KAOP', 'BACT-COPRO', 'HEM-NFS'] },
        { d: 'Gastrite', labo: ['BACT-H.Pyl Ab'] },
        { d: 'Syndrome grippal', labo: ['PARA-PALU', 'HEM-NFS'] },
        { d: 'Angine', labo: ['HEM-NFS', 'BIO-CRP-H'] },
        { d: 'Parasitose digestive', labo: ['PARA-KAOP'] },
        { d: 'IST', labo: ['SERO-HIV', 'SERO-SYPH', 'SERO-H', 'BACT-PCV'] },
        { d: 'HTA', labo: ['BIO-CREAS', 'BIO-UREE', 'BIO-GLU', 'BIO-BLIP'] },
        // femme
        { d: 'Cystite aiguë', sexe: 'F', labo: ['URO-CHIM', 'BACT-ECBU'] },
        { d: 'Vaginose', sexe: 'F', ageMin: 12, labo: ['BACT-PCV'] },
        { d: 'Candidose vaginale', sexe: 'F', ageMin: 12, labo: ['BACT-PCV'] },
        { d: 'Grossesse (à confirmer)', sexe: 'F', ageMin: 12, ageMax: 55, labo: ['HORM-HCG'] },
        { d: 'Dysménorrhée', sexe: 'F', ageMin: 12, labo: [] },
        { d: 'Anémie', labo: ['HEM-NFS'] },
        // homme
        { d: 'Urétrite', sexe: 'M', ageMin: 12, labo: ['URO-CHIM', 'BACT-ECBU', 'BACT-GONOR', 'SERO-CHLAM Ag', 'SERO-HIV', 'SERO-SYPH'] },
        { d: 'Prostatite', sexe: 'M', ageMin: 18, labo: ['URO-CHIM', 'BACT-ECBU', 'HEM-NFS', 'BIO-CRP-H'] },
        { d: 'Hypertrophie bénigne de la prostate', sexe: 'M', ageMin: 40, labo: ['HORM-PSA', 'HORM-PSAL', 'BIO-CREAS', 'URO-CHIM'], img: ['prostat'] },
        { d: 'Orchi-épididymite', sexe: 'M', ageMin: 12, labo: ['URO-CHIM', 'BACT-ECBU', 'HEM-NFS'] },
        { d: 'Hernie inguinale', sexe: 'M', labo: [] },
        { d: 'Plaie', labo: [] },
    ],
    gynecology: [
        { d: 'Vaginose', labo: ['BACT-PCV'] },
        { d: 'Candidose vaginale', labo: ['BACT-PCV'] },
        { d: 'Infection génitale haute', labo: ['BACT-PCV', 'BACT-MYCO', 'SERO-CHLAM Ag', 'HEM-NFS', 'BIO-CRP-H'], img: ['endovaginale', 'pelvienne'] },
        { d: 'IST', labo: ['BACT-PCV', 'SERO-CHLAM Ag', 'BACT-GONOR', 'SERO-HIV', 'SERO-SYPH'] },
        { d: 'Grossesse évolutive', ageMax: 55, labo: ['HORM-HCG', 'HEM-GS', 'HEM-NFS', 'SERO-HIV', 'SERO-SYPH', 'SERO-H'], img: ['obst[ée]tric'] },
        { d: 'Infertilité', labo: ['HORM-FSH', 'HORM-LH', 'HORM-AMH', 'HORM-PRL', 'SERO-CHLAM Ab'], img: ['endovaginale', 'hyst[ée]rographie'] },
        { d: 'Dysménorrhée', labo: [] },
        { d: 'Fibrome utérin', labo: ['HEM-NFS'], img: ['endovaginale', 'pelvienne'] },
        { d: 'Mastose / nodule du sein', labo: [], img: ['mammaire.*2 seins'] },
        { d: 'Ménopause', ageMin: 40, labo: ['HORM-FSH', 'HORM-OESTRO'] },
    ],
    cardiology: [
        { d: 'HTA équilibrée', labo: ['BIO-CREAS', 'BIO-SIMP'] },
        { d: 'HTA non contrôlée', labo: ['BIO-CREAS', 'BIO-UREE', 'BIO-SIMP', 'BIO-BLIP', 'BIO-GLU'], img: ['^ECG$'] },
        { d: 'Insuffisance cardiaque', labo: ['BIO-CREAS', 'BIO-SIMP', 'HEM-NFS'], img: ['^ECG$', 'c[œo]ur|cardiaque'] },
        { d: 'Trouble du rythme', labo: ['BIO-SIMP'], img: ['^ECG$'] },
        { d: 'Douleur thoracique non cardiaque', labo: [] },
        { d: 'Dyslipidémie', labo: ['BIO-BLIP', 'BIO-GLU'] },
    ],
    aesthetic: [
        { d: 'Hyperpigmentation', labo: [] },
        { d: 'Mélasma', sexe: 'F', labo: [] },
        { d: 'Acné inflammatoire', labo: [] },
        { d: 'Cicatrice', labo: [] },
        { d: 'Vieillissement cutané', labo: [] },
        { d: 'Alopécie', labo: ['HEM-NFS'] },
        { d: 'Pseudofolliculite de la barbe', sexe: 'M', labo: [] },
        { d: 'Hirsutisme', sexe: 'F', labo: ['HORM-TESTO'] },
    ],
    pediatrics: [
        { d: 'Paludisme simple', labo: ['PARA-PALU', 'HEM-NFS'] },
        { d: 'Paludisme grave', labo: ['PARA-PALU', 'HEM-NFS', 'BIO-GLU'] },
        { d: 'Infection respiratoire', labo: ['HEM-NFS', 'BIO-CRP-H'] },
        { d: 'Gastro-entérite / déshydratation', labo: ['PARA-KAOP', 'HEM-NFS'] },
        { d: 'Otite', labo: [] },
        { d: 'Angine', labo: ['HEM-NFS'] },
        { d: 'Parasitose digestive', labo: ['PARA-KAOP'] },
        { d: 'Anémie', labo: ['HEM-NFS', 'HEM-ELPHB'] },
        { d: 'Infection urinaire', labo: ['URO-CHIM', 'BACT-ECBU'] },
        { d: 'Enfant en bonne santé', labo: [] },
    ],
};

export const motifsPour = (specialite, sexe, ageAns) =>
    (MOTIFS[specialite] || MOTIFS.general).filter(x => convient(x, sexe, ageAns)).map(x => (typeof x === 'string' ? x : x.t));
export const diagnosticsPour = (specialite, sexe, ageAns) =>
    (DIAGNOSTICS[specialite] || DIAGNOSTICS.general).filter(x => convient(x, sexe, ageAns));

// Suggestions supplémentaires selon le sexe, ajoutées aux raccourcis généraux (enquête des systèmes, examen physique)
export const ENQUETE_SELON_SEXE = {
    F: [
        'Cycles réguliers, pas de saignements anormaux',
        'Pas de leucorrhées, pas de prurit vulvaire',
        'Pas de douleur pelvienne',
        'Règles douloureuses (dysménorrhée)',
        'Retard de règles, possibilité de grossesse',
    ],
    M: [
        'Pas d\'écoulement urétral, pas de dysurie',
        'Jet urinaire normal, pas de nycturie',
        'Pollakiurie et nycturie, jet urinaire faible',
        'Pas de douleur testiculaire, pas de lésion génitale',
    ],
};
export const EXAMEN_SELON_SEXE = {
    F: [
        'Seins : pas de nodule, pas d\'adénopathie axillaire',
        'Abdomen : utérus non palpable au-dessus du pubis',
        'Fosses lombaires indolores',
    ],
    M: [
        'Organes génitaux externes normaux, testicules en place et indolores',
        'Pas de hernie inguinale',
        'Toucher rectal : prostate de taille normale, indolore, régulière',
        'Fosses lombaires indolores',
    ],
};
// Antécédents spécifiques : le champ « gynéco-obstétrique » devient « uro-génital » chez l'homme
export const ANTECEDENTS_UROGENITAL_HOMME = [
    'Aucun antécédent urologique',
    'Circoncision',
    'Infection urinaire antérieure',
    'IST antérieure traitée',
    'Lithiase urinaire',
    'Troubles urinaires du bas appareil (prostate)',
    'Hernie inguinale opérée',
    'Cryptorchidie opérée',
    'Varicocèle',
    'Dysfonction érectile',
];
export const ANTECEDENTS_GYNECO_FEMME = [
    'Nullipare',
    'G1P1 (1 grossesse, 1 accouchement)',
    'G2P2',
    'G3P2 (1 avortement)',
    'Césarienne antérieure',
    'Fausse couche spontanée',
    'Ménarche normale',
    'Cycles réguliers',
    'Cycles irréguliers',
    'Sous contraception orale',
    'Stérilet en place',
    'Dernières règles normales',
    'Dernier frottis normal',
    'Ménopause',
    'Grossesse en cours',
];

// une pastille = une ligne du texte : ajoute la ligne si absente, l'enlève sinon
export const basculerLigne = (texte, ligne) => {
    const lignes = (texte || '').split('\n').map(l => l.trimEnd());
    const i = lignes.findIndex(l => l.trim().toLowerCase() === ligne.trim().toLowerCase());
    if (i >= 0) {
        lignes.splice(i, 1);
        return lignes.join('\n').replace(/^\n+|\n+$/g, '');
    }
    const propre = lignes.join('\n').replace(/\n+$/g, '');
    return propre ? `${propre}\n${ligne}` : ligne;
};

export const contientLigne = (texte, ligne) =>
    (texte || '').split('\n').some(l => l.trim().toLowerCase() === ligne.trim().toLowerCase());

export const ageDepuis = (dateNaissance, ref = new Date()) => {
    if (!dateNaissance) return null;
    const n = new Date(dateNaissance);
    if (Number.isNaN(n.getTime())) return null;
    let mois = (ref.getFullYear() - n.getFullYear()) * 12 + (ref.getMonth() - n.getMonth());
    if (ref.getDate() < n.getDate()) mois -= 1;
    return { mois, ans: Math.floor(mois / 12) };
};

export const libelleAge = (age) => {
    if (!age) return '';
    if (age.mois < 24) return `${age.mois} mois`;
    return `${age.ans} ans`;
};
