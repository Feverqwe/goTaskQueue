import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import React, { useCallback, useRef, FC } from 'react';
import ConfirmDialog from '../ConfirmDialog';
import { Task } from '../types';

const signals = {
  SIGINT: 0x2,
  SIGTERM: 0xf,
  SIGHUP: 0x1,
  SIGQUIT: 0x3,
  SIGKILL: 0x9,
};

interface KillDialogProps {
    open: boolean;
    task: Task;
    onClose: () => void;
    onSubmit: (sig: number) => void;
}

const KillDialog: FC<KillDialogProps> = ({open, task, onClose, onSubmit}) => {
  const refSelect = useRef<{value: number}>();

  const handleSubmit = useCallback(() => {
    if (!refSelect.current) return;
    const {value} = refSelect.current;
    return onSubmit(value);
  }, [onSubmit]);

  return (
    <ConfirmDialog
      open={open}
      title="Stop task?"
      message={(
        <Box display="flex" flexDirection="column">
          <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
            <InputLabel>Signal</InputLabel>
            <Select
              inputProps={{
                ref: refSelect,
              }}
              defaultValue={signals.SIGKILL}
            >
              {Object.entries(signals).map(([name, sig]) => {
                return (
                  <MenuItem key={sig} value={sig}>{name}</MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Box>
      )}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
};

export default KillDialog;
