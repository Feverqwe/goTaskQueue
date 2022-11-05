import React, {FC, SyntheticEvent, useCallback, useMemo, useRef} from "react";
import {Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField} from "@mui/material";
import {Template} from "../../RootStore/RootStoreProvider";

interface TemplateDialogProps {
  onClose: () => void;
  onSubmit: (command: string) => Promise<void>;
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

  const handleSubmit = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    let result = command;

    refMap.forEach(({current}, variable) => {
      if (!current) return;
      result = result.replace(`{${variable}}`, current.value);
    });

    await onSubmit(result);
    onClose();
  }, [refMap, command, onSubmit, onClose]);

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
            <Button type={"submit"}>Add</Button>
          </DialogActions>
      </form>
      </Dialog>
  );
};

export default TemplateDialog;