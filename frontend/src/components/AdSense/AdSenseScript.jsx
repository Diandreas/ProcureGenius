/**
 * AdSense Script Loader
 * Loads Google AdSense script once globally
 */
import { useEffect } from 'react';

const ADSENSE_CLIENT_ID = 'ca-pub-9356267035201048';

const AdSenseScript = () => {
  useEffect(() => {
    // Check if script is already loaded
    if (document.querySelector(`script[src*="adsbygoogle"]`)) {
      return;
    }

    // Load AdSense script
    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed (usually not necessary)
    };
  }, []);

  return null; // This component doesn't render anything
};

export default AdSenseScript;
export { ADSENSE_CLIENT_ID };
