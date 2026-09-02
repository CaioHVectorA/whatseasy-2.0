import { Suspense, lazy } from 'react';
import { Navigate, Outlet, useRoutes } from 'react-router-dom';

const DashboardLayout = lazy(
  () => import('@/components/layout/dashboard-layout')
);
const SignInPage = lazy(() => import('@/pages/auth/signin'));
const SignUpPage = lazy(() => import('@/pages/auth/signup'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const ContactsPage = lazy(() => import('@/pages/contacts'));
const CustomFieldsPage = lazy(() => import('@/pages/custom-fields'));
const StatusPage = lazy(() => import('@/pages/status'));
const ReactivesPage = lazy(() => import('@/pages/reactives'));
const TriggersPage = lazy(() => import('@/pages/triggers'));
const LogsPage = lazy(() => import('@/pages/logs'));
const NotFound = lazy(() => import('@/pages/not-found'));

export default function AppRouter() {
  const dashboardRoutes = [
    {
      path: '/',
      element: (
        <DashboardLayout>
          <Suspense fallback={<div className="h-full flex items-center justify-center">Carregando...</div>}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      ),
      children: [
        {
          element: <DashboardPage />,
          index: true,
        },
        {
          path: 'status',
          element: <StatusPage />,
        },
        {
          path: 'contatos',
          element: <ContactsPage />,
        },
        {
          path: 'banco-dados',
          element: <CustomFieldsPage />,
        },
        {
          path: 'reativos',
          element: <ReactivesPage />,
        },
        {
          path: 'gatilhos',
          element: <TriggersPage />,
        },
        {
          path: 'logs',
          element: <LogsPage />,
        },
      ],
    },
  ];

  const publicRoutes = [
    {
      path: '/login',
      element: <SignInPage />,
      index: true,
    },
    {
      path: '/register',
      element: <SignUpPage />,
    },
    {
      path: '/404',
      element: <NotFound />,
    },
    {
      path: '*',
      element: <Navigate to="/404" replace />,
    },
  ];

  const routes = useRoutes([...dashboardRoutes, ...publicRoutes]);

  return routes;
}
