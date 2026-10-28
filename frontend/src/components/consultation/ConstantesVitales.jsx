import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Box, InputAdornment, TextField, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ThermostatIcon from '@mui/icons-material/DeviceThermostat';
import TensionIcon from '@mui/icons-material/Speed';
import PoulsIcon from '@mui/icons-material/MonitorHeart';
import SaturationIcon from '@mui/icons-material/Opacity';
import RespirationIcon from '@mui/icons-material/Air';
import GlycemieIcon from '@mui/icons-material/Bloodtype';
import PoidsIcon from '@mui/icons-material/MonitorWeight';
import TailleIcon from '@mui/icons-material/Height';
import ImcIcon from '@mui/icons-material/Calculate';
import NormalIcon from '@mui/icons-material/CheckCircleOutline';
import LimiteIcon from '@mui/icons-material/WarningAmber';
import AnormalIcon from '@mui/icons-material/ErrorOutline';
import VerifierIcon from '@mui/icons-material/HelpOutline';
import HausseIcon from '@mui/icons-material/ArrowUpward';
import BaisseIcon from '@mui/icons-material/ArrowDownward';
import StableIcon from '@mui/icons-material/TrendingFlat';
import HistoriqueIcon from '@mui/icons-material/History';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import { MiniCourbe, JaugeImc, couleursNiveau } from './ConstantesGraphiques';
import {
    num, formater, serieHistorique, dateCourte, libelleAge, calculerImc,
    evaluerTemperature, evaluerSaturation, evaluerFrequenceCardiaque, evaluerFrequenceRespiratoire,
    evaluerGlycemie, evaluerTension, evaluerImc, evaluerPlausible,
} from './constantesSeuils';

// Constantes vitales de la consultation : une tuile par mesure, avec l'état en direct (mot + couleur),
// la valeur de la visite précédente et la courbe des mesures passées.
// Remplace la grille de champs de l'onglet « Vitals ». Aucun effet de bord : tout passe par onChange(nom, texte).

const NB_POINTS = 8; // mesures passées + actuelle dans la mini-courbe

/** Description de chaque constante « simple » (un champ). `adulteSeulement` : pas d'état pour un enfant. */
const SIMPLES = {
    temperature: {
        titre: 'Température', aria: 'T° (°C)', unite: '°C', Icone: ThermostatIcon, testid: 'consult-input-temp', large: true,
        histo: (m) => [num(m.temperature)], decimales: [1, 1], evaluer: evaluerTemperature, adulteSeulement: false,
        repere: 'Normale : 36,1 – 37,5 °C', bande: [36.1, 37.5], etendue: 2,
    },
    heart_rate: {
        titre: 'Fréq. cardiaque', titreComplet: 'Fréquence cardiaque', aria: 'FC (bpm)', unite: 'bpm', Icone: PoulsIcon, testid: 'consult-input-fc',
        histo: (m) => [num(m.fc)], decimales: [0, 0], evaluer: evaluerFrequenceCardiaque, adulteSeulement: true,
        repere: 'Au repos : 60 – 100 bpm', bande: [60, 100], etendue: 30,
    },
    oxygen_saturation: {
        titre: 'Saturation SpO2', titreComplet: 'Saturation en oxygène (SpO2)', aria: 'SpO2 (%)', unite: '%', Icone: SaturationIcon,
        histo: null, decimales: [0, 0], evaluer: evaluerSaturation, adulteSeulement: false, repere: 'Normale : 95 % et plus',
    },
    respiratory_rate: {
        titre: 'Fréq. respiratoire', titreComplet: 'Fréquence respiratoire', aria: 'FR (cycles par minute)', unite: '/min', Icone: RespirationIcon,
        histo: null, decimales: [0, 0], evaluer: evaluerFrequenceRespiratoire, adulteSeulement: true, repere: 'Normale : 12 – 20 /min',
    },
    blood_glucose: {
        titre: 'Glycémie', aria: 'Glycémie (g/L)', unite: 'g/L', Icone: GlycemieIcon,
        histo: null, decimales: [2, 2], evaluer: evaluerGlycemie, adulteSeulement: true, repere: 'À jeun : 0,70 – 1,10 g/L',
    },
    weight: {
        titre: 'Poids', aria: 'Poids (kg)', unite: 'kg', Icone: PoidsIcon,
        histo: (m) => [num(m.poids)], decimales: [0, 1], evaluer: null, plausible: [0.3, 400], etendue: 4,
    },
    height: {
        titre: 'Taille', aria: 'Taille (cm)', unite: 'cm', Icone: TailleIcon,
        histo: (m) => [num(m.taille)], decimales: [0, 1], evaluer: null, plausible: [25, 250], etendue: 6,
    },
};

/* ---------------------------------------------------------------- briques d'affichage */

/** Pastille d'état : icône + mot (jamais la couleur seule). */
function Pastille({ etat, id }) {
    const theme = useTheme();
    const c = couleursNiveau(theme, etat.niveau);
    const sombre = theme.palette.mode === 'dark';
    const Icone = { normal: NormalIcon, limite: LimiteIcon, verifier: VerifierIcon, anormal: AnormalIcon }[etat.niveau];
    const plein = !!etat.critique;
    return (
        <Box id={id} sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5, height: 26, px: 1, borderRadius: '8px', maxWidth: '100%',
            fontSize: '0.78rem', fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap',
            bgcolor: plein ? c.plein : alpha(c.main, sombre ? 0.16 : 0.12),
            color: plein ? (sombre ? theme.palette.background.default : '#fff') : c.texte,
            border: '1px solid', borderColor: plein ? c.plein : alpha(c.main, sombre ? 0.4 : 0.35),
        }}>
            <Icone sx={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
            <span>{etat.mot}</span>
        </Box>
    );
}

/** Ligne « 37,7 le 08/06  ↑ 0,7 » : la visite précédente et le sens de la variation. */
function Precedent({ texte, date, variation }) {
    const Fleche = variation && { hausse: HausseIcon, baisse: BaisseIcon, stable: StableIcon }[variation.sens];
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 1, rowGap: 0.25, minHeight: 22 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, color: 'text.secondary' }} title="Visite précédente">
                <HistoriqueIcon sx={{ fontSize: 15, flexShrink: 0 }} aria-hidden="true" />
                <Typography component="span" aria-label={`Visite précédente : ${texte} le ${date}`} sx={{ fontSize: '0.8rem', fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>{texte}</Box> le {date}
                </Typography>
            </Box>
            {variation && (
                <Box aria-label={variation.aria} title={variation.aria} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color: 'text.secondary', fontSize: '0.78rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <Fleche sx={{ fontSize: 16 }} aria-hidden="true" />
                    {variation.texte}
                </Box>
            )}
        </Box>
    );
}

/**
 * Une tuile. Le contenu variable (champs, état, pied, jauge) est fourni par l'appelant.
 *  niveau  : couleur d'accent de la pastille/tuile d'icône (normal = neutre : la couleur est réservée aux signaux)
 *  large   : tuile sur deux colonnes -> champs à gauche, historique à droite
 */
function Tuile({ id, titre, titreComplet, Icone, niveau, entete, large, cote, champs, etat, repere, avecEtat, pied, bas, onFocus, onBlur }) {
    const theme = useTheme();
    const signal = niveau === 'limite' || niveau === 'anormal' || niveau === 'verifier';
    const c = signal ? couleursNiveau(theme, niveau) : null;
    const accent = c ? c.texte : theme.palette.primary.main;
    const fond = theme.palette.background.subtle || theme.palette.background.default;
    return (
        <Box role="group" aria-labelledby={`${id}-titre`} onFocus={onFocus} onBlur={onBlur} sx={{
            gridColumn: large ? 'span 2' : 'auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.25, p: { xs: 1.25, sm: 1.5 },
            bgcolor: fond, borderRadius: '14px', border: '1px solid',
            borderColor: 'divider',
            transition: 'border-color .15s ease, box-shadow .15s ease',
            '&:focus-within': { borderColor: alpha(theme.palette.primary.main, 0.55), boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.1)}` },
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 }, minHeight: 36 }}>
                <Box sx={{
                    width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 }, borderRadius: '10px', flexShrink: 0, display: 'grid', placeItems: 'center',
                    bgcolor: alpha(c ? c.main : theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.12), color: accent,
                    transition: 'background-color .15s ease, color .15s ease',
                }}>
                    <Icone sx={{ fontSize: 19 }} aria-hidden="true" />
                </Box>
                <Typography id={`${id}-titre`} title={titreComplet || titre} sx={{ flex: 1, minWidth: 0, fontSize: { xs: '0.8rem', sm: '0.84rem' }, fontWeight: 600, color: 'text.primary', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{titre}</Typography>
                {entete}
            </Box>
            <Box sx={{ display: cote ? 'grid' : 'flex', flexDirection: 'column', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', columnGap: 2, rowGap: 1.25, flex: 1, alignContent: cote ? 'center' : 'start' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                    {champs}
                    {(avecEtat || etat) && (
                        <Box aria-live="polite" sx={{ minHeight: 26, display: 'flex', alignItems: 'center' }}>
                            {etat ? <Pastille etat={etat} id={`${id}-etat`} /> : (repere && (
                                <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary', lineHeight: 1.3 }}>{repere}</Typography>
                            ))}
                        </Box>
                    )}
                </Box>
                {pied && (
                    <Box sx={{
                        minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75, justifyContent: 'flex-end',
                        ...(cote ? { alignSelf: 'end' } : { borderTop: '1px solid', borderColor: 'divider', pt: 1, mt: 'auto' }),
                    }}>{pied}</Box>
                )}
            </Box>
            {bas}
        </Box>
    );
}

/** Style du grand champ numérique : 52 px de haut, chiffres en 24 px, bordure teintée si la valeur sort de la norme. */
function styleChamp(theme, niveau, compact) {
    const c = niveau === 'limite' || niveau === 'anormal' || niveau === 'verifier' ? couleursNiveau(theme, niveau) : null;
    return {
        '& .MuiOutlinedInput-root': { height: 52, pr: 1.5, ...(compact ? { pl: 1.25, pr: 0.5 } : {}) },
        '& .MuiOutlinedInput-root fieldset': c ? { borderColor: alpha(c.main, 0.7), borderWidth: 1.5 } : {},
        '& .MuiOutlinedInput-input': {
            height: '100%', boxSizing: 'border-box', py: 0, pl: 1.75, pr: 0.5, '.MuiInputAdornment-positionStart + &': { pl: compact ? 0.75 : 1 }, fontSize: compact ? '1.4rem' : '1.5rem', fontWeight: 600, letterSpacing: '-0.01em',
            fontVariantNumeric: 'tabular-nums', color: c ? c.texte : 'text.primary', minWidth: 0,
            '&::placeholder': { opacity: 0.4, color: theme.palette.text.secondary },
        },
    };
}

const Unite = ({ children }) => (
    <InputAdornment position="end" sx={{ ml: 0.5, pointerEvents: 'none' }}>
        <Typography component="span" sx={{ fontSize: '0.82rem', fontWeight: 500, color: 'text.secondary' }}>{children}</Typography>
    </InputAdornment>
);

function ChampNumerique({ nom, valeur, onChange, aria, unite, testid, niveau, decrit, invalide, prefixe, compact }) {
    const theme = useTheme();
    return (
        <TextField
            name={nom} id={`cv-${nom}`} value={valeur ?? ''} onChange={onChange} fullWidth autoComplete="off" placeholder="–"
            inputProps={{ inputMode: 'decimal', enterKeyHint: 'next', 'aria-label': aria, 'aria-describedby': decrit, 'aria-invalid': invalide || undefined, ...(testid ? { 'data-testid': testid } : {}) }}
            InputProps={unite || prefixe ? {
                ...(unite ? { endAdornment: <Unite>{unite}</Unite> } : {}),
                ...(prefixe ? { startAdornment: (
                    <InputAdornment position="start" sx={{ mr: 0, pointerEvents: 'none' }}>
                        <Typography component="span" sx={{ fontSize: compact ? '0.66rem' : '0.72rem', fontWeight: 700, letterSpacing: '0.03em', color: 'text.secondary' }}>{prefixe}</Typography>
                    </InputAdornment>
                ) } : {}),
            } : undefined}
            sx={styleChamp(theme, niveau, compact)}
        />
    );
}

/* ---------------------------------------------------------------- composant principal */

/**
 * Props :
 *  formData   champs de la consultation (temperature, blood_pressure_systolic, ..., bmi)
 *  onChange   (nom, texte brut) -> le parent remplace la virgule
 *  contexte   { mesures: [{ date, tas, tad, fc, temperature, poids, taille }] } des visites passées
 *  age        { mois, ans } | null
 *  sexe       "F" | "M" | null  (réservé : les repères adultes retenus ne dépendent pas du sexe)
 */
export default function ConstantesVitales({ formData, onChange, contexte, age }) {
    const theme = useTheme();
    const racine = useRef(null);
    const [colonnes, setColonnes] = useState(() => (typeof window !== 'undefined' && window.innerWidth >= 900 ? 3 : 2));
    const [focus, setFocus] = useState(null);
    const [largeur, setLargeur] = useState(0);
    const f = formData || {};
    const mesures = contexte?.mesures;
    const adulte = !!age && age.ans >= 15;

    // 3 colonnes si la zone est assez large (bureau), 2 sinon (tablette étroite, téléphone) : on mesure la zone, pas l'écran.
    useLayoutEffect(() => {
        const el = racine.current;
        if (!el || typeof ResizeObserver === 'undefined') return undefined;
        const mesurer = () => { setColonnes(el.clientWidth >= 780 ? 3 : 2); setLargeur(el.clientWidth); };
        mesurer();
        const obs = new ResizeObserver(mesurer);
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const changer = useCallback((e) => onChange(e.target.name, e.target.value), [onChange]);
    const large2 = colonnes === 2;
    const cote = large2 && largeur >= 520; // tuile sur deux colonnes assez large : champs à gauche, historique à droite

    // Une valeur improbable n'est signalée qu'une fois la saisie terminée (pas pendant qu'on tape « 3 » avant « 38 »).
    const visible = (etat, cle) => (etat && etat.niveau === 'verifier' && focus === cle ? null : etat);

    /** Précédent + variation + courbe pour une constante. `courante` : nombre(s) saisi(s) aujourd'hui (null si absent ou improbable). */
    const historique = (extraire, courantes, { decimales = [0, 1], bande, etendue, couleur }) => {
        const passees = serieHistorique(mesures, extraire);
        const dernier = passees[passees.length - 1];
        const aCourant = courantes && courantes[0] !== null;
        const lignes = [0, 1].map((k) => {
            const vals = passees.slice(-(NB_POINTS - (aCourant ? 1 : 0))).map((p) => (p.valeurs[k] === undefined ? null : p.valeurs[k]));
            if (aCourant) vals.push(courantes[k] === undefined ? null : courantes[k]);
            return vals;
        }).filter((l, k) => k === 0 || l.some((v) => v !== null));
        return { dernier, aCourant, lignes, decimales, bande, etendue, couleur };
    };

    const rendrePied = (h, formatPrecedent, variationDe, libelleCourbe, courbe = true) => {
        if (!h.dernier && h.lignes[0].length < 2) return null;
        const variation = h.dernier && h.aCourant ? variationDe(h) : null;
        return (
            <>
                {h.dernier && <Precedent texte={formatPrecedent(h.dernier)} date={dateCourte(h.dernier.date)} variation={variation} />}
                {courbe && h.lignes[0].filter((v) => v !== null).length >= 2 && (
                    <MiniCourbe lignes={h.lignes} bande={h.bande} etendue={h.etendue} couleur={h.couleur} courant={h.aCourant} libelle={libelleCourbe(h)} />
                )}
            </>
        );
    };

    const variationSimple = (decimales, unite) => (h) => {
        const ecart = h.lignes[0][h.lignes[0].length - 1] - h.dernier.valeurs[0];
        const arrondi = Math.round(ecart * 10 ** decimales[1]) / 10 ** decimales[1];
        const sens = arrondi === 0 ? 'stable' : arrondi > 0 ? 'hausse' : 'baisse';
        const texte = sens === 'stable' ? 'Stable' : formater(Math.abs(arrondi), 0, decimales[1]);
        const aria = sens === 'stable' ? 'Stable par rapport à la visite précédente'
            : `${sens === 'hausse' ? 'En hausse' : 'En baisse'} de ${texte}${unite ? ` ${unite}` : ''} par rapport à la visite précédente`;
        return { sens, texte, aria };
    };

    /* ---- tuiles simples ---- */
    const tuileSimple = (cle) => {
        const s = SIMPLES[cle];
        const valeur = num(f[cle]);
        const etatBrut = s.evaluer ? ((!s.adulteSeulement || adulte) ? s.evaluer(valeur) : null) : (s.plausible ? evaluerPlausible(valeur, ...s.plausible) : null);
        const etat = visible(etatBrut, cle);
        const c = etat ? couleursNiveau(theme, etat.niveau) : null;
        const utilisable = valeur !== null && etatBrut?.niveau !== 'verifier';
        const h = !s.histo ? null : historique(s.histo, utilisable ? [valeur] : null, {
            bande: s.bande && (!s.adulteSeulement || adulte) ? s.bande : undefined, etendue: s.etendue, couleur: c ? c.texte : theme.palette.primary.main, decimales: s.decimales,
        });
        const id = `cv-${cle}`;
        const [mn, mx] = s.decimales;
        const pied = !h ? null : rendrePied(
            h, (p) => formater(p.valeurs[0], mn, mx), variationSimple(s.decimales, s.unite),
            (hh) => `Évolution de ${s.titre.toLowerCase()} : ${hh.lignes[0].filter((v) => v !== null).map((v) => formater(v, mn, mx)).join(', ')}${hh.aCourant ? ' (la dernière valeur est celle d\'aujourd\'hui)' : ''}`,
            !(cle === 'height' && adulte), // la taille d'un adulte ne change pas : une courbe plate n'apprend rien
        );
        return (
            <Tuile key={cle} id={id} titre={s.titre} titreComplet={s.titreComplet} Icone={s.Icone} niveau={etat?.niveau} large={large2 && s.large} cote={cote && s.large}
                avecEtat={!!s.evaluer && (!s.adulteSeulement || adulte)} etat={etat} repere={s.repere} onFocus={() => setFocus(cle)} onBlur={() => setFocus(null)}
                champs={<ChampNumerique nom={cle} valeur={f[cle]} onChange={changer} aria={s.aria} unite={s.unite} testid={s.testid} niveau={etat?.niveau} decrit={etat ? `${id}-etat` : undefined} invalide={etatBrut?.niveau === 'verifier'} />}
                pied={pied} />
        );
    };

    /* ---- tension artérielle : une tuile, deux champs ---- */
    const tuileTension = () => {
        const tas = num(f.blood_pressure_systolic);
        const tad = num(f.blood_pressure_diastolic);
        const etatBrut = adulte ? evaluerTension(tas, tad) : null;
        const etat = visible(etatBrut, 'ta');
        const c = etat ? couleursNiveau(theme, etat.niveau) : null;
        const utilisable = tas !== null && etatBrut?.niveau !== 'verifier';
        const h = historique((m) => { const t = num(m.tas); return t === null ? null : [t, num(m.tad)]; }, utilisable ? [tas, tad] : null, { etendue: 40, couleur: c ? c.texte : theme.palette.primary.main });
        const pied = rendrePied(
            h, (p) => `${formater(p.valeurs[0], 0, 0)}/${p.valeurs[1] === null ? '–' : formater(p.valeurs[1], 0, 0)}`,
            (hh) => {
                const hs = Math.round(tas - hh.dernier.valeurs[0]);
                const hd = hh.dernier.valeurs[1] !== null && tad !== null ? Math.round(tad - hh.dernier.valeurs[1]) : null;
                const sens = hs === 0 && !hd ? 'stable' : hs > 0 ? 'hausse' : hs < 0 ? 'baisse' : (hd > 0 ? 'hausse' : 'baisse');
                const signe = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
                const texte = sens === 'stable' ? 'Stable' : `${signe(hs)}${hd !== null ? ` / ${signe(hd)}` : ''}`;
                return { sens, texte, aria: sens === 'stable' ? 'Tension stable par rapport à la visite précédente' : `Tension : ${texte} (systolique / diastolique) par rapport à la visite précédente` };
            },
            (hh) => `Évolution de la tension (systolique, puis diastolique en pointillés) : ${hh.lignes[0].filter((v) => v !== null).map((v) => formater(v, 0, 0)).join(', ')} pour la systolique`,
        );
        const decrit = etat ? 'cv-ta-etat' : undefined;
        return (
            <Tuile key="ta" id="cv-ta" titre="Tension artérielle" Icone={TensionIcon} niveau={etat?.niveau} large={large2} cote={cote}
                entete={<Typography component="span" sx={{ fontSize: '0.78rem', fontWeight: 500, color: 'text.secondary' }}>mmHg</Typography>}
                avecEtat={adulte} etat={etat} repere="Optimale : moins de 120 / 80" onFocus={() => setFocus('ta')} onBlur={() => setFocus(null)}
                champs={(
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', columnGap: 0.75 }}>
                        <Box sx={{ minWidth: 0 }}>
                            
                            <ChampNumerique nom="blood_pressure_systolic" valeur={f.blood_pressure_systolic} onChange={changer} aria="TAS (mmHg)" prefixe="TAS" compact testid="consult-input-tas" niveau={etat?.niveau} decrit={decrit} invalide={etatBrut?.niveau === 'verifier'} />
                        </Box>
                        <Typography aria-hidden="true" sx={{ fontSize: '1.5rem', fontWeight: 300, color: 'text.disabled', lineHeight: '52px' }}>/</Typography>
                        <Box sx={{ minWidth: 0 }}>
                            
                            <ChampNumerique nom="blood_pressure_diastolic" valeur={f.blood_pressure_diastolic} onChange={changer} aria="TAD (mmHg)" prefixe="TAD" compact testid="consult-input-tad" niveau={etat?.niveau} decrit={decrit} invalide={etatBrut?.niveau === 'verifier'} />
                        </Box>
                    </Box>
                )}
                pied={pied} />
        );
    };

    /* ---- IMC : calculé par le parent, lecture seule ---- */
    const tuileImc = () => {
        const imc = num(f.bmi);
        const etatBrut = adulte ? evaluerImc(imc) : null;
        const etat = etatBrut;
        const c = etat ? couleursNiveau(theme, etat.niveau) : null;
        const utilisable = imc !== null && etatBrut?.niveau !== 'verifier';
        const h = historique((m) => { const v = calculerImc(num(m.poids), num(m.taille)); return v === null ? null : [Math.round(v * 10) / 10]; }, utilisable ? [imc] : null, { etendue: 4, couleur: c ? c.texte : theme.palette.primary.main });
        const pied = rendrePied(h, (p) => formater(p.valeurs[0], 1, 1), variationSimple([1, 1], ''), () => '');
        // pour l'IMC la courbe n'apporte rien de plus que la jauge : on garde seulement la valeur précédente
        const sansCourbe = pied && h.dernier ? <Precedent texte={formater(h.dernier.valeurs[0], 1, 1)} date={dateCourte(h.dernier.date)} variation={utilisable ? variationSimple([1, 1], '')(h) : null} /> : null;
        return (
            <Tuile key="bmi" id="cv-bmi" titre="IMC" Icone={ImcIcon} niveau={etat?.niveau} large={large2} cote={cote}
                entete={<Typography component="span" sx={{ fontSize: '0.74rem', fontWeight: 500, color: 'text.secondary' }}>calculé</Typography>}
                avecEtat={adulte} etat={etat}
                champs={(
                    <Box sx={{ minHeight: 52, display: 'flex', alignItems: 'center', px: 0.5 }} role="status" aria-label={imc === null ? 'IMC : en attente du poids et de la taille' : `IMC : ${formater(imc, 1, 1)} kilogrammes par mètre carré`}>
                        {!utilisable ? (
                            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>{imc === null ? 'Se calcule avec le poids et la taille' : 'Vérifiez le poids et la taille'}</Typography>
                        ) : (
                            <>
                                <Typography component="span" sx={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', color: c && etat.niveau !== 'normal' ? c.texte : 'text.primary' }}>{formater(imc, 1, 1)}</Typography>
                                <Typography component="span" sx={{ ml: 0.75, fontSize: '0.82rem', fontWeight: 500, color: 'text.secondary' }}>kg/m²</Typography>
                            </>
                        )}
                    </Box>
                )}
                pied={sansCourbe}
                bas={adulte ? <JaugeImc valeur={utilisable ? imc : null} /> : null} />
        );
    };

    return (
        <Box ref={racine} sx={{ width: '100%', minWidth: 0 }}>
            {!adulte && (
                <Box role="note" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5, px: 1.5, py: 1, borderRadius: '10px', bgcolor: alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.12 : 0.07), color: 'text.secondary' }}>
                    <InfoIcon sx={{ fontSize: 18, mt: '1px', color: 'info.main', flexShrink: 0 }} aria-hidden="true" />
                    <Typography sx={{ fontSize: '0.8rem', lineHeight: 1.45 }}>
                        {age ? `Patient de ${libelleAge(age)} : ` : 'Âge du patient inconnu : '}
                        l’état est indiqué pour la température et la saturation seulement. Les autres repères dépendent de l’âge.
                    </Typography>
                </Box>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))`, gap: { xs: 1.25, sm: 1.5 } }}>
                {tuileSimple('temperature')}
                {tuileTension()}
                {tuileSimple('heart_rate')}
                {tuileSimple('oxygen_saturation')}
                {tuileSimple('respiratory_rate')}
                {tuileSimple('blood_glucose')}
                {tuileSimple('weight')}
                {tuileSimple('height')}
                {tuileImc()}
            </Box>
        </Box>
    );
}
