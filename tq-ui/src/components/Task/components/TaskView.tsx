import React, {FC, useCallback, useState} from 'react';
import {Task} from '../../types';
import TaskHeader from './TaskHeader';
import TaskInfo from './TaskInfo';
import TaskLog from './TaskLog';

interface TaskViewProps {
  task: Task;
  onUpdate: () => void;
}

const TaskView: FC<TaskViewProps> = ({task, onUpdate}) => {
  const {isPty} = task;
  const [remapNewLine, setRemapNewLine] = useState(!isPty);
  const [showInfo, setInfo] = useState(false);

  const handleToggleRemapNewLine = useCallback(() => {
    setRemapNewLine((v) => !v);
  }, []);

  const handleToggleInfo = useCallback(() => {
    setInfo((v) => !v);
  }, []);

  return (
    <>
      <TaskHeader task={task} remapNewLine={remapNewLine} onToggleInfo={handleToggleInfo} onToggleRemapNewLine={handleToggleRemapNewLine} onUpdate={onUpdate} />
      {showInfo && (
        <TaskInfo task={task} onUpdate={onUpdate} />
      )}
      <TaskLog task={task} remapNewLine={remapNewLine} onUpdate={onUpdate} />
    </>
  );
};

export default TaskView;
