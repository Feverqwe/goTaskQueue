import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import Page from './components/Page';
import RootStoreProvider from './components/RootStore/RootStoreProvider';
import TaskList from './components/TaskList/TaskList';
import TaskPage from './components/Task/TaskPage';
import TemplateProvider from './components/TemplateProvider/TemplateProvider';
import GroupStateProvider from './components/GroupStorageProvider/GroupStateProvider';

const root = createRoot(document.getElementById('root')!);

root.render(
  <Page>
    <RootStoreProvider>
      <GroupStateProvider>
        <TemplateProvider>
          <BrowserRouter>
            <Routes>
              <Route index element={<TaskList />} />
              <Route path="task" element={<TaskPage />} />
            </Routes>
          </BrowserRouter>
        </TemplateProvider>
      </GroupStateProvider>
    </RootStoreProvider>
  </Page>,
);
