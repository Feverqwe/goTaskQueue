import React, {FC, SyntheticEvent} from 'react';
import {Box, CircularProgress, IconButton, Tooltip} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import {IconButtonProps} from '@mui/material/IconButton/IconButton';
import useActionButton from '../ActionButton/useActionButton';

type IconActionButtonProps = Omit<IconButtonProps, 'onSubmit' | 'onClick'> & {
  onSubmit: (event: SyntheticEvent<HTMLButtonElement, MouseEvent>) => Promise<void>;
};

const IconActionButton: FC<IconActionButtonProps> = ({
  onSubmit,
  children,
  size = 'medium',
  ...props
}) => {
  const {isLoading, handleSubmit, error} = useActionButton(onSubmit);

  return (
    <IconButton disabled={isLoading} size={size} {...props} onClick={handleSubmit}>
      {isLoading ? (
        <Box display="flex" alignItems="center">
          <CircularProgress size={size === 'medium' ? 24 : size} />
        </Box>
      ) : error ? (
        <Tooltip title={error.message}>
          <ErrorIcon color="error" />
        </Tooltip>
      ) : (
        children
      )}
    </IconButton>
  );
};

export default IconActionButton;
