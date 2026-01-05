export const hoverLift = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.005,
    y: -1,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  tap: {
    scale: 0.995,
    y: 0.5,
    transition: { duration: 0.1 }
  }
};

export const buttonPress = {
  rest: { y: 0 },
  hover: { y: 1 },
  tap: { y: 2 }
};

export const iconRotate = {
  rest: { rotate: 0 },
  hover: {
    rotate: 5,
    transition: { type: 'spring', stiffness: 300 }
  }
};

export const cardHover = {
  rest: { scale: 1 },
  hover: {
    scale: 1.005,
    transition: { duration: 0.2, ease: 'easeOut' }
  }
};

export const iconScale = {
  rest: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  tap: {
    scale: 0.95,
    transition: { duration: 0.1 }
  }
};
