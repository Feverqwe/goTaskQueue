import React, {FC} from 'react';
import {Box, SxProps, Theme, Typography} from '@mui/material';
import {formatValue} from '../../../utils/formatValue';
import {DATA_LABEL_SX, DATA_VALUE_SX} from '../../DataValue/styles';

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
      <Typography variant="caption" color="text.disabled" component="div" sx={DATA_LABEL_SX}>
        {name}
      </Typography>
      <Typography
        variant="body2"
        component="div"
        title={String(displayValue)}
        sx={[
          DATA_VALUE_SX,
          {
            mt: 0.5,
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        ]}
      >
        {displayValue}
      </Typography>
    </Box>
  );
};

export default KeyValue;
