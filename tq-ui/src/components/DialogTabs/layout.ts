import {SxProps, Theme} from '@mui/material/styles';

export const DIALOG_TAB_MIN_HEIGHT = 40;
export const DIALOG_TAB_PANEL_MIN_HEIGHT = 216;

export const DIALOG_TITLE_SX = {
  px: {xs: 1.5, sm: 2},
  py: 1,
} satisfies SxProps<Theme>;

export const DIALOG_TITLE_ROW_SX = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  minHeight: 30,
} satisfies SxProps<Theme>;

export const DIALOG_CLOSE_BUTTON_SX = {
  width: 34,
  height: 34,
} satisfies SxProps<Theme>;

export const DIALOG_CONTENT_SX = {
  p: 0,
} satisfies SxProps<Theme>;

export const DIALOG_TABS_CONTAINER_SX = {
  borderBottom: 1,
  borderColor: 'divider',
} satisfies SxProps<Theme>;

export const DIALOG_TABS_SX = {
  px: {xs: 0.5, sm: 2},
  minHeight: DIALOG_TAB_MIN_HEIGHT,
  '& .MuiTab-root': {
    minHeight: DIALOG_TAB_MIN_HEIGHT,
    py: 0.5,
  },
} satisfies SxProps<Theme>;

export const DIALOG_PANEL_PADDING = {xs: 1.5, sm: 2} as const;

export const DIALOG_ACTIONS_SX = {
  px: DIALOG_PANEL_PADDING,
  py: 1,
  gap: 1,
} satisfies SxProps<Theme>;
