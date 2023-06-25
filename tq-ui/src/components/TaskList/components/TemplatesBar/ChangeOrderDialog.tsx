import React, { FC, SyntheticEvent, useCallback, useContext, useState } from 'react';
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
} from '@mui/material';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { RawTemplate, TemplateFolder } from '../../../types';
import ActionButton from '../../../ActionButton/ActionButton';
import { TemplatesCtx } from '../../../TemplateProvider/TemplatesCtx';

interface EditFolderDialogProps {
  open: boolean;
  onSubmit: (
    folder: TemplateFolder,
  ) => void;
  onClose: () => void;
}

const EditFolderDialog: FC<EditFolderDialogProps> = ({
  onClose,
  onSubmit,
  open,
}) => {
  const {templates: origTemplates} = useContext(TemplatesCtx);
  const [templates, setTemplates] = useState(() => [...origTemplates]);

  const handleSubmit = useCallback(
    async (e: SyntheticEvent) => {
      /* e.preventDefault();
      const newTemplate: TemplateFolder = {
        type: TemplateType.Folder,
        name: refName.current?.value || '',
        templates,
      };
      await onSubmit(folder, isNew ? null : template, newTemplate);
      onClose(); */
    },
    [onSubmit, onClose, templates],
  );

  const handleClose = useCallback(
    (e: Event, reason: string) => {
      if (reason === 'backdropClick') return;
      onClose();
    },
    [onClose],
  );

  const handleUp = useCallback(
    (template: RawTemplate) => {
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
    (template: RawTemplate) => {
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
        <DialogTitle>Change order</DialogTitle>
        <DialogContent>
          <List>
            {templates.map((template) => {
              const {place} = template;
              return (
                <ListItem
                  key={place}
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
                  {place}
                </ListItem>
              );
            })}
          </List>
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

export default EditFolderDialog;
