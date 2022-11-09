import {createTheme} from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'dark',
    ...{
      text: {
        primary: '#fff',
        secondary: 'rgba(255, 255, 255, 0.7)',
        disabled: 'rgba(255, 255, 255, 0.5)',
      },
      action: {
        active: '#fff',
        hover: 'rgba(255, 255, 255, 0.08)',
        selected: 'rgba(255, 255, 255, 0.16)',
        disabled: 'rgba(255, 255, 255, 0.3)',
        disabledBackground: 'rgba(255, 255, 255, 0.12)',
      },
      background: {
        default: '#303030',
        paper: '#424242',
      },
      divider: 'rgba(255, 255, 255, 0.12)',
    },
  },
});

export default theme;
