import React, {FC, useCallback, useState} from 'react';
import {Task} from '../../types';
import TaskHeader from './TaskHeader';
import TaskInfo from './TaskInfo';
import TaskLog from './TaskLog';
import {ScreenSize} from '../types';

interface TaskViewProps {
  task: Task;
  onUpdate: () => void;
}

const TaskView: FC<TaskViewProps> = ({task, onUpdate}) => {
  const {isPty} = task;
  const [remapNewLine, setRemapNewLine] = useState(!isPty);
  const [showInfo, setInfo] = useState(false);
  const [screenSize, setScreenSize] = useState<ScreenSize | null>(null);

  const handleToggleRemapNewLine = useCallback(() => {
    setRemapNewLine((v) => !v);
  }, []);

  const handleToggleInfo = useCallback(() => {
    setInfo((v) => !v);
  }, []);

  const handleSetScreenSize = useCallback((data: ScreenSize | null) => {
    setScreenSize(data);
  }, []);

  return (
    <>
      <TaskHeader task={task} screenSize={screenSize} remapNewLine={remapNewLine} onToggleInfo={handleToggleInfo} onSetScreenSize={handleSetScreenSize} onToggleRemapNewLine={handleToggleRemapNewLine} onUpdate={onUpdate} />
      {showInfo && (
        <TaskInfo task={task} onUpdate={onUpdate} />
      )}
      <TaskLog task={task} screenSize={screenSize} remapNewLine={remapNewLine} onUpdate={onUpdate} />
    </>
  );
};

export default TaskView;
