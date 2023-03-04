import React, {FC, SyntheticEvent, useCallback, useRef, useState} from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  TextField,
} from '@mui/material';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import {Template, TemplateFolder, TemplateType} from '../../../RootStore/RootStoreProvider';

interface EditFolderDialogProps {
  folder: TemplateFolder;
  template: TemplateFolder;
  isNew?: boolean;
  isRoot?: boolean;
  open: boolean;
  onSubmit: (
    folder: TemplateFolder,
    prevTemplate: TemplateFolder | null,
    template: TemplateFolder,
  ) => void;
  onClose: () => void;
}

const EditFolderDialog: FC<EditFolderDialogProps> = ({
  folder,
  onClose,
  isNew,
  isRoot,
  template,
  onSubmit,
  open,
}) => {
  const {name} = template;
  const refName = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState(() => [...template.templates]);

  const handleSubmit = useCallback(
    async (e: SyntheticEvent) => {
      e.preventDefault();
      const newTemplate: TemplateFolder = {
        type: TemplateType.Folder,
        name: refName.current?.value || '',
        templates,
      };
      await onSubmit(folder, isNew ? null : template, newTemplate);
      onClose();
    },
    [isNew, onSubmit, onClose, folder, template, templates],
  );

  const handleClose = useCallback(
    (e: Event, reason: string) => {
      if (reason === 'backdropClick') return;
      onClose();
    },
    [onClose],
  );

  const handleUp = useCallback(
    (template: Template) => {
      const newTemplates = [...templates];
      const pos = newTemplates.indexOf(template);
      if (pos === -1) {
        throw new Error('template not found');
      }
      if (pos === 0) return;
      newTemplates.splice(pos, 1);
      newTemplates.splice(pos - 1, 0, template);
      setTemplates(newTemplates);
    },
    [templates],
  );

  const handleDown = useCallback(
    (template: Template) => {
      const newTemplates = [...templates];
      const pos = newTemplates.indexOf(template);
      if (pos === -1) {
        throw new Error('template not found');
      }
      if (pos === newTemplates.length - 1) return;
      newTemplates.splice(pos, 1);
      newTemplates.splice(pos + 1, 0, template);
      setTemplates(newTemplates);
    },
    [templates],
  );

  return (
    <Dialog open={open} onClose={handleClose} fullWidth>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>{isNew ? 'Add folder' : 'Edit folder'}</DialogTitle>
        <DialogContent>
          {!isRoot && (
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
          )}
          <List>
            {templates.map((template, index) => {
              const {name} = template;
              return (
                <ListItem
                  key={index}
                  secondaryAction={
                    <>
                      <IconButton title="Up" onClick={handleUp.bind(null, template)}>
                        <ArrowDropUpIcon />
                      </IconButton>
                      <IconButton title="Down" onClick={handleDown.bind(null, template)}>
                        <ArrowDropDownIcon />
                      </IconButton>
                    </>
                  }
                >
                  {name}
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="contained" type="submit">
            Save
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default EditFolderDialog;
