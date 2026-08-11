import React, {FC} from 'react';
import {Task} from '../../../components/types';
import TaskHeader from './TaskHeader';
import TaskLog from './TaskLog';

interface TaskViewProps {
  task: Task;
  onUpdate: () => void;
}

const TaskView: FC<TaskViewProps> = ({task, onUpdate}) => {
  return (
    <>
      <TaskHeader task={task} onUpdate={onUpdate} />
      <TaskLog task={task} onUpdate={onUpdate} />
    </>
  );
};

export default TaskView;
