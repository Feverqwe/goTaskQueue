import {CacheProvider} from '@emotion/react';
import {CssBaseline, GlobalStyles, ThemeProvider} from '@mui/material';
import * as React from 'react';
import {FC, ReactNode} from 'react';
import theme from '../tools/muiTheme';
import cache from '../tools/muiCache';

const RootStyles = {
  html: {
    height: '100%',
  },

  body: {
    height: '100%',

    '&.task-page': {
      overscrollBehavior: 'contain',
    },
  },

  '#root': {
    height: '100%',
  },
};

interface PageProps {
  children: ReactNode;
}

const Page: FC<PageProps> = ({children}) => {
  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles styles={RootStyles} />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
};

export default Page;
