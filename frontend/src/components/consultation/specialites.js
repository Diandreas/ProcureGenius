// Configuration de la consultation par spécialité : motifs et diagnostics fréquents (pastilles),
// examens proposés (codes réels du catalogue labo / imagerie), zones des schémas.
// Une pastille écrit une ligne dans le champ texte ; le texte reste toujours modifiable.

export const SPECIALITES = [
    { code: 'general', libelle: 'Médecine générale', cle: null },
    { code: 'gynecology', libelle: 'Gynécologie', cle: 'gyneco' },
    { code: 'cardiology', libelle: 'Cardiologie', cle: 'cardio' },
    { code: 'aesthetic', libelle: 'Médecine esthétique', cle: 'esthetique' },
    { code: 'pediatrics', libelle: 'Pédiatrie', cle: 'pediatrie' },
];

export const MOTIFS = {
    general: ['Fièvre', 'Céphalées', 'Vomissements', 'Diarrhée', 'Douleur abdominale', 'Toux', 'Brûlures mictionnelles',
        'Asthénie', 'Courbatures', 'Douleur épigastrique', 'Plaie / traumatisme', 'Présentation des résultats', 'Contrôle'],
    gynecology: ['Leucorrhées', 'Prurit vulvaire', 'Douleur pelvienne', 'Retard de règles', 'Règles douloureuses',
        'Saignements anormaux', 'Désir de grossesse', 'Contraception', 'Suivi de grossesse', 'Douleur des seins', 'Contrôle'],
    cardiology: ['Suivi HTA', 'Douleur thoracique', 'Palpitations', 'Essoufflement', 'Œdèmes des jambes', 'Vertiges',
        'Malaise', 'Bilan préopératoire', 'Contrôle'],
    aesthetic: ['Taches', 'Acné', 'Rides', 'Cicatrice', 'Vergetures', 'Chute de cheveux', 'Peau sèche', 'Séance de soin'],
    pediatrics: ['Fièvre', 'Toux', 'Diarrhée', 'Vomissements', 'Refus de téter / manger', 'Pleurs inhabituels',
        'Éruption cutanée', 'Convulsions', 'Suivi croissance', 'Vaccination', 'Contrôle'],
};

// diagnostics fréquents + examens proposés (codes du catalogue du centre)
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
        { d: 'Plaie', labo: [] },
    ],
    gynecology: [
        { d: 'Vaginose', labo: ['BACT-PCV'] },
        { d: 'Candidose vaginale', labo: ['BACT-PCV'] },
        { d: 'Infection génitale haute', labo: ['BACT-PCV', 'BACT-MYCO', 'SERO-CHLAM Ag', 'HEM-NFS', 'BIO-CRP-H'], img: ['endovaginale', 'pelvienne'] },
        { d: 'IST', labo: ['BACT-PCV', 'SERO-CHLAM Ag', 'BACT-GONOR', 'SERO-HIV', 'SERO-SYPH'] },
        { d: 'Grossesse évolutive', labo: ['HORM-HCG', 'HEM-GS', 'HEM-NFS', 'SERO-HIV', 'SERO-SYPH', 'SERO-H'], img: ['obst[ée]tric'] },
        { d: 'Infertilité', labo: ['HORM-FSH', 'HORM-LH', 'HORM-AMH', 'HORM-PRL', 'SERO-CHLAM Ab'], img: ['endovaginale', 'hyst[ée]rographie'] },
        { d: 'Dysménorrhée', labo: [] },
        { d: 'Fibrome utérin', labo: ['HEM-NFS'], img: ['endovaginale', 'pelvienne'] },
        { d: 'Mastose / nodule du sein', labo: [], img: ['mammaire.*2 seins'] },
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
        { d: 'Mélasma', labo: [] },
        { d: 'Acné inflammatoire', labo: [] },
        { d: 'Cicatrice', labo: [] },
        { d: 'Vieillissement cutané', labo: [] },
        { d: 'Alopécie', labo: ['HEM-NFS'] },
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
        { d: 'Enfant en bonne santé', labo: [] },
    ],
};

// `img` : motifs (expressions régulières) cherchés dans le code et le nom des examens d'imagerie
// du catalogue ; seul le premier examen trouvé par motif est proposé.

// schéma du corps (médecine générale et pédiatrie) : zone -> constats
export const ZONES_CORPS = {
    tete: { libelle: 'Tête / ORL', constats: ['Normal', 'Gorge rouge', 'Amygdales hypertrophiées', 'Otite', 'Conjonctives pâles', 'Ictère', 'Pli cutané (déshydratation)'] },
    neuro: { libelle: 'Neurologique', constats: ['Conscient, orienté', 'Raideur de nuque', 'Convulsions', 'Somnolence'] },
    thorax: { libelle: 'Poumons', constats: ['MV bien perçu', 'Râles crépitants', 'Sibilants', 'Polypnée', 'Tirage'] },
    coeur: { libelle: 'Cœur', constats: ['B1 B2 réguliers', 'Souffle', 'Tachycardie'] },
    abdomen: { libelle: 'Abdomen', constats: ['Souple, indolore', 'Sensibilité épigastrique', 'Douleur FID', 'Défense', 'Hépatomégalie', 'Splénomégalie', 'Météorisme'] },
    pelvis: { libelle: 'Urinaire / pelvis', constats: ['Normal', 'Douleur hypogastrique', 'Ébranlement lombaire positif', 'Écoulement génital'] },
    membres: { libelle: 'Membres', constats: ['Normal', 'Œdèmes', 'Douleur articulaire', 'Impotence fonctionnelle', 'Plaie'] },
    peau: { libelle: 'Peau', constats: ['Normale', 'Éruption', 'Lésions de grattage', 'Pâleur', 'Plaie'] },
};

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
