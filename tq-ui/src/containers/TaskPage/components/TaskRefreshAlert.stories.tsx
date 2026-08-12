import type {Meta, StoryObj} from '@storybook/react-vite';
import TaskRefreshAlert from './TaskRefreshAlert';

const meta = {
  title: 'TaskPage/TaskRefreshAlert',
  component: TaskRefreshAlert,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    error: new Error('Network request failed'),
    onRetry: () => {},
  },
  argTypes: {
    error: {control: false},
    onRetry: {control: false},
  },
} satisfies Meta<typeof TaskRefreshAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StaleTask: Story = {};
