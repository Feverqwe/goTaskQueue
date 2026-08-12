import type {Meta, StoryObj} from '@storybook/react-vite';
import {Box} from '@mui/material';
import React from 'react';
import {DIALOG_TAB_PANEL_MIN_HEIGHT} from '../DialogTabs/layout';
import {CommandFieldLoading} from './CommandFieldAsync';

const meta = {
  title: 'Components/CommandField/Loading',
  component: CommandFieldLoading,
  decorators: [
    (Story) => (
      <Box
        sx={{
          position: 'relative',
          minHeight: DIALOG_TAB_PANEL_MIN_HEIGHT,
          width: '100%',
          maxWidth: 900,
          mx: 'auto',
        }}
      >
        <Story />
      </Box>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof CommandFieldLoading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
