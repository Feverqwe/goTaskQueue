import {Task} from '../../components/types';

export function waitGroup() {
  let count = 0;
  let r: () => void;
  const p = new Promise<void>((re) => {
    r = re;
  });
  return {
    add: (c: number) => {
      count += c;
    },
    done: () => {
      if (--count === 0) {
        r();
      }
    },
    wait: () => {
      return p;
    },
  };
}

export function getTaskName({label, command}: Pick<Task, 'label' | 'command'>) {
  return label || command;
}
