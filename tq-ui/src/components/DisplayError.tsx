import React, {FC, SyntheticEvent, useCallback, useMemo} from 'react';
import {Button, IconButton, Stack, Typography} from '@mui/material';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import {useNavigate} from 'react-router-dom';

interface DisplayErrorProps {
  error: unknown;
  onRetry: () => void;
  back?: boolean;
}

const DisplayError: FC<DisplayErrorProps> = ({error, onRetry, back}) => {
  const navigate = useNavigate();

  const message = useMemo(() => {
    const err = error as Error;
    if ('message' in err) {
      return String(err.message);
    }
    return 'Unknown error';
  }, [error]);

  const handleBack = useCallback(
    (e: SyntheticEvent) => {
      e.preventDefault();
      navigate('/');
    },
    [navigate],
  );

  return (
    <Stack
      spacing={2}
      direction="row"
      sx={{
        p: 1,
        alignItems: 'center',
      }}
    >
      {back && (
        <IconButton href="/" onClick={handleBack} title="Back">
          <ChevronLeftIcon />
        </IconButton>
      )}
      <ErrorOutlinedIcon color="error" />
      <Typography>{message}</Typography>
      <Button onClick={onRetry}>Retry</Button>
    </Stack>
  );
};

export default DisplayError;
