import * as React from "react";
import {createRoot} from 'react-dom/client';
import Page from "./components/Page";
import TaskList from "./components/TaskList/TaskList";
import RootStoreProvider from "./components/RootStore/RootStoreProvider";

const root = createRoot(document.getElementById('root')!);

root.render(
  <Page>
    <RootStoreProvider>
      <TaskList/>
    </RootStoreProvider>
  </Page>
);
