import {Box, CircularProgress, IconButton} from '@mui/material';
import React, {FC} from 'react';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';

interface SilentStatusProps {
  status: 'loading' | 'error';
  onRetry?: () => void;
}

const SilentStatus: FC<SilentStatusProps> = ({status, onRetry}) => {
  return (
    <Box sx={{position: 'fixed', right: 2, bottom: 2}}>
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
    </Box>
  );
};

export default SilentStatus;
