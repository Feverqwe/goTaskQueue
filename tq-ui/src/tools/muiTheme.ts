import {alpha, createTheme} from '@mui/material/styles';

const colors = {
  canvas: '#181b20',
  panel: '#252930',
  raised: '#30353d',
  line: '#49515c',
  muted: '#b2b9c2',
  text: '#f2f4f7',
  success: '#75c997',
  warning: '#d6b46c',
  error: '#e27685',
  info: '#7eb2d3',
};

const uiFont = ['Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(',');

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#d5dae0',
      light: colors.text,
      dark: '#8e96a0',
      contrastText: colors.canvas,
    },
    secondary: {
      main: '#9da5af',
      light: '#c3c9d0',
      dark: '#69717c',
      contrastText: colors.canvas,
    },
    success: {
      main: colors.success,
      dark: '#4f9d73',
      contrastText: colors.canvas,
    },
    warning: {
      main: colors.warning,
      dark: '#a88642',
      contrastText: colors.canvas,
    },
    error: {
      main: colors.error,
      dark: '#b24f60',
      contrastText: colors.canvas,
    },
    info: {
      main: colors.info,
      dark: '#5786a5',
      contrastText: colors.canvas,
    },
    text: {
      primary: colors.text,
      secondary: colors.muted,
      disabled: alpha(colors.muted, 0.58),
    },
    action: {
      active: colors.muted,
      hover: alpha(colors.text, 0.07),
      selected: alpha(colors.text, 0.12),
      disabled: alpha(colors.muted, 0.42),
      disabledBackground: alpha(colors.muted, 0.09),
      focus: alpha(colors.text, 0.16),
    },
    background: {
      default: colors.canvas,
      paper: colors.panel,
    },
    divider: colors.line,
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: uiFont,
    button: {
      textTransform: 'none',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          colorScheme: 'dark',
        },
        '::selection': {
          backgroundColor: alpha(colors.text, 0.22),
          color: colors.text,
        },
        body: {
          backgroundColor: colors.canvas,
          scrollbarColor: `${alpha(colors.muted, 0.36)} transparent`,
        },
        '*': {
          scrollbarWidth: 'thin',
        },
        '*::-webkit-scrollbar': {
          width: 8,
          height: 8,
        },
        '*::-webkit-scrollbar-thumb': {
          border: '2px solid transparent',
          borderRadius: 999,
          background: alpha(colors.muted, 0.34),
          backgroundClip: 'padding-box',
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outline: `2px solid ${alpha(colors.text, 0.82)}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          padding: '3px 15px',
          borderRadius: 8,
          fontSize: '1rem',
        },
        contained: {
          backgroundColor: colors.text,
          backgroundImage: 'none',
          color: colors.canvas,
          boxShadow: `0 4px 12px ${alpha('#000000', 0.18)}`,
          '&:hover': {
            backgroundColor: '#ffffff',
            backgroundImage: 'none',
            boxShadow: `0 5px 15px ${alpha('#000000', 0.24)}`,
          },
          '&.Mui-disabled': {
            backgroundImage: 'none',
          },
        },
        outlined: {
          borderColor: colors.line,
          backgroundColor: colors.raised,
          '&:hover': {
            borderColor: colors.muted,
            backgroundColor: '#373c45',
          },
        },
        text: {
          '&:hover': {
            backgroundColor: alpha(colors.text, 0.07),
          },
        },
      },
    },
    MuiButtonGroup: {
      styleOverrides: {
        grouped: {
          borderColor: `${colors.line} !important`,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          color: colors.muted,
          transition: 'background-color 140ms ease, color 140ms ease, transform 140ms ease',
          '&:hover': {
            color: colors.text,
            backgroundColor: alpha(colors.text, 0.08),
          },
          '&:active': {
            transform: 'translateY(1px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${colors.line}`,
          boxShadow: `0 12px 32px ${alpha('#000000', 0.2)}`,
        },
        outlined: {
          backgroundColor: colors.raised,
          borderColor: colors.line,
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: colors.raised,
          borderColor: colors.line,
          boxShadow: `0 8px 20px ${alpha('#000000', 0.16)}`,
        },
      },
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: {
          transition: 'background-color 150ms ease',
          '&:hover': {
            backgroundColor: alpha(colors.text, 0.05),
          },
        },
        focusHighlight: {
          backgroundColor: alpha(colors.text, 0.09),
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderColor: colors.line,
          backgroundColor: colors.panel,
          boxShadow: `0 24px 64px ${alpha('#000000', 0.45)}`,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          letterSpacing: '-0.01em',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          gap: 8,
          padding: '12px 20px 16px',
          borderTop: `1px solid ${colors.line}`,
          '& > :not(style) ~ :not(style)': {
            marginLeft: 0,
          },
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(colors.canvas, 0.78),
          backdropFilter: 'blur(5px)',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
        },
        input: {
          '&::placeholder': {
            color: alpha(colors.muted, 0.68),
            opacity: 1,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: colors.raised,
          transition: 'background-color 140ms ease, box-shadow 140ms ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.line,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.muted,
          },
          '&.Mui-focused': {
            backgroundColor: '#353a43',
            boxShadow: `0 0 0 3px ${alpha(colors.text, 0.09)}`,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.text,
            borderWidth: 1,
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.error,
          },
        },
      },
    },
    MuiInput: {
      styleOverrides: {
        underline: {
          '&::before': {
            borderBottomColor: colors.line,
          },
          '&:hover:not(.Mui-disabled, .Mui-error)::before': {
            borderBottomColor: colors.muted,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: colors.muted,
          '&.Mui-focused': {
            color: colors.text,
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: '0.6875rem',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: colors.muted,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${colors.line}`,
        },
        indicator: {
          height: 2,
          borderRadius: '2px 2px 0 0',
          background: colors.text,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 42,
          color: colors.muted,
          textTransform: 'none',
          '&.Mui-selected': {
            color: colors.text,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontSize: '0.6875rem',
          letterSpacing: '0.025em',
        },
        outlined: {
          borderColor: colors.line,
          backgroundColor: colors.raised,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: colors.line,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderColor: colors.line,
          backgroundColor: colors.raised,
          boxShadow: `0 18px 44px ${alpha('#000000', 0.36)}`,
        },
        list: {
          padding: 6,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 38,
          borderRadius: 6,
          fontSize: '0.875rem',
          '&:hover': {
            backgroundColor: alpha(colors.text, 0.07),
          },
          '&.Mui-selected': {
            backgroundColor: alpha(colors.text, 0.12),
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 7,
          '&:hover': {
            backgroundColor: alpha(colors.text, 0.06),
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          padding: '7px 10px',
          border: `1px solid ${colors.line}`,
          borderRadius: 6,
          backgroundColor: colors.raised,
          boxShadow: `0 8px 22px ${alpha('#000000', 0.3)}`,
          color: colors.text,
          fontSize: '0.6875rem',
        },
        arrow: {
          color: colors.raised,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundImage: 'none',
        },
        colorSuccess: {
          border: `1px solid ${alpha(colors.success, 0.3)}`,
          backgroundColor: alpha(colors.success, 0.09),
        },
        colorWarning: {
          border: `1px solid ${alpha(colors.warning, 0.3)}`,
          backgroundColor: alpha(colors.warning, 0.09),
        },
        colorError: {
          border: `1px solid ${alpha(colors.error, 0.3)}`,
          backgroundColor: alpha(colors.error, 0.09),
        },
        colorInfo: {
          border: `1px solid ${alpha(colors.info, 0.3)}`,
          backgroundColor: alpha(colors.info, 0.09),
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: colors.text,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#d5dae0',
          textDecorationColor: alpha(colors.muted, 0.5),
          textUnderlineOffset: 3,
          '&:hover': {
            color: colors.text,
            textDecorationColor: colors.text,
          },
        },
      },
    },
  },
});

export default theme;
