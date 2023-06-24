import React, {FC, SyntheticEvent} from 'react';
import {ButtonProps} from '@mui/material/Button/Button';
import {Box, Button, CircularProgress, Tooltip} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import useActionButton from './useActionButton';

export type ActionButtonProps = Omit<ButtonProps, 'onSubmit' | 'onClick'> & {
  onSubmit: (event: SyntheticEvent<HTMLButtonElement, MouseEvent>) => Promise<void>;
};

const ActionButton: FC<ActionButtonProps> = ({onSubmit, children, ...props}) => {
  const {isLoading, handleSubmit, error} = useActionButton(onSubmit);

  return (
    <Button disabled={isLoading} {...props} onClick={handleSubmit}>
      {children}
      {isLoading ? (
        <Box display="flex" alignItems="center" ml={1}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Box display="flex" alignItems="center" ml={1}>
          <Tooltip title={error.message}>
            <ErrorIcon color="error" />
          </Tooltip>
        </Box>
      ) : null}
    </Button>
  );
};

export default ActionButton;
