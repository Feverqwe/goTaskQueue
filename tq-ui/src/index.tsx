import * as React from "react";
import {createRoot} from 'react-dom/client';
import Page from "./components/Page";
import TaskList from "./components/TaskList/TaskList";

const root = createRoot(document.getElementById('root')!);

root.render(
  <Page>
    <TaskList/>
  </Page>
);
