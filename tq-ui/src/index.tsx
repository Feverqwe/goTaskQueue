import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import Page from './components/Page';
import RootStoreProvider from './components/RootStore/RootStoreProvider';
import TaskList from './components/TaskList/TaskList';
import Task from './components/Task/TaskPage';

const root = createRoot(document.getElementById('root')!);

root.render(
  <Page>
    <RootStoreProvider>
      <BrowserRouter>
        <Routes>
          <Route index element={<TaskList />} />
          <Route path="task" element={<Task />} />
        </Routes>
      </BrowserRouter>
    </RootStoreProvider>
  </Page>,
);
