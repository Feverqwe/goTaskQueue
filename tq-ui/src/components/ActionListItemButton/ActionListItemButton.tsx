import React, {FC, SyntheticEvent} from 'react';
import {ListItemButton, ListItemButtonProps} from '@mui/material';
import useActionButton from '../../hooks/useActionButton';

export type ActionListItemButtonProps = Omit<ListItemButtonProps, 'onSubmit' | 'onClick'> & {
  onSubmit: (event: SyntheticEvent<HTMLDivElement, MouseEvent>) => Promise<void>;
};

const ActionListItemButton: FC<ActionListItemButtonProps> = ({onSubmit, children, ...props}) => {
  const {isLoading, handleSubmit, stateNode} = useActionButton({onSubmit});

  return (
    <ListItemButton {...props} disabled={isLoading || props.disabled} onClick={handleSubmit}>
      {children} {stateNode}
    </ListItemButton>
  );
};

export default ActionListItemButton;
