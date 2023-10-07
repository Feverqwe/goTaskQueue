import React, {FC, useMemo} from 'react';
import {Box, SxProps, useTheme} from '@mui/material';
import {getDatetimeFormatter} from '../../../utils/common';

interface KeyValueProps {
  name: string;
  value: string;
  type?: 'datetime';
  sx?: SxProps;
}

const KeyValue: FC<KeyValueProps> = ({name, value, type, sx}) => {
  const theme = useTheme();

  let formattedValue;
  switch (type) {
    case 'datetime': {
      formattedValue = getDatetimeFormatter().format(new Date(value));
      break;
    }
    default: {
      formattedValue = value;
    }
  }

  const lineStyle = useMemo(
    () => ({borderBottom: `1px dotted  ${theme.palette.divider}`, flexGrow: 1, minWidth: '10%'}),
    [theme.palette.divider],
  );

  return (
    <Box sx={sx} display="flex" alignItems="baseline">
      <span>{name}</span>
      <span style={lineStyle} />
      <span>{formattedValue ?? '–'}</span>
    </Box>
  );
};

export default KeyValue;
