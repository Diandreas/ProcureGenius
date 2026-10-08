import { useState, useEffect } from 'react';
import { chargerMotifs } from './crmData';

/**
 * Le suivi patients est-il utilisable par ce compte, dans cette organisation ?
 * Les petits blocs glissés dans les écrans de facture et de patient s'effacent sinon,
 * sans jamais gêner le travail habituel.
 */
export default function useCrmDisponible() {
  const [disponible, setDisponible] = useState(false);
  useEffect(() => {
    let vivant = true;
    chargerMotifs().then(() => { if (vivant) setDisponible(true); }).catch(() => { if (vivant) setDisponible(false); });
    return () => { vivant = false; };
  }, []);
  return disponible;
}
