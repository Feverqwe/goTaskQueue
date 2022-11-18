import {
  amber,
  blue,
  blueGrey,
  brown,
  cyan,
  deepOrange,
  deepPurple,
  green,
  grey,
  indigo,
  lightBlue,
  lightGreen,
  lime,
  orange,
  pink,
  purple,
  red,
  teal,
  yellow,
} from '@mui/material/colors';
import {ThemeProviderProps} from '@mui/material/styles/ThemeProvider';
import defTheme from './tools/muiTheme';
import {createTheme} from "@mui/material";
import {ColorPartial} from "@mui/material/styles/createPalette";

const nameColor: Record<string, ColorPartial> = {
  amber,
  blue,
  blueGrey,
  brown,
  cyan,
  deepOrange,
  deepPurple,
  green,
  grey,
  indigo,
  lightBlue,
  lightGreen,
  lime,
  orange,
  pink,
  purple,
  red,
  teal,
  yellow,
};

const keyTheme: Record<string, ThemeProviderProps["theme"]> = {
  defTheme,
};

const colorKeys = Object.keys(nameColor) as (keyof typeof nameColor)[];

colorKeys.forEach((secondary) => {
  colorKeys.forEach((primary) => {
    const key = `${primary}+${secondary};`
    keyTheme[key] = createTheme({
      palette: {
        mode: 'dark',
        primary: nameColor[primary],
        secondary: nameColor[secondary],
      },
    });
  });
});

export type ThemeName = keyof typeof keyTheme;

export type Themes = ThemeName[];
export const themes = Object.keys(keyTheme) as Themes;

export type NameTheme = Record<Themes[number], ThemeProviderProps['theme']>;
export const nameTheme = keyTheme as NameTheme;

export const DefaultTheme = keyTheme.defTheme;
