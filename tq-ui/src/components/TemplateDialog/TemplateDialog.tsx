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
import {AddTaskRequest, RawTemplate} from '../types';
import {RootStoreCtx} from '../RootStore/RootStoreCtx';
import ActionButton from '../ActionButton/ActionButton';

export interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (runTask: AddTaskRequest, isNewTab?: boolean) => Promise<void>;
  template: RawTemplate;
  isNew?: boolean;
  initVariables?: Partial<Record<string, string>>;
}

const TemplateDialog: FC<TemplateDialogProps> = ({
  open,
  template,
  onSubmit,
  onClose,
  isNew,
  initVariables = {},
}) => {
  const {
    name,
    variables,
    command,
    label,
    group,
    isPty,
    isOnlyCombined,
    place,
    isSingleInstance,
    isStartOnBoot,
  } = template;
  const {isPtySupported} = useContext(RootStoreCtx);
  const [isExtended, setExtended] = useState(() => isNew);
  const [isPtyEnabled, setPtyEnabled] = useState(isPty);
  const refPlace = useRef<string>(place);
  const refCommand = useRef<HTMLInputElement>(null);
  const refLabel = useRef<HTMLInputElement>(null);
  const refGroup = useRef<HTMLInputElement>(null);
  const refPty = useRef<HTMLInputElement>(null);
  const refOnlyCombined = useRef<HTMLInputElement>(null);
  const refSingleInstance = useRef<HTMLInputElement>(null);
  const refStartOnBoot = useRef<HTMLInputElement>(null);
  const refMap = useRef(new Map());
  variables.forEach(({value}) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    refMap.current.set(value, useRef());
  });

  const variableInputs = useMemo(() => {
    return variables.map(({name, value, defaultValue}, index) => {
      const ref = refMap.current.get(value);
      return (
        <TextField
          size="small"
          sx={{my: 1}}
          key={index}
          inputProps={{ref}}
          autoFocus={!isNew && index === 0}
          label={name}
          type="text"
          fullWidth
          variant="outlined"
          defaultValue={initVariables[value] ?? defaultValue}
          InputLabelProps={{
            shrink: true,
          }}
        />
      );
    });
  }, [initVariables, variables, isNew]);

  const getCommand = useCallback((isRun = false) => {
    const label = refLabel.current?.value || '';
    const command = refCommand.current?.value || '';

    const variables: Record<string, string> = {};
    refMap.current.forEach(({current}, variable) => {
      if (!current) return;
      variables[variable] = current.value;
    });

    const group = refGroup.current?.value || '';
    const isPty = refPty.current?.checked;
    const isOnlyCombined = refOnlyCombined.current?.checked;
    const isSingleInstance = refSingleInstance.current?.checked;
    const isStartOnBoot = refStartOnBoot.current?.checked;

    const templatePlace = refPlace.current;

    const payload: AddTaskRequest = {
      command,
      label,
      group,
      isPty,
      isOnlyCombined,
      isSingleInstance,
      isStartOnBoot,
      templatePlace,
      isRun,
      variables,
    };

    return payload;
  }, []);

  const handleSubmit = useCallback(
    async (e: SyntheticEvent) => {
      e.preventDefault();
      const runTask = getCommand(true);
      const isNewTab = 'metaKey' in e && Boolean(e.metaKey);
      await onSubmit(runTask, isNewTab);
      onClose();
    },
    [onSubmit, onClose, getCommand],
  );

  const handleAdd = useCallback(async () => {
    const runTask = getCommand(false);
    await onSubmit(runTask);
    onClose();
  }, [onClose, onSubmit, getCommand]);

  const handleAdvancedClick = useCallback(() => {
    setExtended((v) => !v);
  }, []);

  const handleClose = useCallback(
    (e: Event, reason: string) => {
      if (reason === 'backdropClick') return;
      onClose();
    },
    [onClose],
  );

  const handlePtyChange = useCallback(
    (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      setPtyEnabled(checked);
    },
    [],
  );

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <Box component="form" onSubmit={handleSubmit}>
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
                  <Checkbox
                    size="small"
                    inputRef={refPty}
                    defaultChecked={isPty}
                    onChange={handlePtyChange}
                  />
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
            {place && (
              <FormControlLabel
                sx={{my: 1}}
                label="Single instance"
                control={
                  <Checkbox
                    size="small"
                    inputRef={refSingleInstance}
                    defaultChecked={isSingleInstance}
                  />
                }
              />
            )}
            <FormControlLabel
              sx={{my: 1}}
              label="Start on boot"
              control={
                <Checkbox size="small" inputRef={refStartOnBoot} defaultChecked={isStartOnBoot} />
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
            <TextField
              size="small"
              sx={{my: 1}}
              label="Group"
              defaultValue={group || ''}
              inputProps={{ref: refGroup}}
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
              startIcon={isExtended ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            >
              Advanced
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <ActionButton variant="outlined" onSubmit={handleAdd}>
            Add
          </ActionButton>
          <ActionButton
            variant="contained"
            type="submit"
            autoFocus={!isNew && variables.length === 0}
            onSubmit={handleSubmit}
          >
            Add & {isPtyEnabled ? 'Open' : 'Run'}
          </ActionButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default TemplateDialog;
