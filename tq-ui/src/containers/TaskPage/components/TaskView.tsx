import React, {FC, ReactNode} from 'react';
import {Task} from '../../../components/types';
import TaskHeader from './TaskHeader';
import TaskLog from './TaskLog';

interface TaskViewProps {
  task: Task;
  onUpdate: () => Promise<Task | undefined>;
  status?: ReactNode;
}

const TaskView: FC<TaskViewProps> = ({task, onUpdate, status}) => {
  return (
    <>
      <TaskHeader task={task} onUpdate={onUpdate} />
      {status}
      <TaskLog task={task} onUpdate={onUpdate} />
    </>
  );
};

export default TaskView;
