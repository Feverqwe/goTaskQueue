import React, {SyntheticEvent, useCallback, useMemo, useState} from 'react';
import {Box, CircularProgress, Tooltip} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';

interface UseActionButtonProps<ELEMENT, EVENT> {
  onSubmit: (event: SyntheticEvent<ELEMENT, EVENT>) => Promise<void>;
  iconSize?: number;
  isIcon?: boolean;
}

const useActionButton = <ELEMENT, EVENT>({
  onSubmit,
  iconSize = 24,
  isIcon,
}: UseActionButtonProps<ELEMENT, EVENT>) => {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = React.useState<null | Error>(null);

  const handleSubmit = useCallback(
    async (e: SyntheticEvent<ELEMENT, EVENT>) => {
      setLoading(true);
      setError(null);
      try {
        await onSubmit(e);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [onSubmit],
  );

  const stateNode = useMemo(() => {
    let icon = isLoading ? (
      <CircularProgress size={iconSize} />
    ) : error ? (
      <Tooltip title={error.message}>
        <ErrorIcon color="error" />
      </Tooltip>
    ) : null;

    if (!isIcon && icon) {
      icon = (
        <Box display="flex" alignItems="center" ml={1}>
          {icon}
        </Box>
      );
    }

    return icon;
  }, [isLoading, error, isIcon, iconSize]);

  return {isLoading, error, handleSubmit, stateNode};
};

export default useActionButton;
