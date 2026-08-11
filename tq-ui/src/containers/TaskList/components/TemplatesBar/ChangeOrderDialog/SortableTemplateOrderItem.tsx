import React, {FC} from 'react';
import {Box} from '@mui/material';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import TemplateOrderItem from './TemplateOrderItem';

interface SortableTemplateOrderItemProps {
  place: string;
}

const SortableTemplateOrderItem: FC<SortableTemplateOrderItemProps> = ({place}) => {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: place,
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        opacity: isDragging ? 0.28 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 1 : 0,
      }}
    >
      <TemplateOrderItem place={place} dragHandleProps={{...attributes, ...listeners}} />
    </Box>
  );
};

export default SortableTemplateOrderItem;
