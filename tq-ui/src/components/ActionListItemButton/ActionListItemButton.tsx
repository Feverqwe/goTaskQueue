import React, {FC, SyntheticEvent} from 'react';
import {Box, CircularProgress, ListItemButton, Tooltip} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import {ListItemButtonProps} from '@mui/material/ListItemButton/ListItemButton';
import useActionButton from '../ActionButton/useActionButton';

export type ActionListItemButtonProps = Omit<ListItemButtonProps, 'onSubmit' | 'onClick'> & {
  onSubmit: (event: SyntheticEvent<HTMLDivElement, MouseEvent>) => Promise<void>;
};

const ActionListItemButton: FC<ActionListItemButtonProps> = ({onSubmit, children, ...props}) => {
  const {isLoading, handleSubmit, error} = useActionButton(onSubmit);

  return (
    <ListItemButton disabled={isLoading} {...props} onClick={handleSubmit}>
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
    </ListItemButton>
  );
};

export default ActionListItemButton;
