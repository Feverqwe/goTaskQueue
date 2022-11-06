import React, {FC, Fragment, SyntheticEvent, useCallback, useMemo, useRef, useState} from "react";
import {Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField} from "@mui/material";
import {Template} from "../../RootStore/RootStoreProvider";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

interface TemplateDialogProps {
  onClose: () => void;
  onSubmit: (command: string, label?: string, run?: boolean) => Promise<void>;
  template: Template;
}

const TemplateDialog: FC<TemplateDialogProps> = ({template, onSubmit, onClose}) => {
  const {name, variables, command, label} = template;
  const refCommand = useRef<HTMLInputElement>(null);
  const refLabel = useRef<HTMLInputElement>(null);
  const refMap = useMemo(() => new Map(), [variables]);
  const [isExtended, setExtended] = useState(() => !variables.length);
  variables.forEach(({value}) => {
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
    let labelResult = refLabel.current?.value || label || ''
    let commandResult = refCommand.current?.value || command || '';

    refMap.forEach(({current}, variable) => {
      if (!current) return;
      commandResult = commandResult.replace(`{${variable}}`, current.value);
      labelResult = labelResult.replace(`{${variable}}`, current.value);
    });

    return {command: commandResult, label: labelResult};
  }, [refMap, command, label]);

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
  }, [onSubmit, getCommand]);

  const handleAdvancedClick = useCallback(() => {
    setExtended(v => !v);
  }, []);

  return (
    <Dialog open={true} onClose={onClose} fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{name}</DialogTitle>
        <DialogContent>
          {variableInputs}
          {isExtended && (
            <Fragment>
              <Box p={1}>
                <TextField multiline label="Command" defaultValue={command} inputProps={{ref: refCommand}} fullWidth
                           type="text"
                           variant="standard"/>
              </Box>
              <Box p={1}>
                <TextField label="Label" defaultValue={label || ''} inputProps={{ref: refLabel}} fullWidth type="text"
                           variant="standard"/>
              </Box>
            </Fragment>
          )}
          {variableInputs.length > 0 && (
            <Box py={1}>
              <Button
                onClick={handleAdvancedClick}
                startIcon={
                  isExtended ? <KeyboardArrowUpIcon/> : <KeyboardArrowDownIcon/>
                }
              >
                Advanced
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd}>Add</Button>
          <Button type={"submit"}>Add & Run</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TemplateDialog;