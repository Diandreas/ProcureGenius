import corpsAdulte from './corpsAdulte';
import corpsHomme from './corpsHomme';
import corpsFemme from './corpsFemme';
import corpsEnfant from './corpsEnfant';
import nourrisson from './nourrisson';
import seins from './seins';
import visage from './visage';
import thorax from './thorax';
import orl from './orl';
import col from './col';
import pelvis from './pelvis';
import gravide from './gravide';

export { corpsAdulte, corpsHomme, corpsFemme, corpsEnfant, nourrisson, seins, visage, thorax, orl, col, pelvis, gravide };

// Tous les schémas par identifiant (pour retrouver le titre et les zones d'un repère déjà posé)
export const SCHEMAS = Object.fromEntries([corpsAdulte, corpsHomme, corpsFemme, corpsEnfant, nourrisson, seins, visage, thorax, orl, col, pelvis, gravide].map(s => [s.id, s]));

// Silhouette adaptée à l'âge et au sexe : nourrisson (< 2 ans), enfant (< 15 ans), adulte homme / femme
// (corps neutre si le sexe n'est pas renseigné, ou tant que la version homme / femme n'est pas dessinée)
const aDesZones = (s) => s.vues.some(v => Object.keys(v.zones).length > 0);
export const corpsSelonAge = (ageMois, sexe) => {
    if (ageMois !== null && ageMois !== undefined) {
        if (ageMois < 24) return nourrisson;
        if (ageMois < 15 * 12) return corpsEnfant;
    }
    if (sexe === 'M' && aDesZones(corpsHomme)) return corpsHomme;
    if (sexe === 'F' && aDesZones(corpsFemme)) return corpsFemme;
    return corpsAdulte;
};
