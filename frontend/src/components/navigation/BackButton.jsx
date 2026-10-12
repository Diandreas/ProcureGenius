import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function BackButton({ to, tooltip, onClick }) {
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) onClick();
    else if (to) navigate(to);
    else navigate(-1);
  };

  return (
    <Tooltip title={tooltip ?? t('common:back')}>
      <IconButton onClick={handleClick} size="small">
        <ArrowBack fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
