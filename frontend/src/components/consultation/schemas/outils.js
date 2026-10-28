// Outils pour dessiner des schémas symétriques sans recopier les coordonnées à la main.
// Les chemins doivent être écrits en coordonnées ABSOLUES (M L H V C S Q T A Z en majuscules).

const NOMBRE = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const r2 = (n) => Math.round(n * 100) / 100;

// Applique x' = sx*x + tx ; y' = sy*y + ty à un chemin SVG absolu.
export const transformerChemin = (d, sx, sy, tx, ty) => {
    const inverse = sx * sy < 0;
    const re = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
    const X = (x) => r2(sx * x + tx);
    const Y = (y) => r2(sy * y + ty);
    let sortie = '';
    let m;
    while ((m = re.exec(d))) {
        const cmd = m[1];
        if (cmd !== cmd.toUpperCase()) throw new Error(`Chemin relatif « ${cmd} » non géré : écrivez le chemin en coordonnées absolues (majuscules).`);
        const n = (m[2].match(NOMBRE) || []).map(Number);
        const o = [];
        if (cmd === 'Z') { sortie += 'Z'; continue; }
        if (cmd === 'H') n.forEach(v => o.push(X(v)));
        else if (cmd === 'V') n.forEach(v => o.push(Y(v)));
        else if (cmd === 'A') {
            for (let i = 0; i < n.length; i += 7) {
                const [rx, ry, rot, grand, balayage, x, y] = n.slice(i, i + 7);
                o.push(r2(rx * Math.abs(sx)), r2(ry * Math.abs(sy)), inverse ? -rot : rot, grand, inverse ? 1 - balayage : balayage, X(x), Y(y));
            }
        } else {
            for (let i = 0; i < n.length; i += 2) o.push(X(n[i]), Y(n[i + 1]));
        }
        sortie += cmd + o.join(' ');
    }
    return sortie;
};

// Reflet gauche-droite autour de la droite verticale x = axe.
export const miroirX = (d, axe) => transformerChemin(d, -1, 1, 2 * axe, 0);
export const translater = (d, dx, dy = 0) => transformerChemin(d, 1, 1, dx, dy);
export const echelleChemin = (d, sx, sy = sx, cx = 0, cy = 0) => transformerChemin(d, sx, sy, cx - sx * cx, cy - sy * cy);

// Reflet d'une forme { type, props } (path, circle, ellipse, rect, line, polygon, polyline)
export const miroirForme = (f, axe) => {
    const p = { ...f.props };
    switch (f.type) {
        case 'path': p.d = miroirX(p.d, axe); break;
        case 'circle': case 'ellipse': p.cx = r2(2 * axe - p.cx); break;
        case 'rect': p.x = r2(2 * axe - p.x - p.width); break;
        case 'line': p.x1 = r2(2 * axe - p.x1); p.x2 = r2(2 * axe - p.x2); break;
        case 'polygon': case 'polyline':
            p.points = p.points.trim().split(/[\s,]+/).map(Number).map((v, i) => (i % 2 === 0 ? r2(2 * axe - v) : v)).join(' ');
            break;
        default: throw new Error(`Forme « ${f.type} » non gérée par miroirForme`);
    }
    if (p.transform) throw new Error('miroirForme ne gère pas l\'attribut transform : écrivez les coordonnées directement');
    return { ...f, props: p };
};
export const miroirFormes = (formes, axe) => formes.map(f => miroirForme(f, axe));

// Raccourcis de construction
export const chemin = (d, extra = {}) => ({ type: 'path', props: { d, ...extra } });
export const cercle = (cx, cy, r) => ({ type: 'circle', props: { cx, cy, r } });
export const ellipse = (cx, cy, rx, ry) => ({ type: 'ellipse', props: { cx, cy, rx, ry } });
export const rectangle = (x, y, width, height, rx = 0) => ({ type: 'rect', props: { x, y, width, height, rx } });
// Zone d'appui invisible, plus grande que la forme dessinée : facilite le toucher des petites zones sur tablette.
export const aire = (forme) => ({ ...forme, aire: true });

export const zone = (libelle, groupe, constats, formes) => ({ libelle, groupe, constats, formes });

// Deux zones symétriques à partir d'une moitié dessinée à gauche de l'écran.
//   def = { libelles: [droit, gauche], groupe, constats, formes }   (formes dessinées sur la moitié GAUCHE DE L'ÉCRAN)
//   vue = 'face' : la moitié gauche de l'écran est le côté DROIT du patient ; 'dos' : c'est son côté GAUCHE.
// Retourne { [`${id}_d`]: zone, [`${id}_g`]: zone }.
export const paire = (id, axe, vue, def) => {
    const [libDroit, libGauche] = def.libelles;
    const ecranGauche = zone(vue === 'face' ? libDroit : libGauche, def.groupe, def.constats, def.formes);
    const ecranDroit = zone(vue === 'face' ? libGauche : libDroit, def.groupe, def.constats, miroirFormes(def.formes, axe));
    return vue === 'face'
        ? { [`${id}_d`]: ecranGauche, [`${id}_g`]: ecranDroit }
        : { [`${id}_g`]: ecranGauche, [`${id}_d`]: ecranDroit };
};

// Pour dessiner un décor symétrique : le gabarit reçoit un chemin pour la moitié gauche ; on dessine aussi le reflet.
export const symetrique = (axe, ...dessins) => dessins.flatMap((d) => [d, miroirForme(d, axe)]);
