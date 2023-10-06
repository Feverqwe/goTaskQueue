import styled from '@emotion/styled';
import {Box, CircularProgress, IconButton} from '@mui/material';
import React, {FC} from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const SilentStatusContainer = styled(Box)(() => {
  return {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
  };
});

interface SilentStatusProps {
  status: 'loading' | 'error';
  onRetry?: () => void;
}

const SilentStatus: FC<SilentStatusProps> = ({status, onRetry}) => {
  return (
    <SilentStatusContainer>
      {status === 'loading' && (
        <Box m={1} display="flex">
          <CircularProgress size={20} />
        </Box>
      )}
      {status === 'error' && (
        <IconButton size="small" color="warning" onClick={onRetry}>
          <ErrorOutlineIcon />
        </IconButton>
      )}
    </SilentStatusContainer>
  );
};

export default SilentStatus;
