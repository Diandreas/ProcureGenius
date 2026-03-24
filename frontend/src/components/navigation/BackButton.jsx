import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function BackButton({ to, tooltip = 'Retour', onClick }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) onClick();
    else if (to) navigate(to);
    else navigate(-1);
  };

  return (
    <Tooltip title={tooltip}>
      <IconButton onClick={handleClick} size="small">
        <ArrowBack fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
