import React, { useEffect, useId, useRef, useState } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import {
    SEGMENTS, FACTEURS_CARDIO, lireTension, positionSurEchelle, reperes, conseils, remarquesFacteurs, facteursPropres,
} from './tensionLogique';

// Lecture de la tension (échelle ESC/ESH) et décompte des facteurs de risque cardiovasculaire.
// Composant d'affichage seul : il ne calcule aucun score de risque et ne modifie rien.
//   tas, tad   : tension systolique / diastolique en mmHg (nombre ou texte du formulaire)
//   facteurs   : tableau de libellés cochés (parmi FACTEURS_CARDIO)
//   imc        : indice de masse corporelle (facultatif, sert à un rappel)
//   age, sexe  : âge en années ; sexe 'F' / 'M' (facultatifs : seuils adultes, remarque d'âge)

// Une teinte par classe : `plein` = fond de la classe retenue (texte `sur` dessus), `texte` = valeur colorée lisible sur la surface.
const TEINTES = {
    light: {
        hypotension: { plein: '#2563eb', sur: '#ffffff', texte: '#1d4ed8' },
        optimale: { plein: '#047857', sur: '#ffffff', texte: '#047857' },
        normale: { plein: '#4d7c0f', sur: '#ffffff', texte: '#4d7c0f' },
        normale_haute: { plein: '#a16207', sur: '#ffffff', texte: '#a16207' },
        grade1: { plein: '#c2410c', sur: '#ffffff', texte: '#c2410c' },
        grade2: { plein: '#b91c1c', sur: '#ffffff', texte: '#b91c1c' },
        grade3: { plein: '#7f1d1d', sur: '#ffffff', texte: '#991b1b' },
    },
    dark: {
        hypotension: { plein: '#60a5fa', sur: '#0b1220', texte: '#60a5fa' },
        optimale: { plein: '#34d399', sur: '#0b1220', texte: '#34d399' },
        normale: { plein: '#a3cf4f', sur: '#0b1220', texte: '#a3cf4f' },
        normale_haute: { plein: '#fbbf24', sur: '#0b1220', texte: '#fbbf24' },
        grade1: { plein: '#fb923c', sur: '#0b1220', texte: '#fb923c' },
        grade2: { plein: '#f87171', sur: '#0b1220', texte: '#f87171' },
        grade3: { plein: '#dc2626', sur: '#ffffff', texte: '#f87171' },
    },
};
const ICONES = {
    hypotension: TrendingDownIcon, optimale: CheckCircleOutlineIcon, normale: CheckCircleOutlineIcon, normale_haute: ErrorOutlineIcon,
    grade1: ReportProblemOutlinedIcon, grade2: ReportProblemOutlinedIcon, grade3: ReportProblemOutlinedIcon,
};

const masque = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };

// Carte : surface nette, bordure fine, rayon 14.
const Carte = ({ children, sx, ...rest }) => (
    <Box
        {...rest}
        sx={{
            bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: '14px',
            boxShadow: (t) => (t.palette.mode === 'dark' ? 'none' : '0 1px 2px rgba(15,23,42,0.05)'),
            p: { xs: 1.75, sm: 2 }, minWidth: 0, ...sx,
        }}
    >
        {children}
    </Box>
);

// Tuile d'icône teintée (comme les StatCard).
const Tuile = ({ couleur, children }) => (
    <Box
        aria-hidden="true"
        sx={{
            width: 40, height: 40, borderRadius: '10px', flexShrink: 0, bgcolor: alpha(couleur, 0.12), color: couleur,
            display: 'flex', alignItems: 'center', justifyContent: 'center', '& .MuiSvgIcon-root': { fontSize: 22 },
        }}
    >
        {children}
    </Box>
);

// Étiquette d'une classe dans la barre : forme courte sur petit écran, complète au-delà de 480 px.
const Etiquette = ({ segment }) => (
    <Box component="span" sx={{ display: 'block', lineHeight: 1.15, fontSize: 11, fontWeight: 'inherit' }}>
        <Box component="span" sx={{ display: 'block', '@container (min-width: 480px)': { display: 'none' } }}>
            <span>{segment.court[0]}</span>{segment.court[1] && <><br />{segment.court[1]}</>}
        </Box>
        <Box component="span" sx={{ display: 'none', '@container (min-width: 480px)': { display: 'block', fontSize: 12 } }}>
            <span>{segment.long[0]}</span>{segment.long[1] && <><br />{segment.long[1]}</>}
        </Box>
    </Box>
);

// Rangée d'un curseur : bulle avec la valeur, trait jusqu'à la barre, et repères chiffrés des seuils.
// `haut` = au-dessus de la barre (TAS) ; sinon en dessous (TAD).
const RangeeCurseur = ({ cle, etiquette, valeur, haut, theme, inactif, largeur }) => {
    const pos = positionSurEchelle(valeur, cle);
    const pct = pos === null ? null : pos * 100;
    const marques = reperes(cle);
    const encre = theme.palette.text.primary;
    const bulle = (
        pct !== null && (
            <Box
                sx={{
                    position: 'absolute', [haut ? 'top' : 'bottom']: 0, left: `clamp(34px, ${pct}%, calc(100% - 34px))`, transform: 'translateX(-50%)',
                    height: 24, px: 1, borderRadius: '8px', bgcolor: encre, color: theme.palette.background.paper, whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                }}
            >
                <Box component="span" sx={{ fontWeight: 600, opacity: 0.8, fontSize: 11 }}>{etiquette}</Box>{Math.round(valeur)}
            </Box>
        )
    );
    return (
        <Box aria-hidden="true" sx={{ position: 'relative', height: pct !== null ? 48 : 26 }}>
            {bulle}
            {pct !== null && (
                <Box
                    sx={{
                        position: 'absolute', left: `${pct}%`, width: 2, ml: '-1px', bgcolor: encre,
                        [haut ? 'top' : 'bottom']: 24, [haut ? 'bottom' : 'top']: 0,
                        '&::after': {
                            content: '""', position: 'absolute', left: -4, width: 0, height: 0,
                            [haut ? 'bottom' : 'top']: -1, borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                            [haut ? 'borderTop' : 'borderBottom']: `6px solid ${encre}`,
                        },
                    }}
                />
            )}
            {marques.map((m) => {
                // un repère est caché seulement s'il est collé au trait du curseur (moins de 13 px)
                const masquee = pct !== null && Math.abs(m.position * 100 - pct) * largeur / 100 < 13;
                return (
                    <Box
                        key={m.valeur}
                        sx={{
                            position: 'absolute', [haut ? 'bottom' : 'top']: 8, left: `${m.position * 100}%`, transform: 'translateX(-50%)',
                            fontSize: 11, lineHeight: 1, fontWeight: 500, color: inactif ? 'text.disabled' : 'text.secondary',
                            fontVariantNumeric: 'tabular-nums', visibility: masquee ? 'hidden' : 'visible',
                        }}
                    >
                        {m.valeur}
                    </Box>
                );
            })}
        </Box>
    );
};

const Echelle = ({ lecture, tas, tad }) => {
    const theme = useTheme();
    const teintes = TEINTES[theme.palette.mode === 'dark' ? 'dark' : 'light'];
    const vide = lecture.etat === 'vide';
    const ref = useRef(null);
    const [largeur, setLargeur] = useState(300);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        setLargeur(el.clientWidth || 300);
        if (typeof ResizeObserver === 'undefined') return undefined;
        const ro = new ResizeObserver(() => setLargeur(el.clientWidth || 300));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return (
        <Box ref={ref} sx={{ mt: 0.5 }}>
            <RangeeCurseur cle="sys" etiquette="TAS" valeur={lecture.s} haut theme={theme} inactif={vide} largeur={largeur} />
            <Box sx={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', height: 46, opacity: vide ? 0.55 : 1 }}>
                {SEGMENTS.map((seg, i) => {
                    const t = teintes[seg.id];
                    const retenu = !vide && lecture.segment === i;
                    return (
                        <Box
                            key={seg.id}
                            title={seg.nom}
                            sx={{
                                flex: `${seg.poids} 1 0`, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                textAlign: 'center', borderLeft: i ? 2 : 0, borderColor: 'background.paper',
                                bgcolor: retenu ? t.plein : alpha(t.plein, theme.palette.mode === 'dark' ? 0.2 : 0.14),
                                color: retenu ? t.sur : 'text.secondary', fontWeight: retenu ? 700 : 500,
                                '&::after': retenu ? undefined : {
                                    content: '""', position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, bgcolor: t.plein,
                                },
                            }}
                        >
                            <Etiquette segment={seg} />
                        </Box>
                    );
                })}
            </Box>
            <RangeeCurseur cle="dia" etiquette="TAD" valeur={lecture.d} haut={false} theme={theme} inactif={vide} largeur={largeur} />
        </Box>
    );
};

const LigneConseil = ({ niveau, children }) => {
    const theme = useTheme();
    const attention = niveau === 'attention';
    const couleur = attention ? (theme.palette.mode === 'dark' ? theme.palette.warning.main : theme.palette.warning.dark) : theme.palette.text.secondary;
    return (
        <Box
            sx={{
                display: 'flex', gap: 1, alignItems: 'flex-start', px: 1.25, py: 0.875, borderRadius: '10px',
                bgcolor: attention ? alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.1) : (theme.palette.background.subtle || 'action.hover'),
            }}
        >
            {attention
                ? <ErrorOutlineIcon aria-hidden="true" sx={{ fontSize: 18, mt: '2px', color: couleur, flexShrink: 0 }} />
                : <InfoOutlinedIcon aria-hidden="true" sx={{ fontSize: 18, mt: '2px', color: couleur, flexShrink: 0 }} />}
            <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.45 }}>{children}</Typography>
        </Box>
    );
};

const CarteTension = ({ tas, tad, age, sexe, facteurs, imc }) => {
    const theme = useTheme();
    const sombre = theme.palette.mode === 'dark';
    const teintes = TEINTES[sombre ? 'dark' : 'light'];
    const idTitre = useId();
    const lecture = lireTension({ tas, tad, age });
    const retenu = lecture.etat === 'ok' ? SEGMENTS[lecture.segment] : null;
    const t = retenu ? teintes[retenu.id] : null;
    const neutre = theme.palette.text.secondary;
    const Icone = retenu ? ICONES[retenu.id] : ({ enfant: InfoOutlinedIcon, incoherent: ErrorOutlineIcon }[lecture.etat] || RemoveCircleOutlineIcon);
    const libelleEtat = retenu ? retenu.nom : ({ enfant: 'Seuils adultes non applicables', incoherent: 'Valeurs à vérifier' }[lecture.etat] || 'Non mesurée');
    const aVerifier = lecture.etat === 'incoherent';
    const valeur = lecture.etat === 'vide' ? '—' : `${lecture.s !== null ? Math.round(lecture.s) : '?'}/${lecture.d !== null ? Math.round(lecture.d) : '?'}`;
    const liste = conseils({ tas, tad, imc, age, sexe, facteurs });

    const detail = retenu && lecture.s !== null && lecture.d !== null
        ? (lecture.iS === lecture.iD
            ? `TAS et TAD : ${SEGMENTS[lecture.iS].nom}.`
            : `TAS : ${SEGMENTS[lecture.iS].nom} · TAD : ${SEGMENTS[lecture.iD].nom}. On retient la plus haute.`)
        : null;
    const description = lecture.etat === 'incoherent'
        ? 'Échelle de tension : valeurs à vérifier, aucune classe retenue.'
        : retenu
        ? `Échelle de tension : ${lecture.s !== null ? `systolique ${Math.round(lecture.s)}` : ''}${lecture.s !== null && lecture.d !== null ? ', ' : ''}${lecture.d !== null ? `diastolique ${Math.round(lecture.d)}` : ''} mmHg, classe retenue : ${retenu.nom}.`
        : 'Échelle de tension, aucune mesure.';

    return (
        <Carte component="section" aria-labelledby={idTitre} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: '1 1 auto', minWidth: 0 }}>
                    <Tuile couleur={t ? t.texte : neutre}><MonitorHeartOutlinedIcon /></Tuile>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography id={idTitre} variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                            Tension artérielle <Box component="span" sx={{ fontWeight: 500 }}>(mmHg)</Box>
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, whiteSpace: 'nowrap' }}>
                            <Typography
                                component="span"
                                sx={{
                                    fontSize: 28, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
                                    color: t ? t.texte : (lecture.etat === 'vide' ? 'text.disabled' : 'text.primary'),
                                }}
                            >
                                {valeur}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                <Box
                    role="status"
                    sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.75, minHeight: 32, px: 1.25, borderRadius: '8px', flexShrink: 0,
                        fontSize: 13, fontWeight: 700, lineHeight: 1.2,
                        ...(retenu
                            ? { bgcolor: t.plein, color: t.sur }
                            : aVerifier
                                ? { bgcolor: alpha(theme.palette.warning.main, sombre ? 0.2 : 0.16), color: 'text.primary', border: 1, borderColor: alpha(theme.palette.warning.main, 0.6) }
                                : { bgcolor: alpha(neutre, 0.12), color: 'text.secondary', fontWeight: 600 }),
                    }}
                >
                    <Icone aria-hidden="true" sx={{ fontSize: 18 }} />
                    {libelleEtat}
                </Box>
            </Box>

            {lecture.etat === 'enfant' ? null : (
                <Box role="img" aria-label={description}>
                    <Echelle lecture={lecture} tas={tas} tad={tad} />
                </Box>
            )}

            {detail && <Typography variant="caption" color="text.secondary" sx={{ mt: -0.5 }}>{detail}</Typography>}
            {lecture.etat === 'vide' && (
                <Typography variant="body2" color="text.secondary">
                    Saisissez la tension dans l'onglet Vitals pour situer le patient sur l'échelle.
                </Typography>
            )}

            {liste.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {liste.map(c => <LigneConseil key={c.id} niveau={c.niveau}>{c.texte}</LigneConseil>)}
                </Box>
            )}
        </Carte>
    );
};

// Pastille pleine (facteur coché) ou vide.
const Pastille = ({ plein, accent, theme, taille }) => (
    <Box
        aria-hidden="true"
        sx={{
            flex: taille ? `0 0 ${taille}px` : '1 1 0', width: taille, height: taille, maxWidth: taille ? undefined : 28, aspectRatio: '1', minWidth: 0, borderRadius: '50%',
            border: 2, borderColor: plein ? accent : alpha(theme.palette.text.secondary, theme.palette.mode === 'dark' ? 0.55 : 0.45),
            bgcolor: plein ? accent : 'transparent',
        }}
    />
);

const CarteFacteurs = ({ facteurs, imc, age, sexe }) => {
    const theme = useTheme();
    const sombre = theme.palette.mode === 'dark';
    const idTitre = useId();
    const liste = facteursPropres(facteurs);
    const total = FACTEURS_CARDIO.length;
    const n = liste.length;
    const accent = n > 0 ? (sombre ? theme.palette.warning.main : theme.palette.warning.dark) : theme.palette.text.secondary;
    const remarques = remarquesFacteurs({ imc, age, sexe, facteurs: liste });
    return (
        <Carte component="section" aria-labelledby={idTitre} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Tuile couleur={accent}><FactCheckOutlinedIcon /></Tuile>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography id={idTitre} variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                        Facteurs de risque
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }} aria-label={`${n} sur ${total}`}>
                        <Typography component="span" sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', color: accent, fontVariantNumeric: 'tabular-nums' }}>
                            {n}
                        </Typography>
                        <Typography component="span" sx={{ fontSize: 16, fontWeight: 600, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                            / {total}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Étroit : pastilles + puces des facteurs cochés */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, '@container (min-width: 560px) and (max-width: 899px)': { display: 'none' } }}>
                <Box role="img" aria-label={`${n} facteur${n > 1 ? 's' : ''} de risque coché${n > 1 ? 's' : ''} sur ${total}`} sx={{ display: 'flex', gap: 0.75 }}>
                    {Array.from({ length: total }, (_, i) => <Pastille key={i} plein={i < n} accent={accent} theme={theme} />)}
                </Box>
                {n > 0 ? (
                    <Box component="ul" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, m: 0, p: 0, listStyle: 'none' }}>
                        {liste.map(f => (
                            <Box
                                component="li"
                                key={f}
                                sx={{
                                    minHeight: 28, px: 1.25, py: 0.25, display: 'inline-flex', alignItems: 'center', borderRadius: '8px', fontSize: 13, fontWeight: 500,
                                    lineHeight: 1.3, color: 'text.primary', bgcolor: alpha(theme.palette.warning.main, sombre ? 0.14 : 0.12),
                                    border: 1, borderColor: alpha(theme.palette.warning.main, sombre ? 0.3 : 0.35),
                                }}
                            >
                                {f}
                            </Box>
                        ))}
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary">Aucun facteur de risque coché.</Typography>
                )}
            </Box>

            {/* Moyen (une colonne pleine largeur) : les 8 critères en grille, chacun avec sa pastille pleine (coché) ou vide */}
            <Box
                component="ul"
                sx={{
                    display: 'none', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', columnGap: 2, rowGap: 0.25, m: 0, p: 0, listStyle: 'none',
                    '@container (min-width: 560px) and (max-width: 899px)': { display: 'grid' },
                }}
            >
                {[...FACTEURS_CARDIO, ...liste.filter(f => !FACTEURS_CARDIO.includes(f))].map((f) => {
                    const coche = liste.includes(f);
                    return (
                        <Box component="li" key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minHeight: 28 }}>
                            <Pastille plein={coche} accent={accent} theme={theme} taille={16} />
                            <Typography variant="body2" sx={{ color: coche ? 'text.primary' : 'text.secondary', fontWeight: coche ? 700 : 400, lineHeight: 1.3 }}>
                                {f}
                                <Box component="span" sx={masque}>{coche ? ' : coché' : ' : non coché'}</Box>
                            </Typography>
                        </Box>
                    );
                })}
            </Box>

            {remarques.map(r => <LigneConseil key={r.id} niveau="info">{r.texte}</LigneConseil>)}

            <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto', pt: 0.25 }}>
                Simple décompte des facteurs cochés, ce n'est pas un score de risque.
            </Typography>
        </Carte>
    );
};

const RisqueCardio = ({ tas, tad, facteurs = [], imc, age, sexe }) => (
    <Box sx={{ containerType: 'inline-size', width: '100%', minWidth: 0 }}>
        <Box
            sx={{
                display: 'grid', gap: 1.5, gridTemplateColumns: 'minmax(0, 1fr)', alignItems: 'start',
                '@container (min-width: 900px)': { gridTemplateColumns: 'minmax(0, 1.75fr) minmax(0, 1fr)', alignItems: 'stretch' },
            }}
        >
            <CarteTension tas={tas} tad={tad} age={age} sexe={sexe} facteurs={facteurs} imc={imc} />
            <CarteFacteurs facteurs={facteurs} imc={imc} age={age} sexe={sexe} />
        </Box>
    </Box>
);

export default RisqueCardio;
