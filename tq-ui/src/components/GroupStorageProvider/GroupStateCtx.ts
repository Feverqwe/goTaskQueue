import {createContext} from 'react';

export const GroupStateCtx = createContext<Partial<Record<string, boolean>>>({});
