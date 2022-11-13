import React, {FC, useMemo} from 'react';
import {Button, Stack, Typography} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface DisplayErrorProps {
  error: unknown;
  onRetry: () => void;
}

const DisplayError: FC<DisplayErrorProps> = ({error, onRetry}) => {
  const message = useMemo(() => {
    const err = error as Error;
    if ('message' in err) {
      return String(err.message);
    }
    return 'Unknown error';
  }, [error]);

  return (
    <Stack spacing={2} p={1} direction="row" alignItems="center">
      <ErrorOutlineIcon color="error" />
      <Typography>{message}</Typography>
      <Button onClick={onRetry}>Retry</Button>
    </Stack>
  );
};

export default DisplayError;
