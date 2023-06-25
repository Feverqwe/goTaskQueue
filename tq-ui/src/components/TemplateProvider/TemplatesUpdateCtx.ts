import {createContext} from 'react';

export const TemplatesUpdateCtx = createContext<() => Promise<void>>(async () => {});
