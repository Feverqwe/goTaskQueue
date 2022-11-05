import React, {FC, SyntheticEvent, useCallback, useMemo, useRef} from "react";
import {Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField} from "@mui/material";
import {Template} from "../../RootStore/RootStoreProvider";

interface TemplateDialogProps {
  onClose: () => void;
  onSubmit: (command: string, run?: boolean) => Promise<void>;
  template: Template;
}

const TemplateDialog: FC<TemplateDialogProps> = ({template, onSubmit, onClose}) => {
  const {name, variables, command} = template;
  const refInput = useRef();
  const refMap = useMemo(() => new Map(), [variables]);
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
    let result = command;

    refMap.forEach(({current}, variable) => {
      if (!current) return;
      result = result.replace(`{${variable}}`, current.value);
    });

    return result;
  }, [refMap, command]);

  const handleSubmit = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    const command = getCommand();
    await onSubmit(command);
    onClose();
  }, [onSubmit, onClose, getCommand]);

  const handleAdd = useCallback(async () => {
    const command = getCommand();
    await onSubmit(command, false);
  }, []);

  return (
      <Dialog open={true} onClose={onClose} fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{name}</DialogTitle>
          <DialogContent>
            {variableInputs}
            <Box p={1}>
              <TextField multiline label="Command" defaultValue={command} inputProps={{ref: refInput}} fullWidth type="text"
                       variant="standard"/>
            </Box>
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