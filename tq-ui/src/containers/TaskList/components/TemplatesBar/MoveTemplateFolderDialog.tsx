import React, {FC, SyntheticEvent, useCallback, useRef} from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import {TemplateFolder} from '../../../../components/types';
import ActionButton from '../../../../components/ActionButton/ActionButton';

interface MoveTemplateFolderDialogProps {
  folder: TemplateFolder;
  open: boolean;
  onClose: () => void;
  onSubmit: (prevPlace: string, place: string) => Promise<void>;
}

const MoveTemplateFolderDialog: FC<MoveTemplateFolderDialogProps> = ({
  folder,
  open,
  onSubmit,
  onClose,
}) => {
  const {place} = folder;
  const refPlace = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(
    (e: Event, reason: string) => {
      if (reason === 'backdropClick') return;
      onClose();
    },
    [onClose],
  );

  const handleSubmit = useCallback(
    async (e: SyntheticEvent) => {
      e.preventDefault();
      const place = refPlace.current?.value || '';
      const prevPlace = folder.place;
      await onSubmit(prevPlace, place);
      onClose();
    },
    [onSubmit, onClose, folder],
  );

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>Rename folder</DialogTitle>
        <DialogContent>
          <TextField
            size="small"
            label="Place"
            sx={{my: 1}}
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

export default MoveTemplateFolderDialog;
