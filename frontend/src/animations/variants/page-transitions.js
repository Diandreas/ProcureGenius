// Transition quasi instantanee : fade tres court, sans glissement horizontal
// (le slide laissait un bref vide blanc et donnait une impression de lenteur).
export const pageVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.12, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.08 }
  }
};

export const pageFade = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

export const pageSlideUp = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 }
  }
};

export const pageScale = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};
