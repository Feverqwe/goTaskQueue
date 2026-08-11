import React, {FC, useCallback, useState} from 'react';
import {Box} from '@mui/material';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableTemplateOrderItem from './SortableTemplateOrderItem';
import TemplateOrderItem from './TemplateOrderItem';

interface TemplateOrderListProps {
  places: string[];
  onChange: (places: string[]) => void;
}

const TemplateOrderList: FC<TemplateOrderListProps> = ({places, onChange}) => {
  const [activePlace, setActivePlace] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 6}}),
    useSensor(TouchSensor, {activationConstraint: {delay: 180, tolerance: 5}}),
    useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
  );

  const handleDragStart = useCallback(({active}: DragStartEvent) => {
    setActivePlace(String(active.id));
  }, []);

  const handleDragEnd = useCallback(
    ({active, over}: DragEndEvent) => {
      setActivePlace(null);
      if (!over || active.id === over.id) return;

      const from = places.indexOf(String(active.id));
      const to = places.indexOf(String(over.id));
      if (from !== -1 && to !== -1) {
        onChange(arrayMove(places, from, to));
      }
    },
    [onChange, places],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={() => setActivePlace(null)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={places} strategy={verticalListSortingStrategy}>
        <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.75}}>
          {places.map((place) => (
            <SortableTemplateOrderItem key={place} place={place} />
          ))}
        </Box>
      </SortableContext>
      <DragOverlay>{activePlace && <TemplateOrderItem overlay place={activePlace} />}</DragOverlay>
    </DndContext>
  );
};

export default TemplateOrderList;
