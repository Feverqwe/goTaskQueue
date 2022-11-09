import {createContext} from 'react';
import {Task} from '../types';

export const NotificationCtx = createContext<(task: Task) => void>(() => {});
