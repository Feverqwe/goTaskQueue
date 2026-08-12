import type {Meta, StoryObj} from '@storybook/react-vite';
import {Box} from '@mui/material';
import {FitAddon} from '@xterm/addon-fit';
import {Terminal} from '@xterm/xterm';
import React, {useEffect, useRef} from 'react';
import {theme} from './theme';

import '@xterm/xterm/css/xterm.css';
import './XTerm.css';

const AnsiPalettePreview = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const terminal = new Terminal({
      rows: 8,
      convertEol: true,
      fontSize: 14,
      theme,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddon.fit();
    terminal.write(
      [
        'Native xterm ANSI palette',
        '',
        ...[
          ['normal', 30],
          ['bright', 90],
        ].map(
          ([label, start]) =>
            `${label.toString().padEnd(7)} ${Array.from(
              {length: 8},
              (_, index) => `\u001b[${Number(start) + index}m ${index} color \u001b[0m`,
            ).join('')}`,
        ),
        '',
        '\u001b[31merror\u001b[0m  \u001b[32msuccess\u001b[0m  \u001b[33mwarning\u001b[0m  \u001b[34minfo\u001b[0m',
      ].join('\r\n'),
    );

    return () => terminal.dispose();
  }, []);

  return (
    <Box ref={containerRef} sx={{height: 180, minWidth: 0, width: '100%', overflow: 'hidden'}} />
  );
};

const meta = {
  title: 'Task page/Terminal ANSI palette',
  component: AnsiPalettePreview,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <Box sx={{boxSizing: 'border-box', maxWidth: 920, width: '100%', p: 2}}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof AnsiPalettePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
