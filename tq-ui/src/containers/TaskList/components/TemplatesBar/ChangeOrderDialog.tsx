import React, {FC, SyntheticEvent, useCallback, useContext, useMemo, useState} from 'react';
import {
  Box,
  Button,
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
import {
  DIALOG_ACTIONS_SX,
  DIALOG_CLOSE_BUTTON_SX,
  DIALOG_CONTENT_SX,
  DIALOG_PANEL_PADDING,
  DIALOG_TITLE_ROW_SX,
  DIALOG_TITLE_SX,
} from '../../../../components/DialogTabs/layout';
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
        <DialogTitle id="template-order-title" sx={DIALOG_TITLE_SX}>
          <Box sx={DIALOG_TITLE_ROW_SX}>
            <Typography variant="subtitle1" sx={{minWidth: 0, flexGrow: 1, fontWeight: 600}}>
              Template order
            </Typography>
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="Close"
              sx={DIALOG_CLOSE_BUTTON_SX}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={DIALOG_CONTENT_SX}>
          <Box sx={{p: DIALOG_PANEL_PADDING}}>
            <TemplateOrderList places={places} onChange={setPlaces} />
          </Box>
        </DialogContent>

        <DialogActions sx={[DIALOG_ACTIONS_SX, {gap: 0.5}]}>
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
