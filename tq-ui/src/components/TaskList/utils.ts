import {Task, TaskGroup, TaskOrGroup} from '../types';

export function groupTasks(tasks: Task[]) {
  const taskList: TaskOrGroup[] = [];
  const groupList: TaskGroup[] = [];
  const groupTaskList = new Map<string, TaskGroup>();
  tasks.forEach((task) => {
    const groupName = task.group;
    if (groupName) {
      let group = groupTaskList.get(groupName);
      if (!group) {
        const newGroup: TaskGroup = {
          name: groupName,
          taskList: [],
        };
        groupTaskList.set(groupName, group = newGroup);
        groupList.push(group);
      }
      group.taskList.push(task);
    } else {
      taskList.push(task);
    }
  });
  return [...taskList, ...groupList];
}
