import React, {FC, SyntheticEvent, useCallback, useMemo, useRef, useState} from 'react';
import {Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {Template} from '../../RootStore/RootStoreProvider';

interface TemplateDialogProps {
  onClose: () => void;
  onSubmit: (command: string, label?: string, run?: boolean) => Promise<void>;
  template: Template;
}

const TemplateDialog: FC<TemplateDialogProps> = ({template, onSubmit, onClose}) => {
  const {name, variables, command, label} = template;
  const refCommand = useRef<HTMLInputElement>(null);
  const refLabel = useRef<HTMLInputElement>(null);
  const refMap = useMemo(() => new Map(), []);
  const [isExtended, setExtended] = useState(() => !variables.length);
  variables.forEach(({value}) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    refMap.set(value, useRef());
  });

  const variableInputs = useMemo(() => {
    return variables.map(({name, value}) => {
      const ref = refMap.get(value);

      return (
        <Box p={1} key={value}>
          <TextField
            inputProps={{ref}}
            autoFocus
            label={name}
            type="text"
            fullWidth
            variant="standard"
          />
        </Box>
      );
    });
  }, [variables, refMap]);

  const getCommand = useCallback(() => {
    let labelResult = refLabel.current?.value || '';
    let commandResult = refCommand.current?.value || '';

    refMap.forEach(({current}, variable) => {
      if (!current) return;
      commandResult = commandResult.replace(`{${variable}}`, current.value);
      labelResult = labelResult.replace(`{${variable}}`, current.value);
    });

    return {command: commandResult, label: labelResult};
  }, [refMap]);

  const handleSubmit = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    const {command, label} = getCommand();
    await onSubmit(command, label);
    onClose();
  }, [onSubmit, onClose, getCommand]);

  const handleAdd = useCallback(async () => {
    const {command, label} = getCommand();
    await onSubmit(command, label, false);
    onClose();
  }, [onClose, onSubmit, getCommand]);

  const handleAdvancedClick = useCallback(() => {
    setExtended((v) => !v);
  }, []);

  const handleClose = useCallback((e: Event, reason: string) => {
    if (reason === 'backdropClick') return;
    onClose();
  }, [onClose]);

  return (
    <Dialog open={true} onClose={handleClose} fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{name}</DialogTitle>
        <DialogContent>
          {variableInputs}
          <Box display={isExtended ? 'block' : 'none'}>
            <Box p={1}>
              <TextField
                multiline
                label="Command"
                defaultValue={command}
                inputProps={{ref: refCommand}}
                fullWidth
                type="text"
                variant="standard"
              />
            </Box>
            <Box p={1}>
              <TextField
                label="Label"
                defaultValue={label || ''}
                inputProps={{ref: refLabel}}
                fullWidth
                type="text"
                variant="standard"
              />
            </Box>
          </Box>
          {variableInputs.length > 0 && (
            <Box py={1}>
              <Button
                onClick={handleAdvancedClick}
                startIcon={
                  isExtended ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />
                }
              >
                Advanced
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <Button variant="outlined" onClick={handleAdd}>Add</Button>
          <Button variant="contained" type="submit">Add & Run</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TemplateDialog;
