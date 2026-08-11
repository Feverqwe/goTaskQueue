import type {Preview} from '@storybook/react-vite';
import React from 'react';
import Page from '../src/components/Page';

const preview: Preview = {
  decorators: [
    (Story) => (
      <Page>
        <Story />
      </Page>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
  },
};

export default preview;
