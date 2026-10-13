import { useTranslation } from 'react-i18next';
import { cheminLangue } from '../seo/site';

/**
 * Lien vers une page publique dans la langue affichée :
 * lien('/pricing') -> '/en/pricing' en anglais ; lien('/landing#demo') -> '/de#demo' en allemand.
 */
export default function useLienPublic() {
  const { i18n } = useTranslation();
  const langue = (i18n.resolvedLanguage || i18n.language || 'fr').slice(0, 2);
  return (chemin) => {
    const [base, ancre] = chemin.split('#');
    return `${cheminLangue(base, langue)}${ancre ? `#${ancre}` : ''}`;
  };
}
