import {useQuery} from '@tanstack/react-query';
import {useContext} from 'react';
import {RootStoreCtx} from '../components/RootStore/RootStoreCtx';
import {Task, TaskOrGroup} from '../components/types';
import {groupTasks} from '../containers/TaskList/utils';
import {api} from '../tools/api';

const groupNewestFirst = (tasks: Task[]): TaskOrGroup[] => groupTasks([...tasks].reverse());

const useTaskListQuery = () => {
  const {tasks: initialTasks} = useContext(RootStoreCtx);

  return useQuery({
    queryKey: ['tasks'],
    queryFn: ({signal}) => api.tasks(undefined, {signal}),
    initialData: initialTasks ?? undefined,
    initialDataUpdatedAt: initialTasks === null ? undefined : Date.now(),
    refetchInterval: 10 * 1000,
    refetchOnMount: 'always',
    select: groupNewestFirst,
    staleTime: 10 * 1000,
  });
};

export default useTaskListQuery;
