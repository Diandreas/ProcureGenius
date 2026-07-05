// Corrige les emphases Markdown mal formees par le LLM (ex: "** Titre**" ou
// "**Titre **") qui ne s'affichent pas en gras en CommonMark strict car un
// espace juste apres/avant les marqueurs invalide l'emphase. Ne touche que
// les paires "**...**" completes sans "**" a l'interieur (donc ne casse pas
// les tableaux/listes qui enchainent plusieurs "**mot**" sur une ligne).
export const normalizeMarkdown = (text) => {
  if (!text) return text;
  return text.replace(/\*\*([ \t]*)([^*\n]+?)([ \t]*)\*\*/g, (match, lead, inner, trail) => {
    if (!lead && !trail) return match;
    return `**${inner}**`;
  });
};
