import {CacheProvider} from '@emotion/react';
import {CssBaseline, GlobalStyles} from '@mui/material';
import * as React from 'react';
import {FC, ReactNode} from 'react';
import cache from '../tools/muiCache';
import NotificationProvider from './Notifications/NotificationProvider';
import ThemePaletteProvider from './ThemePaletteProvider/ThemePaletteProvider';

const RootStyles = {
  html: {
    height: '100%',
  },

  body: {
    height: '100%',
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
      <ThemePaletteProvider>
        <NotificationProvider>
          <CssBaseline />
          <GlobalStyles styles={RootStyles} />
          {children}
        </NotificationProvider>
      </ThemePaletteProvider>
    </CacheProvider>
  );
};

export default Page;
