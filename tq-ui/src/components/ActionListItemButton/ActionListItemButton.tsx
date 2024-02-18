import React, {FC, SyntheticEvent} from 'react';
import {ListItemButton} from '@mui/material';
import {ListItemButtonProps} from '@mui/material/ListItemButton/ListItemButton';
import useActionButton from '../ActionButton/useActionButton';

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
