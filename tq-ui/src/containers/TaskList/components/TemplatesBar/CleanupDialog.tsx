import React, {FC, SyntheticEvent, useCallback, useRef} from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
} from '@mui/material';
import {CleanupStatuses, TaskState} from '../../../../components/types';
import ActionButton from '../../../../components/ActionButton/ActionButton';

interface ChangeOrderDialogProps {
  open: boolean;
  onSubmit: (statuses: CleanupStatuses[]) => void;
  onClose: () => void;
}

const CleanupDialog: FC<ChangeOrderDialogProps> = ({onClose, onSubmit, open}) => {
  const refFinished = useRef<HTMLInputElement>(null);
  const refCanceled = useRef<HTMLInputElement>(null);
  const refError = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    async (e: SyntheticEvent) => {
      e.preventDefault();
      const statuses: CleanupStatuses[] = [];
      if (refFinished.current?.checked) {
        statuses.push(TaskState.Finished);
      }
      if (refCanceled.current?.checked) {
        statuses.push(TaskState.Canceled);
      }
      if (refError.current?.checked) {
        statuses.push(TaskState.Error);
      }
      await onSubmit(statuses);
      onClose();
    },
    [onSubmit, onClose],
  );

  const handleClose = useCallback(
    (e: Event, reason: string) => {
      if (reason === 'backdropClick') return;
      onClose();
    },
    [onClose],
  );

  return (
    <Dialog open={open} onClose={handleClose} fullWidth>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>Change order</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={<Checkbox slotProps={{input: {ref: refFinished}}} defaultChecked />}
            label="Finished"
          />
          <FormControlLabel
            control={<Checkbox slotProps={{input: {ref: refCanceled}}} defaultChecked />}
            label="Canceled"
          />
          <FormControlLabel
            control={<Checkbox slotProps={{input: {ref: refError}}} defaultChecked />}
            label="Error"
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <ActionButton variant="contained" type="submit" onSubmit={handleSubmit}>
            Cleanup
          </ActionButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default CleanupDialog;
