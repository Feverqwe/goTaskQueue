import {CacheProvider} from "@emotion/react";
import cache from "../tools/muiCache";
import {CssBaseline, GlobalStyles, ThemeProvider} from "@mui/material";
import theme from "../tools/muiTheme";
import * as React from "react";
import {FC, ReactNode} from "react";
import NotificationProvider from "./Notifications/NotificationProvider";

const RootStyles = {
  html: {
    height: '100%',
  },

  body: {
    height: '100%',
  },

  '#root': {
    height: '100%',
  }
};

interface PageProps {
  children: ReactNode;
}

const Page: FC<PageProps> = ({children}) => {
  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <NotificationProvider>
          <CssBaseline/>
          <GlobalStyles styles={RootStyles}/>
          {children}
        </NotificationProvider>
      </ThemeProvider>
    </CacheProvider>
  );
};

export default Page;
