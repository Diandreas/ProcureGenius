// Logique pure (sans React) de la lecture de la tension artérielle : classes ESC/ESH,
// position d'une valeur sur l'échelle, conseils déduits. Aucun score de risque n'est calculé ici.
//
// Classes ESC/ESH (adulte, mesure au cabinet), la classe retenue étant la plus haute entre TAS et TAD :
//   optimale < 120 / < 80 · normale 120-129 / 80-84 · normale haute 130-139 / 85-89
//   HTA grade 1 140-159 / 90-99 · grade 2 160-179 / 100-109 · grade 3 >= 180 / >= 110
//   hypotension : TAS < 90 ou TAD < 60

export const AGE_ADULTE = 16; // en dessous, les seuils adultes ne s'appliquent pas (percentiles selon âge, sexe, taille)

// poids = largeur relative du segment sur l'échelle (l'échelle est graduée par classe, pas proportionnelle aux mmHg)
// sys / dia = bornes [bas, haut[ de la classe pour chaque pression ; les extrémités servent à placer le curseur
export const SEGMENTS = [
    { id: 'hypotension', nom: 'Hypotension', poids: 0.85, sys: [60, 90], dia: [40, 60], court: ['Hypo', ''], long: ['Hypo-', 'tension'] },
    { id: 'optimale', nom: 'Optimale', poids: 1, sys: [90, 120], dia: [60, 80], court: ['Opt.', ''], long: ['Optimale', ''] },
    { id: 'normale', nom: 'Normale', poids: 1, sys: [120, 130], dia: [80, 85], court: ['Norm.', ''], long: ['Normale', ''] },
    { id: 'normale_haute', nom: 'Normale haute', poids: 1, sys: [130, 140], dia: [85, 90], court: ['Norm.', 'haute'], long: ['Normale', 'haute'] },
    { id: 'grade1', nom: 'HTA grade 1', poids: 1, sys: [140, 160], dia: [90, 100], court: ['HTA', 'G1'], long: ['HTA', 'grade 1'] },
    { id: 'grade2', nom: 'HTA grade 2', poids: 1, sys: [160, 180], dia: [100, 110], court: ['HTA', 'G2'], long: ['HTA', 'grade 2'] },
    { id: 'grade3', nom: 'HTA grade 3', poids: 1, sys: [180, 220], dia: [110, 130], court: ['HTA', 'G3'], long: ['HTA', 'grade 3'] },
];
const POIDS_TOTAL = SEGMENTS.reduce((s, x) => s + x.poids, 0);
const DEBUTS = SEGMENTS.reduce((acc, s, i) => { acc.push(i === 0 ? 0 : acc[i - 1] + SEGMENTS[i - 1].poids); return acc; }, []);

export const FACTEURS_CARDIO = ['HTA connue', 'Diabète', 'Tabac', 'Dyslipidémie', 'Obésité', 'Sédentarité', 'Antécédent familial cardiovasculaire', 'Insuffisance rénale'];

// Nombre lu dans un champ de formulaire (« 145 », « 145,5 », 145) ; null si vide ou non numérique.
export const nombre = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const x = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(x) && x > 0 ? x : null;
};

const indexSys = (v) => (v < 90 ? 0 : v < 120 ? 1 : v < 130 ? 2 : v < 140 ? 3 : v < 160 ? 4 : v < 180 ? 5 : 6);
const indexDia = (v) => (v < 60 ? 0 : v < 80 ? 1 : v < 85 ? 2 : v < 90 ? 3 : v < 100 ? 4 : v < 110 ? 5 : 6);

// Position (0 à 1) d'une valeur sur la barre graduée, interpolée à l'intérieur de sa classe.
export const positionSurEchelle = (valeur, cle) => {
    const v = nombre(valeur);
    if (v === null) return null;
    const i = cle === 'sys' ? indexSys(v) : indexDia(v);
    const [bas, haut] = SEGMENTS[i][cle];
    const t = Math.min(1, Math.max(0, (v - bas) / (haut - bas)));
    return (DEBUTS[i] + t * SEGMENTS[i].poids) / POIDS_TOTAL;
};

// Positions (0 à 1) des repères chiffrés entre deux classes.
export const reperes = (cle) => SEGMENTS.slice(0, -1).map((s, i) => ({ valeur: s[cle][1], position: (DEBUTS[i] + s.poids) / POIDS_TOTAL }));
export const largeursSegments = SEGMENTS.map(s => s.poids);

const sexeNormalise = (sexe) => {
    const s = String(sexe || '').trim().toUpperCase();
    if (s.startsWith('F')) return 'F';
    if (s.startsWith('M') || s.startsWith('H')) return 'M';
    return null;
};

const fmtDecimal = (x) => String(Math.round(x * 10) / 10).replace('.', ',');

// Lecture complète de la tension. Retourne :
//   etat : 'vide' | 'enfant' | 'ok'
//   segment : index de la classe retenue (null si vide / enfant)
//   indexSys / indexDia : classe de chaque pression, isolee : HTA systolique isolée, incoherent : valeurs à vérifier
export const lireTension = ({ tas, tad, age } = {}) => {
    const s = nombre(tas);
    const d = nombre(tad);
    const ageNum = nombre(age);
    const enfant = ageNum !== null && ageNum < AGE_ADULTE;
    if (s === null && d === null) return { etat: 'vide', s, d, enfant };
    if (enfant) return { etat: 'enfant', s, d, enfant };

    const iS = s === null ? null : indexSys(s);
    const iD = d === null ? null : indexDia(d);
    const haut = Math.max(iS ?? 0, iD ?? 0);
    const basse = iS === 0 || iD === 0;
    // Hypotension si TAS < 90 ou TAD < 60, sauf si l'autre pression est elle-même en zone d'HTA (la classe retenue est alors la plus haute).
    const segment = basse && haut < 4 ? 0 : haut;
    const isolee = iS !== null && iS >= 4 && iD !== null && iD <= 3; // TAS >= 140 et TAD < 90
    const incoherent = (s !== null && d !== null && d >= s) || (s !== null && (s < 50 || s > 300)) || (d !== null && (d < 30 || d > 200));
    // Valeurs impossibles à interpréter (diastolique >= systolique, chiffres hors du plausible) : on ne classe pas, on demande de vérifier.
    if (incoherent) return { etat: 'incoherent', s, d, iS, iD, enfant };
    return { etat: 'ok', s, d, iS, iD, segment, isolee, enfant, basseAvecHta: basse && haut >= 4 };
};

// Conseils sobres déduits de la lecture et du contexte. niveau : 'attention' (à faire) | 'info'.
export const conseils = ({ tas, tad, imc, age, sexe, facteurs }) => {
    const lecture = lireTension({ tas, tad, age });
    const liste = [];
    if (lecture.etat === 'enfant') {
        liste.push({ id: 'enfant', niveau: 'info', texte: 'Les seuils ESC/ESH concernent l\'adulte (16 ans et plus). Chez l\'enfant, comparer aux valeurs de référence selon l\'âge, le sexe et la taille.' });
    }
    if (lecture.etat === 'incoherent') {
        liste.push({ id: 'incoherent', niveau: 'attention', texte: lecture.d !== null && lecture.s !== null && lecture.d >= lecture.s
            ? 'La diastolique atteint ou dépasse la systolique : vérifier la saisie ou refaire la mesure.'
            : 'Valeur hors du plausible : vérifier la saisie ou refaire la mesure.' });
    }
    if (lecture.etat === 'ok') {
        if (lecture.segment >= 4) {
            liste.push({ id: 'confirmer', niveau: 'attention', texte: 'Confirmer par 2 mesures à 2 visites avant de poser le diagnostic d\'HTA.' });
        }
        if (lecture.segment === 6) {
            liste.push({ id: 'grade3', niveau: 'attention', texte: 'Tension très élevée : refaire la mesure après 5 minutes de repos et chercher des signes de gravité (céphalée intense, douleur thoracique, essoufflement, déficit neurologique).' });
        }
        if (lecture.segment === 3) {
            liste.push({ id: 'surveiller', niveau: 'info', texte: 'Tension normale haute : à recontrôler lors des prochaines visites.' });
        }
        if (lecture.segment === 0) {
            liste.push({ id: 'hypo', niveau: 'attention', texte: 'Rechercher des symptômes (vertige, malaise), une déshydratation ou un médicament en cause ; si malaise, mesurer aussi debout.' });
        }
        if (lecture.isolee) {
            liste.push({ id: 'isolee', niveau: 'info', texte: 'Systolique à 140 ou plus avec diastolique sous 90 : HTA systolique isolée.' });
        }
        if (lecture.basseAvecHta) {
            liste.push({ id: 'basseHta', niveau: 'info', texte: 'Une des deux pressions est basse (TAS < 90 ou TAD < 60) : classe retenue sur la pression la plus élevée.' });
        }
        if (lecture.s === null || lecture.d === null) {
            liste.push({ id: 'partielle', niveau: 'info', texte: `${lecture.s === null ? 'Systolique' : 'Diastolique'} non saisie : classe établie sur la ${lecture.s === null ? 'diastolique' : 'systolique'} seule.` });
        }
    }
    return liste;
};

// Remarques de contexte pour les facteurs de risque (IMC, âge et sexe), sans aucun calcul de risque.
export const remarquesFacteurs = ({ imc, age, sexe, facteurs }) => {
    const liste = [];
    const noms = Array.isArray(facteurs) ? facteurs : [];
    const imcNum = nombre(imc);
    if (imcNum !== null && imcNum >= 30 && !noms.includes('Obésité')) {
        liste.push({ id: 'imc', texte: `IMC ${fmtDecimal(imcNum)} kg/m² : penser à cocher « Obésité ».` });
    }
    const ageNum = nombre(age);
    const sx = sexeNormalise(sexe);
    if (ageNum !== null && sx && ageNum >= AGE_ADULTE) {
        const seuil = sx === 'M' ? 55 : 65;
        if (ageNum >= seuil) {
            liste.push({ id: 'age', texte: `Âge : ${Math.round(ageNum)} ans (${sx === 'M' ? 'homme' : 'femme'} dès ${seuil} ans). Facteur de risque non compté dans les 8.` });
        }
    }
    return liste;
};

// Liste propre : chaînes non vides, sans doublon.
export const facteursPropres = (facteurs) => {
    if (!Array.isArray(facteurs)) return [];
    const vus = new Set();
    const res = [];
    facteurs.forEach((f) => {
        const t = typeof f === 'string' ? f.trim() : '';
        if (t && !vus.has(t)) { vus.add(t); res.push(t); }
    });
    return res;
};
