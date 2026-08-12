import React, {FC} from 'react';
import {Box, SxProps, Theme, Typography} from '@mui/material';
import {formatValue} from '../../../utils/formatValue';

interface KeyValueProps {
  name: string;
  value: string;
  type?: 'datetime';
  sx?: SxProps<Theme>;
}

const KeyValue: FC<KeyValueProps> = ({name, value, type, sx}) => {
  const formattedValue = formatValue(value, type);
  const displayValue = formattedValue ?? '–';

  return (
    <Box
      sx={[
        {
          minWidth: 0,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Typography
        variant="caption"
        color="text.disabled"
        component="div"
        sx={{fontSize: '0.6875rem', lineHeight: 1.35}}
      >
        {name}
      </Typography>
      <Typography
        variant="body2"
        component="div"
        title={String(displayValue)}
        sx={{
          mt: 0.5,
          color: 'text.primary',
          lineHeight: 1.35,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {displayValue}
      </Typography>
    </Box>
  );
};

export default KeyValue;
