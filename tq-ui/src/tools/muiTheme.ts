import {createTheme} from '@mui/material';

const theme = createTheme({
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiButtonGroup: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          padding: '3px 15px',
          fontSize: '16px',
        },
      },
    },
  },
  palette: {
    mode: 'dark',
    ...{
      text: {
        primary: '#DFE1E5',
        secondary: 'rgba(255, 255, 255, 0.7)',
        disabled: 'rgba(255, 255, 255, 0.5)',
      },
      action: {
        active: '#DFE1E5',
        hover: 'rgba(255, 255, 255, 0.08)',
        selected: 'rgba(255, 255, 255, 0.16)',
        disabled: 'rgba(255, 255, 255, 0.3)',
        disabledBackground: 'rgba(255, 255, 255, 0.12)',
      },
      background: {
        default: '#1E1F22',
        paper: '#2B2D30',
      },
      divider: '#313438',
    },
  },
});

export default theme;
