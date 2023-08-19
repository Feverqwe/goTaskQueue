import React, {FC, SyntheticEvent, useCallback, useContext, useState} from 'react';
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
import {RawTemplate} from '../../../../components/types';
import ActionButton from '../../../../components/ActionButton/ActionButton';
import {TemplatesCtx} from '../../../../components/TemplateProvider/TemplatesCtx';

interface ChangeOrderDialogProps {
  open: boolean;
  onSubmit: (templateOrder: string[]) => void;
  onClose: () => void;
}

const ChangeOrderDialog: FC<ChangeOrderDialogProps> = ({onClose, onSubmit, open}) => {
  const {templates: origTemplates, templateOrder} = useContext(TemplatesCtx);
  const [templates, setTemplates] = useState(() => {
    const newTemplates = [...origTemplates];
    newTemplates.sort(({place: a}, {place: b}) => {
      const ap = templateOrder.indexOf(a);
      const bp = templateOrder.indexOf(b);
      return ap > bp ? 1 : -1;
    });
    return newTemplates;
  });

  const handleSubmit = useCallback(
    async (e: SyntheticEvent) => {
      e.preventDefault();
      await onSubmit(templates.map(({place}) => place));
      onClose();
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

export default ChangeOrderDialog;
