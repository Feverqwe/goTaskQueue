import React, {FC, ReactNode, useCallback, useState} from 'react';
import {Button, Dialog, DialogActions, DialogContent, DialogTitle} from '@mui/material';
import ActionButton from './ActionButton/ActionButton';

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  message?: ReactNode;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

const ConfirmDialog: FC<ConfirmDialogProps> = ({title, message, open, onSubmit, onClose}) => {
  const [isLoading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      await onSubmit();
      onClose();
    } finally {
      setLoading(false);
    }
  }, [onSubmit, onClose]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      {message && <DialogContent>{message}</DialogContent>}
      <DialogActions>
        <Button variant="outlined" disabled={isLoading} onClick={onClose}>
          Cancel
        </Button>
        <ActionButton variant="contained" onSubmit={handleSubmit} autoFocus>
          Confirm
        </ActionButton>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
