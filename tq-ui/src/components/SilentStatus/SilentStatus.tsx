import styled from '@emotion/styled';
import {Box, CircularProgress, IconButton} from '@mui/material';
import React, {FC} from 'react';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';

const SilentStatusContainer = styled(Box)(() => {
  return {
    position: 'fixed' as unknown as never,
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
        <Box
          sx={{
            m: 1,
            display: 'flex',
          }}
        >
          <CircularProgress size={20} />
        </Box>
      )}
      {status === 'error' && (
        <IconButton size="small" color="warning" onClick={onRetry}>
          <ErrorOutlinedIcon />
        </IconButton>
      )}
    </SilentStatusContainer>
  );
};

export default SilentStatus;
