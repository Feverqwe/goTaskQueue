import React, {FC, SyntheticEvent, useCallback, useContext, useMemo, useRef, useState} from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {Template} from '../../RootStore/RootStoreProvider';
import {RootStoreCtx} from '../../RootStore/RootStoreCtx';

interface TemplateDialogProps {
  onClose: () => void;
  onSubmit: (run: boolean, command: string, label: string, isPty: boolean) => Promise<void>;
  template: Template;
  isNew?: boolean;
}

const TemplateDialog: FC<TemplateDialogProps> = ({template, onSubmit, onClose, isNew}) => {
  const {name, variables, command, label, isPty} = template;
  const {isPtySupported} = useContext(RootStoreCtx);
  const [isExtended, setExtended] = useState(() => isNew);
  const refCommand = useRef<HTMLInputElement>(null);
  const refLabel = useRef<HTMLInputElement>(null);
  const refPty = useRef<HTMLInputElement>(null);
  const refMap = useMemo(() => new Map(), []);
  variables.forEach(({value}) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    refMap.set(value, useRef());
  });

  const variableInputs = useMemo(() => {
    return variables.map(({name, value, defaultValue}) => {
      const ref = refMap.get(value);

      return (
        <Box py={1} key={value}>
          <TextField
            inputProps={{ref}}
            autoFocus
            label={name}
            type="text"
            fullWidth
            variant="standard"
            defaultValue={defaultValue}
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

    const isPty = refPty.current?.checked || false;

    return {command: commandResult, label: labelResult, isPty};
  }, [refMap]);

  const handleSubmit = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    const {command, label, isPty} = getCommand();
    await onSubmit(true, command, label, isPty);
    onClose();
  }, [onSubmit, onClose, getCommand]);

  const handleAdd = useCallback(async () => {
    const {command, label, isPty} = getCommand();
    await onSubmit(false, command, label, isPty);
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
            <Box py={1}>
              <TextField
                multiline
                label="Command"
                defaultValue={command}
                inputProps={{ref: refCommand}}
                fullWidth
                type="text"
                variant="standard"
                autoFocus={isNew}
              />
            </Box>
            {isPtySupported && (
              <Box py={1}>
                <FormControlLabel
                  label="Pseudo-terminal"
                  control={
                    <Checkbox inputRef={refPty} defaultChecked={isPty} />
                  }
                />
              </Box>
            )}
            <Box py={1}>
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
          {!isNew && (
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
          <Button variant="contained" type="submit" autoFocus={!isNew && variables.length === 0}>Add & Run</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TemplateDialog;
