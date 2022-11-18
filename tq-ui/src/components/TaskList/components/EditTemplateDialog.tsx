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
  IconButton,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import {Template} from '../../RootStore/RootStoreProvider';
import {RootStoreCtx} from '../../RootStore/RootStoreCtx';

interface TemplateDialogProps {
  onClose: () => void;
  onSubmit: (prevTemplate: Template | null, template: Template) => Promise<void>;
  template: Template;
  isNew?: boolean;
}

const EditTemplateDialog: FC<TemplateDialogProps> = ({template, onSubmit, onClose, isNew}) => {
  const {name, command, label, isPty} = template;
  const {isPtySupported} = useContext(RootStoreCtx);
  const [variables, setVariables] = useState([...template.variables]);
  const refVariableValue = useRef<HTMLInputElement>(null);
  const refVariableName = useRef<HTMLInputElement>(null);
  const refCommand = useRef<HTMLInputElement>(null);
  const refMap = useRef(new Map<string, HTMLInputElement>());
  const refLabel = useRef<HTMLInputElement>(null);
  const refName = useRef<HTMLInputElement>(null);
  const refPty = useRef<HTMLInputElement>(null);

  const variableMap = useMemo(() => {
    return variables.reduce((map, variable) => {
      map.set(variable.value, variable);
      return map;
    }, new Map<string, Template['variables'][number]>());
  }, [variables]);

  const handleDeleteVariable = useCallback((value: string) => {
    const variable = variableMap.get(value);
    if (!variable) return;
    setVariables((prev) => {
      const newValue = [...prev];
      const pos = variables.indexOf(variable);
      if (pos !== -1) {
        newValue.splice(pos, 1);
      }
      return newValue;
    });
  }, [variableMap, variables]);

  const variableInputs = useMemo(() => {
    refMap.current.clear();

    return variables.map(({name, value}) => {
      const ref = (el: HTMLInputElement) => refMap.current.set(value, el);
      return (
        <Box py={1} key={value} display="flex" alignItems="center">
          <TextField
            sx={{flexGrow: 1}}
            inputProps={{ref}}
            label={name}
            type="text"
            fullWidth
            variant="standard"
            defaultValue={variableMap.get(value)?.defaultValue || ''}
          />
          <IconButton onClick={handleDeleteVariable.bind(null, value)} title="Delete">
            <RemoveIcon />
          </IconButton>
        </Box>
      );
    });
  }, [variables, refMap, handleDeleteVariable, variableMap]);

  const handleAddVariable = useCallback((e: SyntheticEvent) => {
    e.preventDefault();
    const value = refVariableValue.current?.value || '';
    const name = refVariableName.current?.value || '';
    setVariables((prev) => [...prev, {name, value}]);
  }, []);

  const handleClose = useCallback((e: Event, reason: string) => {
    if (reason === 'backdropClick') return;
    onClose();
  }, [onClose]);

  const getTemplate = useCallback(() => {
    const template: Template = {
      command: refCommand.current?.value || '',
      isPty: refPty.current?.checked || false,
      label: refLabel.current?.value || '',
      name: refName.current?.value || '',
      variables: variables.map(({name, value}) => {
        return {name, value, defaultValue: refMap.current.get(value)?.value || ''};
      }),
    };
    return template;
  }, [variables]);

  const handleSave = useCallback(async () => {
    const newTemplate = getTemplate();
    await onSubmit(isNew ? null : template, newTemplate);
    onClose();
  }, [isNew, getTemplate, onSubmit, onClose, template]);

  return (
    <Dialog open={true} onClose={handleClose} fullWidth>
      <DialogTitle>
        {isNew ? 'Add template' : 'Edit template'}
      </DialogTitle>
      <DialogContent>
        <Box py={1}>
          <TextField
            label="Name"
            defaultValue={name || ''}
            inputProps={{ref: refName}}
            fullWidth
            type="text"
            variant="standard"
            required
          />
        </Box>
        {variableInputs}
        <Box component="form" onSubmit={handleAddVariable} display="flex" alignItems="center" py={1}>
          <TextField
            sx={{flexGrow: 1}}
            label="Variable"
            inputProps={{ref: refVariableValue}}
            type="text"
            variant="standard"
            required
          />
          <TextField
            sx={{flexGrow: 1, mx: 1}}
            label="Name"
            inputProps={{ref: refVariableName}}
            type="text"
            variant="standard"
            required
          />
          <IconButton type="submit" title="Add">
            <AddIcon />
          </IconButton>
        </Box>
        <Box>
          <Box py={1}>
            <TextField
              multiline
              label="Command"
              defaultValue={command}
              inputProps={{ref: refCommand}}
              fullWidth
              type="text"
              variant="standard"
              required
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
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTemplateDialog;
