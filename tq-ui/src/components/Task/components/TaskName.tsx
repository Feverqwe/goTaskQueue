import React, {FC} from "react";
import {Task} from "../../types";
import {Typography} from "@mui/material";

interface TaskNameProp {
  task: Task;
}

const TaskName: FC<TaskNameProp> = ({task: {label, command}}) => {
  return (
    <Typography variant={'body1'}>
        {label || command}
    </Typography>
  );
}

export default TaskName;