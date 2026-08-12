import {SxProps, Theme} from '@mui/material/styles';

export const CODE_FIELD_SX = {
  '& .MuiInputBase-input, & .MuiSelect-select': {
    fontFamily: 'monospace',
    fontSize: '0.8125rem',
  },
} satisfies SxProps<Theme>;

export const CODE_MENU_ITEM_SX = {
  fontFamily: 'monospace',
} satisfies SxProps<Theme>;
