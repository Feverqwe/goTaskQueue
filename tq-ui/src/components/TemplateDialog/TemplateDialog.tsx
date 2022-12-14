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
import {Template} from '../RootStore/RootStoreProvider';
import {RootStoreCtx} from '../RootStore/RootStoreCtx';

interface TemplateDialogProps {
  onClose: () => void;
  onSubmit: (run: boolean, command: string, label: string, isPty: boolean, isOnlyCombined: boolean) => Promise<void>;
  template: Template;
  isNew?: boolean;
}

const TemplateDialog: FC<TemplateDialogProps> = ({template, onSubmit, onClose, isNew}) => {
  const {name, variables, command, label, isPty, isOnlyCombined} = template;
  const {isPtySupported} = useContext(RootStoreCtx);
  const [isExtended, setExtended] = useState(() => isNew);
  const refCommand = useRef<HTMLInputElement>(null);
  const refLabel = useRef<HTMLInputElement>(null);
  const refPty = useRef<HTMLInputElement>(null);
  const refOnlyCombined = useRef<HTMLInputElement>(null);
  const refMap = useMemo(() => new Map(), []);
  variables.forEach(({value}) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    refMap.set(value, useRef());
  });

  const variableInputs = useMemo(() => {
    return variables.map(({name, value, defaultValue}, index) => {
      const ref = refMap.get(value);
      return (
        <TextField
          size="small"
          sx={{my: 1}}
          key={index}
          inputProps={{ref}}
          autoFocus
          label={name}
          type="text"
          fullWidth
          variant="outlined"
          defaultValue={defaultValue}
          InputLabelProps={{
            shrink: true,
          }}
        />
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
    const isOnlyCombined = refOnlyCombined.current?.checked || false;

    return {command: commandResult, label: labelResult, isPty, isOnlyCombined};
  }, [refMap]);

  const handleSubmit = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    const {command, label, isPty, isOnlyCombined} = getCommand();
    await onSubmit(true, command, label, isPty, isOnlyCombined);
    onClose();
  }, [onSubmit, onClose, getCommand]);

  const handleAdd = useCallback(async () => {
    const {command, label, isPty, isOnlyCombined} = getCommand();
    await onSubmit(false, command, label, isPty, isOnlyCombined);
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
            <TextField
              size="small"
              sx={{my: 1}}
              multiline
              label="Command"
              defaultValue={command}
              inputProps={{ref: refCommand}}
              fullWidth
              type="text"
              variant="outlined"
              autoFocus={isNew}
              InputLabelProps={{
                shrink: true,
              }}
            />
            {isPtySupported && (
              <FormControlLabel
                sx={{my: 1}}
                label="Pseudo-terminal"
                control={
                  <Checkbox size="small" inputRef={refPty} defaultChecked={isPty} />
                }
              />
            )}
            <FormControlLabel
              sx={{my: 1}}
              label="Combined output"
              control={
                <Checkbox size="small" inputRef={refOnlyCombined} defaultChecked={isOnlyCombined} />
              }
            />
            <TextField
              size="small"
              sx={{my: 1}}
              label="Label"
              defaultValue={label || ''}
              inputProps={{ref: refLabel}}
              fullWidth
              type="text"
              variant="outlined"
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>
          {!isNew && (
            <Button
              sx={{my: 1}}
              size="small"
              onClick={handleAdvancedClick}
              startIcon={
                isExtended ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />
              }
            >
              Advanced
            </Button>
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
