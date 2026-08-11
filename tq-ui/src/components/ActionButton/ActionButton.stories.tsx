import type {Meta, StoryObj} from '@storybook/react-vite';
import ActionButton from './ActionButton';

const meta = {
  title: 'Components/ActionButton',
  component: ActionButton,
  args: {
    children: 'Run task',
    onSubmit: async () => {},
    variant: 'contained',
  },
  argTypes: {
    onSubmit: {control: false},
  },
} satisfies Meta<typeof ActionButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const LoadingAfterClick: Story = {
  args: {
    children: 'Start long task',
    onSubmit: () => new Promise(() => undefined),
  },
};

export const ErrorAfterClick: Story = {
  args: {
    children: 'Run failing task',
    onSubmit: async () => {
      throw new Error('Task failed to start');
    },
  },
};
