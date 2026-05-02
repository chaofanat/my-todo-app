import { createRouter, createWebHashHistory } from 'vue-router';
import TodoView from '../views/TodoView.vue';
import SettingsView from '../views/SettingsView.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'todo',
      component: TodoView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
    },
  ],
});

export default router;
