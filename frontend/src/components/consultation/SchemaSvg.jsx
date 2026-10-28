import React, { useLayoutEffect, useRef, useState } from 'react';

// Dessinateur SVG d'un schéma (aucune dépendance à MUI : seule la palette `c` fournit les couleurs).
//   vue    : { viewBox, decor(c, opts), etiquettes?, zones: { id: { libelle, constats, formes: [{type, props}] } } }
//   etat   : { selection: id|null, decrites: { id: 'normal'|'anormal' }, couleurs?: { id: couleur }, numeros?: { id: n } }
//   reperes: [{ id, x, y, n }]   repères libres posés sur l'image
const Forme = ({ type, props, ...surcharge }) => React.createElement(type, { ...props, ...surcharge });

const SchemaSvg = ({ vue, c, opts = {}, etat = {}, onZone, onFond, reperes = [], interactif = true, libelle = 'Schéma', style }) => {
    const { selection = null, decrites = {}, couleurs = null, numeros = null } = etat;
    const [survol, setSurvol] = useState(null);
    const [centres, setCentres] = useState({});
    const refs = useRef({});

    // centres des zones (pour les numéros de contrôle)
    useLayoutEffect(() => {
        if (!numeros) return;
        const n = {};
        Object.entries(refs.current).forEach(([id, el]) => {
            if (!el) return;
            try {
                const b = el.getBBox();
                n[id] = [b.x + b.width / 2, b.y + b.height / 2];
            } catch { /* élément non rendu */ }
        });
        setCentres(n);
    }, [numeros, vue]);

    const remplissage = (id) => {
        if (couleurs && couleurs[id]) return couleurs[id];
        if (selection === id) return c.zoneSelection;
        if (survol === id && interactif) return c.zoneSurvol;
        if (decrites[id] === 'anormal') return c.anormal;
        if (decrites[id] === 'normal') return c.normal;
        return c.zoneRepos;
    };
    const contour = (id) => {
        if (selection === id) return c.selectionTrait;
        if (decrites[id] === 'anormal') return c.anormalTrait;
        if (decrites[id] === 'normal') return c.normalTrait;
        return c.zoneTrait;
    };

    return (
        <svg viewBox={vue.viewBox} width="100%" role="img" aria-label={libelle}
            style={{ display: 'block', touchAction: 'manipulation', userSelect: 'none', ...style }}
            onClick={onFond ? (e) => { if (e.target === e.currentTarget || e.target.dataset?.fond) onFond(e); } : undefined}>
            <rect data-fond="1" x="-5000" y="-5000" width="10000" height="10000" fill="transparent" />
            {vue.decor && vue.decor(c, opts)}
            {Object.entries(vue.zones).map(([id, z]) => (
                <g key={id} ref={(el) => { refs.current[id] = el; }} role={interactif ? 'button' : undefined}
                    tabIndex={interactif ? 0 : undefined} aria-label={z.libelle} aria-pressed={interactif ? selection === id : undefined}
                    style={{ cursor: interactif ? 'pointer' : 'default', outline: 'none' }}
                    onClick={interactif ? (e) => onZone && onZone(id, e) : undefined}
                    onKeyDown={interactif ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onZone && onZone(id, e); } } : undefined}
                    onMouseEnter={interactif ? () => setSurvol(id) : undefined} onMouseLeave={interactif ? () => setSurvol(null) : undefined}>
                    <title>{z.libelle}</title>
                    {z.formes.map((f, i) => (f.aire ? (
                        // zone d'appui invisible : agrandit la surface à toucher d'une petite zone
                        <Forme key={i} type={f.type} props={f.props} fill="transparent" stroke="none" />
                    ) : (
                        <Forme key={i} type={f.type} props={f.props} fill={remplissage(id)} stroke={contour(id)}
                            strokeWidth={selection === id ? 1.8 : 0.8} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    )))}
                </g>
            ))}
            {numeros && Object.entries(centres).map(([id, [x, y]]) => (
                <g key={`n${id}`} pointerEvents="none">
                    <circle cx={x} cy={y} r="7.5" fill="#000" fillOpacity="0.72" />
                    <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="sans-serif">{numeros[id]}</text>
                </g>
            ))}
            {(vue.etiquettes || []).map((e, i) => (
                <text key={i} x={e.x} y={e.y} textAnchor={e.ancre || 'middle'} fontSize={e.taille || 11} fill={c.texte}
                    fontFamily="Inter, sans-serif" fontWeight="600" pointerEvents="none">{e.texte}</text>
            ))}
            {reperes.map((r) => (
                <g key={r.id} pointerEvents="none">
                    <circle cx={r.x} cy={r.y} r="9" fill={c.repere} stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                    <text x={r.x} y={r.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1f2937" fontFamily="sans-serif">{r.n}</text>
                </g>
            ))}
        </svg>
    );
};

export default SchemaSvg;
