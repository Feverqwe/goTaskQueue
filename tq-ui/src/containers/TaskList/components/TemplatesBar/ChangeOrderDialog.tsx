import React, {FC, SyntheticEvent, useCallback, useContext, useMemo, useState} from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ActionButton from '../../../../components/ActionButton/ActionButton';
import {TemplatesCtx} from '../../../../components/TemplateProvider/TemplatesCtx';
import TemplateOrderList from './ChangeOrderDialog/TemplateOrderList';
import {getOrderedTemplatePlaces} from './ChangeOrderDialog/utils';

interface ChangeOrderDialogProps {
  open: boolean;
  onSubmit: (templateOrder: string[]) => Promise<void>;
  onClose: () => void;
}

const ChangeOrderDialog: FC<ChangeOrderDialogProps> = ({onClose, onSubmit, open}) => {
  const {templates, templateOrder} = useContext(TemplatesCtx);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const initialPlaces = useMemo(
    () => getOrderedTemplatePlaces(templates, templateOrder),
    [templates, templateOrder],
  );
  const [places, setPlaces] = useState(initialPlaces);
  const hasChanges = useMemo(
    () => places.some((place, index) => place !== initialPlaces[index]),
    [initialPlaces, places],
  );

  const handleSubmit = useCallback(
    async (event: SyntheticEvent) => {
      event.preventDefault();
      await onSubmit(places);
      onClose();
    },
    [onSubmit, onClose, places],
  );

  const handleClose = useCallback(
    (_event: object, reason: 'backdropClick' | 'escapeKeyDown') => {
      if (reason === 'backdropClick') return;
      onClose();
    },
    [onClose],
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      fullScreen={isMobile}
      maxWidth="sm"
      scroll="paper"
      aria-labelledby="template-order-title"
    >
      <Box component="form" onSubmit={handleSubmit} sx={{display: 'contents'}}>
        <DialogTitle id="template-order-title" sx={{px: {xs: 1.5, sm: 2}, py: 1}}>
          <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minHeight: 30}}>
            <Box sx={{minWidth: 0, flexGrow: 1}}>
              <Typography variant="subtitle1" sx={{fontWeight: 600}}>
                Template order
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                Arrange templates as they should appear in the task bar
              </Typography>
            </Box>
            <Chip size="small" variant="outlined" label={places.length} sx={{height: 24}} />
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            p: {xs: 1.5, sm: 2},
            bgcolor: 'background.default',
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{mb: 1.5}}>
            Drag by the handle. With a keyboard, focus a handle, press Space, then use the arrow
            keys.
          </Typography>
          <TemplateOrderList places={places} onChange={setPlaces} />
        </DialogContent>

        <DialogActions sx={{px: {xs: 1.5, sm: 2}, py: 1, gap: 0.5}}>
          <Button size="small" variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <ActionButton
            size="small"
            variant="contained"
            type="submit"
            disabled={!hasChanges}
            onSubmit={handleSubmit}
          >
            Save order
          </ActionButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default ChangeOrderDialog;
