"""Utilitaires texte transverses."""
import re

# Plages de codepoints emoji / pictogrammes. On ne touche PAS aux flèches
# typographiques (→ U+2192) ni aux accents — uniquement les vrais emojis.
_EMOJI_RE = re.compile(
    "["
    "\U0001F000-\U0001FAFF"   # symboles & pictogrammes étendus
    "\U00002600-\U000026FF"   # symboles divers
    "\U00002700-\U000027BF"   # dingbats
    "\U0001F1E6-\U0001F1FF"   # drapeaux régionaux
    "\U00002B00-\U00002BFF"   # flèches/formes décoratives
    "\U0001F900-\U0001F9FF"   # symboles supplémentaires
    "\U0000FE0F"              # variation selector (emoji presentation)
    "\U0000200D"              # zero-width joiner (séquences emoji)
    "]+",
    flags=re.UNICODE,
)


def strip_emojis(text):
    """Retire tous les emojis d'une chaîne et nettoie les espaces résiduels.

    Procura n'affiche aucun emoji (exigence produit). On l'applique notamment
    aux textes générés par l'IA, qui peuvent en contenir.
    """
    if not text or not isinstance(text, str):
        return text
    cleaned = _EMOJI_RE.sub('', text)
    # Réduire les espaces doubles laissés par la suppression.
    cleaned = re.sub(r'[ \t]{2,}', ' ', cleaned)
    cleaned = re.sub(r' +([.,!?;:])', r'\1', cleaned)
    return cleaned.strip()
