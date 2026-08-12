import {useQuery} from '@tanstack/react-query';
import {useContext} from 'react';
import {RootStoreCtx} from '../components/RootStore/RootStoreCtx';
import {api} from '../tools/api';

const useTaskQuery = (id: string | null) => {
  const {task: initialTask} = useContext(RootStoreCtx);
  const hasInitialTask = initialTask?.id === id;

  return useQuery({
    queryKey: ['task', id],
    queryFn: ({signal}) => api.task({id: id!}, {signal}),
    enabled: id !== null,
    initialData: hasInitialTask ? initialTask : undefined,
    initialDataUpdatedAt: hasInitialTask ? Date.now() : undefined,
    refetchOnWindowFocus: false,
    staleTime: 10 * 1000,
  });
};

export default useTaskQuery;
