import React, {FC, useCallback, useState} from 'react';
import {Task} from '../../../components/types';
import TaskHeader from './TaskHeader';
import TaskInfo from './TaskInfo';
import TaskLog from './TaskLog';

interface TaskViewProps {
  task: Task;
  onUpdate: () => void;
}

const TaskView: FC<TaskViewProps> = ({task, onUpdate}) => {
  const [showInfo, setInfo] = useState(false);

  const handleToggleInfo = useCallback(() => {
    setInfo((v) => !v);
  }, []);

  return (
    <>
      <TaskHeader
        task={task}
        showInfo={showInfo}
        onToggleInfo={handleToggleInfo}
        onUpdate={onUpdate}
      />
      {showInfo && <TaskInfo task={task} onUpdate={onUpdate} />}
      <TaskLog task={task} onUpdate={onUpdate} />
    </>
  );
};

export default TaskView;
