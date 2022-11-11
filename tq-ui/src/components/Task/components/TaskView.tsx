import React, {FC, Fragment, useCallback, useState} from "react";
import {Task} from "../../types";
import TaskHeader from "./TaskHeader";
import TaskInfo from "./TaskInfo";
import TaskLog from "./TaskLog";

interface TaskViewProps {
  task: Task;
  onUpdate: () => void;
}

const TaskView: FC<TaskViewProps> = ({task, onUpdate}) => {
  const {isPty} = task;
  const [remapNewLine, setRemapNewLine] = useState(!isPty);
  const [showInfo, setInfo] = useState(false);

  const handleToggleFixNewLine = useCallback(() => {
    setRemapNewLine((v) => !v);
  }, []);

  const handleToggleInfo = useCallback(() => {
    setInfo((v) => !v);
  }, []);

  return (
    <Fragment>
      <TaskHeader task={task} remapNewLine={remapNewLine} onToggleInfo={handleToggleInfo} onToggleFixNewLine={handleToggleFixNewLine} onUpdate={onUpdate} />
      {showInfo && (
        <TaskInfo task={task} />
      )}
      <TaskLog task={task} remapNewLine={remapNewLine} onUpdate={onUpdate} />
    </Fragment>
  );
}

export default TaskView;