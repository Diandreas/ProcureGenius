import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton, Tooltip } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const BackButton = ({ to, tooltip = 'Retour' }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Tooltip title={tooltip}>
      <IconButton onClick={handleClick} sx={{ mr: 1 }}>
        <ArrowBackIcon />
      </IconButton>
    </Tooltip>
  );
};

export default BackButton;
