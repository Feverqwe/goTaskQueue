import React, {FC, ReactNode} from 'react';
import {Box, ListItemButton} from '@mui/material';

interface DialogMenuItemProps {
  onClick?: () => void;
  component?: string;
  href?: string;
  target?: string;
  children: ReactNode;
}

const DialogMenuItem: FC<DialogMenuItemProps> = ({onClick, component, href, target, children}) => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <ListItemButton component={component as any} href={href} target={target} onClick={onClick}>
      <Box p={0.5}>
        {children}
      </Box>
    </ListItemButton>
  );
};

export default DialogMenuItem;
