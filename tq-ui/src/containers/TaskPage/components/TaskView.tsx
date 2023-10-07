import React, {FC, useCallback, useState} from 'react';
import {Task} from '../../../components/types';
import TaskHeader from './TaskHeader';
import TaskLog from './TaskLog';

interface TaskViewProps {
  task: Task;
  onUpdate: () => void;
}

const TaskView: FC<TaskViewProps> = ({task, onUpdate}) => {
  const {isPty} = task;
  const [remapNewLine, setRemapNewLine] = useState(!isPty);

  const handleToggleRemapNewLine = useCallback(() => {
    setRemapNewLine((v) => !v);
  }, []);

  return (
    <>
      <TaskHeader
        task={task}
        remapNewLine={remapNewLine}
        onToggleRemapNewLine={handleToggleRemapNewLine}
        onUpdate={onUpdate}
      />
      <TaskLog task={task} remapNewLine={remapNewLine} onUpdate={onUpdate} />
    </>
  );
};

export default TaskView;
