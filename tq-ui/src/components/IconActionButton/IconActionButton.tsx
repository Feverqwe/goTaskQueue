import React, {FC, SyntheticEvent} from 'react';
import {IconButton} from '@mui/material';
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
  const {isLoading, handleSubmit, stateNode} = useActionButton({onSubmit, isIcon: true});

  return (
    <IconButton
      size={size}
      {...props}
      disabled={isLoading || props.disabled}
      onClick={handleSubmit}
    >
      {stateNode || children}
    </IconButton>
  );
};

export default IconActionButton;
