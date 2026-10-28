// Petites fonctions pures du bandeau patient (aucun effet de bord, testables seules).

const JOUR = 86400000;

// « Dernière visite » en langage courant : « hier », « il y a 3 semaines », « il y a 4 mois »…
export const dateRelative = (valeur, maintenant = new Date()) => {
    if (!valeur) return '';
    const d = new Date(valeur);
    if (Number.isNaN(d.getTime())) return '';
    const jours = Math.floor((maintenant.getTime() - d.getTime()) / JOUR);
    if (jours < 0) return d.toLocaleDateString('fr-FR');
    if (jours === 0) return "aujourd’hui";
    if (jours === 1) return 'hier';
    if (jours < 14) return `il y a ${jours} jours`;
    if (jours < 60) return `il y a ${Math.round(jours / 7)} semaines`;
    if (jours < 365) return `il y a ${Math.max(2, Math.round(jours / 30.4))} mois`;
    const ans = Math.floor(jours / 365);
    return ans === 1 ? 'il y a 1 an' : `il y a ${ans} ans`;
};

export const dateCourte = (valeur) => {
    const d = valeur ? new Date(valeur) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('fr-FR') : '';
};

// « 34 ans » ou « 18 mois » (moins de 24 mois), « Moins d’1 mois » pour un nouveau-né.
export const libelleAgePatient = (age) => {
    if (!age || typeof age.mois !== 'number' || age.mois < 0) return '';
    if (age.mois < 1) return "Moins d’1 mois";
    if (age.mois < 24) return `${age.mois} mois`;
    return `${age.ans} ans`;
};

// Sexe en toutes lettres ; « Fille / Garçon » pour les enfants.
export const libelleSexe = (sexe, age) => {
    if (sexe !== 'M' && sexe !== 'F') return '';
    const enfant = age && typeof age.ans === 'number' && age.ans < 15;
    if (sexe === 'F') return enfant ? 'Fille' : 'Femme';
    return enfant ? 'Garçon' : 'Homme';
};

// Initiales : première lettre du premier et du dernier mot (« NGO BELL Ornela » -> « NO »).
export const initiales = (nom) => {
    const mots = String(nom || '').trim().split(/\s+/).filter(Boolean);
    if (!mots.length) return '?';
    const lettres = (m) => Array.from(m.replace(/^[^\p{L}]+/u, ''));
    const a = lettres(mots[0]);
    if (mots.length === 1) return (a.slice(0, 2).join('') || '?').toUpperCase();
    const b = lettres(mots[mots.length - 1]);
    return ((a[0] || '') + (b[0] || '')).toUpperCase() || '?';
};

// Découpe « Pénicilline (urticaire, œdème), AINS\nLatex » en liste, sans casser les parenthèses.
export const decouperAllergies = (texte) => {
    const brut = String(texte || '').replace(/^\s*allergies?\s*:\s*/i, '');
    const items = [];
    let courant = '';
    let profondeur = 0;
    for (const c of brut) {
        if (c === '(') profondeur += 1;
        if (c === ')') profondeur = Math.max(0, profondeur - 1);
        if (profondeur === 0 && (c === ',' || c === ';' || c === '\n')) { items.push(courant); courant = ''; } else courant += c;
    }
    items.push(courant);
    return items.map(s => s.trim().replace(/^[-•·]\s*/, '')).filter(Boolean);
};

export const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;
