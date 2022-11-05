import {createContext} from "react";
import {RootStore} from "./RootStoreProvider";

export const RootStoreCtx = createContext<RootStore>({templates: []});