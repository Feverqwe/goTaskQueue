import React, {FC, SyntheticEvent} from 'react';
import {ButtonProps} from '@mui/material/Button/Button';
import {Button} from '@mui/material';
import useActionButton from '../../hooks/useActionButton';

export type ActionButtonProps = Omit<ButtonProps, 'onSubmit' | 'onClick'> & {
  onSubmit: (event: SyntheticEvent<HTMLButtonElement, MouseEvent>) => Promise<void>;
};

const ActionButton: FC<ActionButtonProps> = ({onSubmit, children, ...props}) => {
  const {isLoading, handleSubmit, stateNode} = useActionButton({onSubmit});

  return (
    <Button {...props} disabled={isLoading || props.disabled} onClick={handleSubmit}>
      {children} {stateNode}
    </Button>
  );
};

export default ActionButton;
