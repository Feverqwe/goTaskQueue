import {createContext} from 'react';

export const GroupStateSetCtx = createContext<(name: string, state: boolean) => Promise<void>>(async () => {});
