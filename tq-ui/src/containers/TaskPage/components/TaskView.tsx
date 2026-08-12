import React, {FC, ReactNode} from 'react';
import {Task} from '../../../components/types';
import TaskHeader from './TaskHeader';
import TaskLog from './TaskLog';

interface TaskViewProps {
  task: Task;
  onUpdate: () => Promise<Task | undefined>;
  onComplete: (task: Task) => void;
  status?: ReactNode;
}

const TaskView: FC<TaskViewProps> = ({task, onUpdate, onComplete, status}) => {
  return (
    <>
      <TaskHeader task={task} onUpdate={onUpdate} />
      {status}
      <TaskLog task={task} onUpdate={onUpdate} onComplete={onComplete} />
    </>
  );
};

export default TaskView;
