import type {Meta, StoryObj} from '@storybook/react-vite';
import TaskConnectionAlert from './TaskConnectionAlert';

const meta = {
  title: 'TaskPage/TaskConnectionAlert',
  component: TaskConnectionAlert,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    state: 'reconnecting',
    onReconnect: () => {},
  },
  argTypes: {
    onReconnect: {control: false},
  },
} satisfies Meta<typeof TaskConnectionAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Reconnecting: Story = {};

export const Connected: Story = {
  args: {
    state: 'connected',
  },
};
