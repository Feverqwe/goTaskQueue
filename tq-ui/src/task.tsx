import * as React from "react";
import {createRoot} from 'react-dom/client';
import Page from "./components/Page";
import Task from "./components/Task/TaskPage";

const root = createRoot(document.getElementById('root')!);

root.render(
  <Page>
    <Task/>
  </Page>
);
