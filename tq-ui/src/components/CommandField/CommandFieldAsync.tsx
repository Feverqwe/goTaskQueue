import React, {FC, FunctionComponent, useEffect, useRef, useState} from 'react';
import {Box, CircularProgress, Typography} from '@mui/material';
import type {CommandFieldProps} from './CommandField';

export const CommandFieldLoading: FC = () => (
  <Box
    role="status"
    aria-label="Loading command editor"
    sx={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1.5,
      bgcolor: '#1e1e1e',
    }}
  >
    <CircularProgress size={24} />
    <Typography variant="caption" color="text.secondary">
      Loading editor…
    </Typography>
  </Box>
);

const CommandFieldAsync: FC<CommandFieldProps> = (props) => {
  const {ref, defaultValue} = props;
  const [isLoading, setLoading] = useState(true);
  const refComponent = useRef<FunctionComponent<CommandFieldProps>>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      import('./CommandField').then(({default: cmp}) => {
        if (!mounted) return;
        refComponent.current = cmp;
        setLoading(false);
      });
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (ref && !ref.current) {
    ref.current = {
      getValue: () => defaultValue ?? '',
    };
  }

  if (isLoading) {
    return <CommandFieldLoading />;
  }

  const Component = refComponent.current;

  if (!Component) {
    return null;
  }

  return React.createElement(Component, props);
};

export default CommandFieldAsync;
