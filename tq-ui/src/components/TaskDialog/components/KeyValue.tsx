import React, {FC, useMemo} from 'react';
import {Box, useTheme} from '@mui/material';
import {formatValue} from '../../../utils/formatValue';

interface KeyValueProps {
  name: string;
  value: string;
  type?: 'datetime';
}

const KeyValue: FC<KeyValueProps> = ({name, value, type}) => {
  const theme = useTheme();

  const formattedValue = formatValue(value, type);

  const lineStyle = useMemo(
    () => ({borderBottom: `1px dotted  ${theme.palette.divider}`, flexGrow: 1, minWidth: '10%'}),
    [theme.palette.divider],
  );

  return (
    <Box display="flex" alignItems="baseline">
      <span>{name}</span>
      <span style={lineStyle} />
      <span>{formattedValue ?? '–'}</span>
    </Box>
  );
};

export default KeyValue;
