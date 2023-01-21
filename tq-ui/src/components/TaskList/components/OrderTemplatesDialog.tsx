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
import {TemplatesCtx} from '../../TemplateProvider/TemplatesCtx';
import {Template} from '../../RootStore/RootStoreProvider';
import {TemplatesUpdateCtx} from '../../TemplateProvider/TemplatesUpdateCtx';

interface OrderTemplatesDialogProps {
  onClose: () => void;
}

const OrderTemplatesDialog: FC<OrderTemplatesDialogProps> = ({onClose}) => {
  const initTemplates = useContext(TemplatesCtx);
  const updateTemplates = useContext(TemplatesUpdateCtx);
  const [templates, setTemplates] = useState(() => [...initTemplates]);

  const handleSubmit = useCallback(async (e: SyntheticEvent) => {
    e.preventDefault();
    await updateTemplates(templates);
    onClose();
  }, [onClose, updateTemplates, templates]);

  const handleClose = useCallback((e: Event, reason: string) => {
    if (reason === 'backdropClick') return;
    onClose();
  }, [onClose]);

  const handleUp = useCallback((template: Template) => {
    const newTemplates = [...templates];
    const pos = newTemplates.indexOf(template);
    if (pos === -1) {
      throw new Error('template not found');
    }
    if (pos === 0) return;
    newTemplates.splice(pos, 1);
    newTemplates.splice(pos - 1, 0, template);
    setTemplates(newTemplates);
  }, [templates]);

  const handleDown = useCallback((template: Template) => {
    const newTemplates = [...templates];
    const pos = newTemplates.indexOf(template);
    if (pos === -1) {
      throw new Error('template not found');
    }
    if (pos === newTemplates.length - 1) return;
    newTemplates.splice(pos, 1);
    newTemplates.splice(pos + 1, 0, template);
    setTemplates(newTemplates);
  }, [templates]);

  return (
    <Dialog open={true} onClose={handleClose} fullWidth>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>
          Order
        </DialogTitle>
        <DialogContent>
          <List>
            {templates.map((template, index) => {
              const {name} = template;
              return (
                <ListItem
                  key={index}
                  secondaryAction={(
                    <>
                      <IconButton
                        title="Up"
                        onClick={handleUp.bind(null, template)}
                      >
                        <ArrowDropUpIcon />
                      </IconButton>
                      <IconButton
                        title="Down"
                        onClick={handleDown.bind(null, template)}
                      >
                        <ArrowDropDownIcon />
                      </IconButton>
                    </>
                  )}
                >
                  {name}
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <Button variant="contained" type="submit">Save</Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default OrderTemplatesDialog;
