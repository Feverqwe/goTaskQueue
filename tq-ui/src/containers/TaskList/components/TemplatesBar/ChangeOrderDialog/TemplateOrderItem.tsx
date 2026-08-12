import React, {FC} from 'react';
import {Box, IconButton, Paper, Typography} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface TemplateOrderItemProps {
  place: string;
  overlay?: boolean;
  dragHandleProps?: object;
}

const TemplateOrderItem: FC<TemplateOrderItemProps> = ({
  place,
  overlay = false,
  dragHandleProps,
}) => (
  <Paper
    variant="outlined"
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      minHeight: 48,
      px: {xs: 1, sm: 1.25},
      py: 0.5,
      borderColor: overlay ? 'primary.main' : undefined,
      bgcolor: overlay ? 'action.selected' : 'background.paper',
      boxShadow: overlay ? 6 : undefined,
      cursor: overlay ? 'grabbing' : 'default',
    }}
  >
    <Typography variant="body2" noWrap sx={{minWidth: 0, flexGrow: 1}}>
      {place}
    </Typography>
    {overlay ? (
      <Box
        aria-hidden="true"
        sx={{display: 'inline-flex', flexShrink: 0, p: '5px', color: 'primary.light'}}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>
    ) : (
      <IconButton
        {...dragHandleProps}
        size="small"
        aria-label={`Drag ${place}`}
        title="Drag to reorder"
        sx={{
          flexShrink: 0,
          cursor: 'grab',
          touchAction: 'none',
          color: 'text.secondary',
          '&:active': {cursor: 'grabbing'},
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </IconButton>
    )}
  </Paper>
);

export default TemplateOrderItem;
