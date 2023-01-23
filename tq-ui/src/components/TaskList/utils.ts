import {Task, TaskGroup, TaskListArr} from '../types';

export function groupTasks(tasks: Task[]) {
  const taskList: TaskListArr = [];
  const groupTaskList = new Map<string, TaskGroup>();
  tasks.forEach((task) => {
    const m = /^([^/]+)\//.exec(task.label);
    if (m) {
      const name = m && m[1];
      let group = groupTaskList.get(name);
      if (!group) {
        const newGroup: TaskGroup = {
          name,
          taskList: [],
        };
        groupTaskList.set(name, group = newGroup);
        taskList.push(group);
      }
      group.taskList.push(task);
    } else {
      taskList.push(task);
    }
  });
  return taskList;
}
