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

type Variable = Template['variables'][number];

const EditTemplateDialog: FC<TemplateDialogProps> = ({template, onSubmit, onClose, isNew}) => {
  const {name, command, label, isPty} = template;
  const {isPtySupported} = useContext(RootStoreCtx);
  const [variables, setVariables] = useState([...template.variables]);
  const refCommand = useRef<HTMLInputElement>(null);
  const refMap = useRef(new Map<string, HTMLInputElement>());
  const refLabel = useRef<HTMLInputElement>(null);
  const refName = useRef<HTMLInputElement>(null);
  const refPty = useRef<HTMLInputElement>(null);

  const handleDeleteVariable = useCallback((variable: Variable) => {
    if (!variable) return;
    setVariables((prev) => {
      const newValue = [...prev];
      const pos = variables.indexOf(variable);
      if (pos !== -1) {
        newValue.splice(pos, 1);
      }
      return newValue;
    });
  }, [variables]);

  const variableInputs = useMemo(() => {
    refMap.current.clear();

    return variables.map((variable, index, arr) => {
      const {name, value, defaultValue} = variable;
      const {name: refName, value: refValue, defaultValue: refDefaultValue} = Object.keys(variable).reduce((acc, key) => {
        acc[key as keyof Variable] = (el: HTMLInputElement) => { refMap.current.set(`${key}_${index}`, el); };
        return acc;
      }, {} as Record<keyof Variable, (el: HTMLInputElement) => void>);

      return (
        <Box my={1} key={`${arr.length}_${index}`} display="flex" alignItems="center">
          <TextField
            size="small"
            sx={{flexGrow: 1, mr: 1}}
            label="Variable"
            inputProps={{ref: refValue}}
            type="text"
            variant="outlined"
            required
            InputLabelProps={{
              shrink: true,
            }}
            defaultValue={value}
          />
          <TextField
            size="small"
            sx={{flexGrow: 1, mr: 1}}
            label="Name"
            inputProps={{ref: refName}}
            type="text"
            variant="outlined"
            required
            InputLabelProps={{
              shrink: true,
            }}
            defaultValue={name}
          />
          <TextField
            size="small"
            sx={{flexGrow: 1, mr: 1}}
            label="Default value"
            inputProps={{ref: refDefaultValue}}
            type="text"
            variant="outlined"
            InputLabelProps={{
              shrink: true,
            }}
            defaultValue={defaultValue || ''}
          />
          <IconButton onClick={handleDeleteVariable.bind(null, variable)} title="Delete">
            <RemoveIcon />
          </IconButton>
        </Box>
      );
    });
  }, [variables, refMap, handleDeleteVariable]);

  const handleAddVariable = useCallback((e: SyntheticEvent) => {
    e.preventDefault();
    setVariables((prev) => [...prev, {name: '', value: '', defaultValue: ''}]);
  }, []);

  const handleClose = useCallback((e: Event, reason: string) => {
    if (reason === 'backdropClick') return;
    onClose();
  }, [onClose]);

  const getTemplate = useCallback(() => {
    const map = refMap.current;
    const template: Template = {
      command: refCommand.current?.value || '',
      isPty: refPty.current?.checked || false,
      label: refLabel.current?.value || '',
      name: refName.current?.value || '',
      variables: variables.map((item, index) => {
        return Object.keys(item).reduce((acc, key) => {
          const value = map.get(`${key}_${index}`)?.value;
          if (value === undefined) {
            throw new Error('Incorrect value');
          }
          acc[key as keyof Variable] = value;
          return acc;
        }, {} as Variable);
      }),
    };
    return template;
  }, [variables]);

  const handleSubmit = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    const newTemplate = getTemplate();
    await onSubmit(isNew ? null : template, newTemplate);
    onClose();
  }, [isNew, getTemplate, onSubmit, onClose, template]);

  return (
    <Dialog open={true} onClose={handleClose} fullWidth>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>
          {isNew ? 'Add template' : 'Edit template'}
        </DialogTitle>
        <DialogContent>
          <TextField
            size="small"
            label="Name"
            sx={{my: 1}}
            defaultValue={name || ''}
            inputProps={{ref: refName}}
            fullWidth
            type="text"
            variant="outlined"
            required
            InputLabelProps={{
              shrink: true,
            }}
          />
          {variableInputs}
          <Button sx={{my: 1}} onClick={handleAddVariable} size="small" startIcon={<AddIcon />}>
            Add variable
          </Button>
          <TextField
            sx={{my: 1}}
            size="small"
            multiline
            label="Command"
            defaultValue={command}
            inputProps={{ref: refCommand}}
            fullWidth
            type="text"
            variant="outlined"
            required
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
          <TextField
            sx={{my: 1}}
            size="small"
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
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <Button variant="contained" type="submit">Save</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default EditTemplateDialog;
