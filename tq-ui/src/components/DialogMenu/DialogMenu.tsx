import React, {FC, ReactNode} from 'react';
import {Box, Dialog, List, ListSubheader} from '@mui/material';

interface DialogMenuProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
}

const DialogMenu: FC<DialogMenuProps> = ({children, title, open, onClose}) => {
  if (!open) return null;

  return (
    <Dialog onClose={onClose} open={open}>
      <Box minWidth="150px">
        <List
          sx={{py: 0, width: '100%'}}
          subheader={Boolean(title) && <ListSubheader>{title}</ListSubheader>}
        >
          {children}
        </List>
      </Box>
    </Dialog>
  );
};

export default DialogMenu;
