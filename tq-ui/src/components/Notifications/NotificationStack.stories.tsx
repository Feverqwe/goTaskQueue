import type {Meta, StoryObj} from '@storybook/react-vite';
import NotificationStack, {ToastItem} from './NotificationStack';

const successNotification: ToastItem = {
  id: 'success',
  severity: 'success',
  label: 'Task completed',
  title: 'Build desktop release',
  autoHideDuration: null,
};

const canceledNotification: ToastItem = {
  id: 'canceled',
  severity: 'warning',
  label: 'Task canceled',
  title: 'Sync production database snapshot',
  autoHideDuration: null,
};

const errorNotification: ToastItem = {
  id: 'error',
  severity: 'error',
  label: 'Task failed',
  title: 'Deploy task queue worker to production',
  message: 'The deployment command exited with status 1 after the health check timed out.',
  autoHideDuration: null,
};

const meta = {
  title: 'Components/Notifications/NotificationStack',
  component: NotificationStack,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    notifications: [successNotification],
    onClose: () => {},
  },
  argTypes: {
    onClose: {control: false},
  },
} satisfies Meta<typeof NotificationStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {};

export const Info: Story = {
  args: {
    notifications: [
      {
        id: 'info',
        severity: 'info',
        title: 'Templates reloaded',
        message: 'The task templates are ready to use.',
        autoHideDuration: null,
      },
    ],
  },
};

export const MixedStack: Story = {
  args: {
    notifications: [successNotification, canceledNotification, errorNotification],
  },
};

export const LongFailure: Story = {
  args: {
    notifications: [
      {
        ...errorNotification,
        id: 'long-error',
        title:
          'deploy-tool release --environment production --service task-queue-worker --strategy rolling --timeout 15m',
        message:
          'Unable to complete the rollout because the new worker did not pass its readiness probe before the deployment timeout elapsed.',
      },
    ],
  },
};
