import React, {FC, SyntheticEvent, useCallback, useRef} from 'react';
import {Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField} from '@mui/material';
import {TemplateFolder, TemplateType} from '../../RootStore/RootStoreProvider';

interface EditFolderDialogProps {
  folder: TemplateFolder,
  template: TemplateFolder,
  isNew?: boolean;
  open: boolean;
  onSubmit: (folder: TemplateFolder, prevTemplate: TemplateFolder | null, template: TemplateFolder) => void;
  onClose: () => void;
}

const EditFolderDialog: FC<EditFolderDialogProps> = ({folder, onClose, isNew, template, onSubmit, open}) => {
  const {name} = template;
  const refName = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    const newTemplate: TemplateFolder = {
      type: TemplateType.Folder,
      name: refName.current?.value || '',
      templates: [],
    };
    await onSubmit(folder, isNew ? null : template, newTemplate);
    onClose();
  }, [isNew, onSubmit, onClose, folder, template]);

  const handleClose = useCallback((e: Event, reason: string) => {
    if (reason === 'backdropClick') return;
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>
          {isNew ? 'Add folder' : 'Edit folder'}
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
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <Button variant="contained" type="submit">Save</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default EditFolderDialog;
