import React, {FC, ReactNode, SyntheticEvent} from 'react';
import {Box, ListItemButton} from '@mui/material';

interface DialogMenuItemProps {
  onClick?: (e: SyntheticEvent) => void;
  component?: string;
  href?: string;
  target?: string;
  children: ReactNode;
}

const DialogMenuItem: FC<DialogMenuItemProps> = ({onClick, component, href, target, children}) => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <ListItemButton component={component as any} href={href} target={target} onClick={onClick}>
      <Box display="flex" p={0.5}>
        {children}
      </Box>
    </ListItemButton>
  );
};

export default DialogMenuItem;
