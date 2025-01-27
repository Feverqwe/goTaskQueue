import React, {FC, FunctionComponent, useEffect, useRef, useState} from 'react';
import {Box, CircularProgress} from '@mui/material';
import {CommandFieldProps} from './CommandField';

const CommandFieldAsync: FC<CommandFieldProps> = (props) => {
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

  if (isLoading) {
    return (
      <Box>
        <CircularProgress />
      </Box>
    );
  }

  const Component = refComponent.current;

  if (!Component) {
    return null;
  }

  return React.createElement(Component, props);
};

export default CommandFieldAsync;
