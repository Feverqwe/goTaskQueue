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
import path from 'path-browserify';
import {RawTemplate, Template, TemplateFolder} from '../../../../components/types';
import {RootStoreCtx} from '../../../../components/RootStore/RootStoreCtx';
import ActionButton from '../../../../components/ActionButton/ActionButton';
import {CommandFieldRef} from '../../../../components/CommandField/CommandField';
import CommandFieldAsync from '../../../../components/CommandField/CommandFieldAsync';

interface TemplateDialogProps {
  folder: TemplateFolder;
  open: boolean;
  onClose: () => void;
  onSubmit: (prevPlace: string, template: RawTemplate) => Promise<void>;
  template: RawTemplate;
  isNew?: boolean;
}

type Variable = RawTemplate['variables'][number];

const variableIdMap = new WeakMap<Variable, string>();

const EditTemplateDialog: FC<TemplateDialogProps> = ({
  folder,
  template,
  open,
  onSubmit,
  onClose,
  isNew,
}) => {
  const {
    place,
    id,
    name,
    command,
    label,
    group,
    isPty,
    isOnlyCombined,
    isSingleInstance,
    isStartOnBoot,
    isWriteLogs,
    ttl,
  } = template;
  const {isPtySupported} = useContext(RootStoreCtx);
  const [variables, setVariables] = useState([...template.variables]);
  const refCommand = useRef<CommandFieldRef>(null);
  const refMap = useRef(new Map<string, HTMLInputElement>());
  const refLabel = useRef<HTMLInputElement>(null);
  const refGroup = useRef<HTMLInputElement>(null);
  const refName = useRef<HTMLInputElement>(null);
  const refPty = useRef<HTMLInputElement>(null);
  const refId = useRef<HTMLInputElement>(null);
  const refOnlyCombined = useRef<HTMLInputElement>(null);
  const refWriteLogs = useRef<HTMLInputElement>(null);
  const refSingleInstance = useRef<HTMLInputElement>(null);
  const refStartOnBoot = useRef<HTMLInputElement>(null);
  const refPlace = useRef<HTMLInputElement>(null);
  const refTtl = useRef<HTMLInputElement>(null);

  useMemo(() => {
    variables.forEach((variable) => {
      if (!variableIdMap.has(variable)) {
        variableIdMap.set(variable, String(Math.random()));
      }
    });
  }, [variables]);

  const handleDeleteVariable = useCallback(
    (variable: Variable) => {
      if (!variable) return;
      setVariables((prev) => {
        const newValue = [...prev];
        const pos = variables.indexOf(variable);
        if (pos !== -1) {
          newValue.splice(pos, 1);
        }
        return newValue;
      });
    },
    [variables],
  );

  const variableInputs = useMemo(() => {
    refMap.current.clear();

    return variables.map((variable, index) => {
      const {name, value, defaultValue} = variable;
      const {
        name: refName,
        value: refValue,
        defaultValue: refDefaultValue,
      } = Object.keys(variable).reduce(
        (acc, key) => {
          acc[key as keyof Variable] = (el: HTMLInputElement) => {
            refMap.current.set(`${key}_${index}`, el);
          };
          return acc;
        },
        {} as Record<keyof Variable, (el: HTMLInputElement) => void>,
      );

      return (
        <Box py={1} key={variableIdMap.get(variable)} display="flex" alignItems="center">
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

  const handleClose = useCallback(
    (e: Event, reason: string) => {
      if (reason === 'backdropClick') return;
      onClose();
    },
    [onClose],
  );

  const getTemplate = useCallback(() => {
    const map = refMap.current;

    const name = refName.current?.value || '';
    const place = isNew ? path.join(folder.place, name) : refPlace.current?.value || '';

    const template: Template = {
      place,
      command: refCommand.current?.getValue() ?? '',
      label: refLabel.current?.value || '',
      group: refGroup.current?.value || '',
      name,
      id: refId.current?.value || '',
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
      isPty: refPty.current?.checked,
      isOnlyCombined: refOnlyCombined.current?.checked,
      isWriteLogs: refWriteLogs.current?.checked,
      isSingleInstance: refSingleInstance.current?.checked,
      isStartOnBoot: refStartOnBoot.current?.checked,
      ttl: parseInt(refTtl.current?.value ?? '0', 10),
    };
    return template;
  }, [variables, folder, isNew]);

  const handleSubmit = useCallback(
    async (e: SyntheticEvent) => {
      e.preventDefault();
      const newTemplate = getTemplate();
      const prevPlace = isNew ? '' : template.place;
      await onSubmit(prevPlace, newTemplate);
      onClose();
    },
    [isNew, getTemplate, onSubmit, onClose, template],
  );

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>{isNew ? 'Add template' : 'Edit template'}</DialogTitle>
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
          <CommandFieldAsync
            defaultValue={command}
            ref={refCommand as React.RefObject<CommandFieldRef>}
          />
          {isPtySupported && (
            <FormControlLabel
              sx={{my: 1}}
              label="Pseudo-terminal"
              control={<Checkbox size="small" inputRef={refPty} defaultChecked={isPty} />}
            />
          )}
          <FormControlLabel
            sx={{my: 1}}
            label="Combined output"
            control={
              <Checkbox size="small" inputRef={refOnlyCombined} defaultChecked={isOnlyCombined} />
            }
          />
          <FormControlLabel
            sx={{my: 1}}
            label="Write logs"
            control={<Checkbox size="small" inputRef={refWriteLogs} defaultChecked={isWriteLogs} />}
          />
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
            label="TTL after finish (seconds)"
            defaultValue={ttl ?? 0}
            inputProps={{ref: refTtl}}
            type="number"
            variant="outlined"
            InputLabelProps={{
              shrink: true,
            }}
          />
          <Box display="flex" flexDirection="row" gap={1} my={1}>
            <TextField
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
            <TextField
              size="small"
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
          <Box display="flex" flexDirection="row" gap={1} my={1}>
            <TextField
              size="small"
              label="Id"
              defaultValue={id || ''}
              inputProps={{ref: refId}}
              fullWidth
              type="text"
              variant="outlined"
              InputLabelProps={{
                shrink: true,
              }}
            />
            {!isNew && (
              <TextField
                size="small"
                label="Place"
                defaultValue={place || ''}
                inputProps={{ref: refPlace}}
                fullWidth
                type="text"
                variant="outlined"
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <ActionButton variant="contained" type="submit" onSubmit={handleSubmit}>
            Save
          </ActionButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default EditTemplateDialog;
