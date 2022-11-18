import React, {FC, ReactNode, useCallback, useContext, useState} from 'react';
import {ThemeProvider} from '@mui/material';
import {ThemeSwitchCtx} from './ThemeSwitchCtx';
import {RootStoreCtx} from '../RootStore/RootStoreCtx';
import {DefaultTheme, nameTheme, ThemeName, themes} from '../../constants';

interface ThemePaletteProviderProps {
  children: ReactNode;
}

const ThemePaletteProvider: FC<ThemePaletteProviderProps> = ({children}) => {
  const {theme: initTheme} = useContext(RootStoreCtx);
  const [theme, setTheme] = useState<ThemeName>(initTheme);

  const handleSwitch = useCallback(() => {
    let pos = themes.indexOf(theme);
    console.log(pos, themes[pos], theme);
    if (pos === -1) {
      pos = 0;
    } else {
      pos += 1;
    }
    if (pos === themes.length) {
      pos = 0;
    }
    console.log(pos, themes[pos]);
    setTheme(themes[pos]);
  }, [theme]);

  console.log(theme);

  return (
    <ThemeSwitchCtx.Provider value={handleSwitch}>
      <ThemeProvider theme={nameTheme[theme] || DefaultTheme}>
        {children}
      </ThemeProvider>
    </ThemeSwitchCtx.Provider>
  );
};

export default ThemePaletteProvider;
