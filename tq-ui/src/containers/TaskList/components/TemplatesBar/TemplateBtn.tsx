import React, {FC, SyntheticEvent, useCallback, useState} from 'react';
import {Divider} from '@mui/material';
import {TemplateButton, TemplateFolder} from '../../../../components/types';
import DialogMenu from '../../../../components/DialogMenu/DialogMenu';
import DialogMenuItem from '../../../../components/DialogMenu/DialogMenuItem';
import {useConfirmDialog} from '../../../../hooks/useConfirmDialog';
import ActionButton from '../../../../components/ActionButton/ActionButton';

export interface TemplateBtnProps {
  folder: TemplateFolder;
  template: TemplateButton;
  onClick: (e: SyntheticEvent, template: TemplateButton, as?: boolean) => Promise<void>;
  onEdit: (folder: TemplateFolder, template: TemplateButton) => void;
  onDelete: (template: TemplateButton) => Promise<void>;
  onClone: (folder: TemplateFolder, template: TemplateButton) => Promise<void>;
}

const TemplateBtn: FC<TemplateBtnProps> = ({
  folder,
  template,
  onClick,
  onEdit,
  onDelete,
  onClone,
}) => {
  const {name} = template;
  const [showMenu, setShowMenu] = useState(false);

  const handleClick = useCallback(
    async (e: SyntheticEvent) => {
      await onClick(e, template);
    },
    [template, onClick],
  );

  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  const handleRunAs = useCallback(
    async (e: SyntheticEvent) => {
      await onClick(e, template, true);
      handleCloseMenu();
    },
    [template, onClick, handleCloseMenu],
  );

  const handleEdit = useCallback(() => {
    onEdit(folder, template);
    handleCloseMenu();
  }, [folder, template, onEdit, handleCloseMenu]);

  const handleDelete = useCallback(async () => {
    await onDelete(template);
    handleCloseMenu();
  }, [template, onDelete, handleCloseMenu]);

  const {onConfirmSubmit: handleConfirmDelete, confirmNode: deleteConfirmNode} = useConfirmDialog({
    onSubmit: handleDelete,
    title: 'Delete template?',
  });

  const handleClone = useCallback(async () => {
    await onClone(folder, template);
    handleCloseMenu();
  }, [folder, template, onClone, handleCloseMenu]);

  const {onConfirmSubmit: handleConfirmClone, confirmNode: cloneConfirmNode} = useConfirmDialog({
    onSubmit: handleClone,
    title: 'Clone template?',
  });

  const handleCtxMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    setShowMenu(true);
  }, []);

  return (
    <>
      <ActionButton
        sx={{m: 1, mt: 0, flexGrow: {xs: 1, sm: 0}}}
        variant="outlined"
        onSubmit={handleClick}
        onContextMenu={handleCtxMenu}
      >
        {name}
      </ActionButton>
      <DialogMenu open={showMenu} onClose={handleCloseMenu} title={name}>
        {!template.variables.length && (
          <>
            <DialogMenuItem onClick={handleRunAs}>Run as</DialogMenuItem>
            <Divider />
          </>
        )}
        <DialogMenuItem onClick={handleEdit}>Edit</DialogMenuItem>
        <DialogMenuItem onClick={handleConfirmClone}>Clone</DialogMenuItem>
        <Divider />
        <DialogMenuItem onClick={handleConfirmDelete}>Delete</DialogMenuItem>
      </DialogMenu>
      {cloneConfirmNode}
      {deleteConfirmNode}
    </>
  );
};

export default TemplateBtn;
