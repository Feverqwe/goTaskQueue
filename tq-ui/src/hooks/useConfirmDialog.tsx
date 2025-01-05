import React, {useCallback, useMemo, useState} from 'react';
import ConfirmDialog, {ConfirmDialogProps} from '../components/ConfirmDialog';

export type UseConfirmDialogProps = Pick<ConfirmDialogProps, 'title' | 'message' | 'onSubmit'>;

export const useConfirmDialog = ({onSubmit, title, message}: UseConfirmDialogProps) => {
  const [isOpen, setOpen] = useState(false);

  const onConfirmSubmit = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const confirmNode = useMemo(() => {
    return isOpen ? (
      <ConfirmDialog
        title={title}
        message={message}
        open={isOpen}
        onClose={handleClose}
        onSubmit={onSubmit}
      />
    ) : null;
  }, [handleClose, onSubmit, isOpen, title, message]);

  return {onConfirmSubmit, confirmNode};
};
