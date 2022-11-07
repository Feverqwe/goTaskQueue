import React, {FC, ReactNode, useCallback, useState} from "react";
import {Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle} from "@mui/material";
import LoadingButton from '@mui/lab/LoadingButton';

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  message?: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
}

const ConfirmDialog: FC<ConfirmDialogProps> = ({title, message, open, onSubmit, onClose}) => {
  const [isLoading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      await onSubmit();
    } finally {
      setLoading(false);
      onClose();
    }
  }, [onSubmit, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={"xs"}
    >
      <DialogTitle>
        {title}
      </DialogTitle>
      {message && (
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {message}
          </DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button disabled={isLoading} onClick={onClose}>Cancel</Button>
        <LoadingButton disabled={isLoading} loading={isLoading} onClick={handleSubmit} autoFocus>
          Confirm
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmDialog;