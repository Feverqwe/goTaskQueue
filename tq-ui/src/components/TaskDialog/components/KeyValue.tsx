import React, {FC, useMemo} from 'react';
import {Box, SxProps, Theme, useTheme} from '@mui/material';
import {formatValue} from '../../../utils/formatValue';

interface KeyValueProps {
  name: string;
  value: string;
  type?: 'datetime';
  sx?: SxProps<Theme>;
}

const KeyValue: FC<KeyValueProps> = ({name, value, type, sx}) => {
  const theme = useTheme();

  const formattedValue = formatValue(value, type);

  const lineStyle = useMemo(
    () => ({borderBottom: `1px dotted  ${theme.palette.divider}`, flexGrow: 1, minWidth: '10%'}),
    [theme.palette.divider],
  );

  return (
    <Box display="flex" alignItems="baseline" sx={sx}>
      <span>{name}</span>
      <span style={lineStyle} />
      <span>{formattedValue ?? '–'}</span>
    </Box>
  );
};

export default KeyValue;
