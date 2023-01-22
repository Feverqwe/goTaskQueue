import React, {FC, useCallback, useContext} from 'react';
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem} from '@mui/material';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import {Template, TemplateFolder, TemplateType} from '../../RootStore/RootStoreProvider';
import {TemplatesCtx} from '../../TemplateProvider/TemplatesCtx';

interface MoveTemplateDialogProps {
  folder: TemplateFolder;
  template: Template;
  onClose: () => void;
  onSubmit: (folder: TemplateFolder, template: Template, targetTemplate: TemplateFolder) => void;
  open: boolean;
}

const MoveTemplateDialog: FC<MoveTemplateDialogProps> = ({folder, onSubmit, onClose, open, template}) => {
  const rootFolder = useContext(TemplatesCtx);

  const handleMove = useCallback(async (targetTemplate: TemplateFolder) => {
    await onSubmit(folder, template, targetTemplate);
    onClose();
  }, [folder, template, onClose, onSubmit]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>
        Order
      </DialogTitle>
      <DialogContent>
        <List>
          {getFolders(rootFolder, folder).map(({name, folder: subTemplate}, index) => {
            if (subTemplate === template) {
              return null;
            }
            return (
              <ListItem
                key={index}
                secondaryAction={(
                  <IconButton
                    edge="end"
                    title="Move"
                    onClick={handleMove.bind(null, subTemplate)}
                  >
                    <DriveFileMoveIcon />
                  </IconButton>
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
      </DialogActions>
    </Dialog>
  );
};

function getFolders(rootFolder: TemplateFolder, folder: TemplateFolder) {
  const result: {name: string, folder: TemplateFolder}[] = [];
  if (rootFolder !== folder) {
    result.push({
      name: 'Root',
      folder: rootFolder,
    });
  }
  const next = (template: TemplateFolder, place: string) => {
    template.templates.forEach((template) => {
      const {name} = template;
      if (template.type === TemplateType.Folder) {
        if (template !== folder) {
          result.push({
            name: `${place}${place && '/'}${name}`,
            folder: template,
          });
        }
        next(template, `${place}${place && '/'}${name}`);
      }
    });
  };
  next(rootFolder, '');
  return result;
}

export default MoveTemplateDialog;
