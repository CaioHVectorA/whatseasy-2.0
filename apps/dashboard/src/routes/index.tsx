import { setCookie } from '@/lib/cookies';
import { Callback } from '@/pages/callback';
import { Clusters } from '@/pages/clusters';
import FormPage from '@/pages/form';
import NotFound from '@/pages/not-found';
import { Reactives } from '@/pages/reactives';
import { Status } from '@/pages/status';
import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Outlet, useRoutes, useSearchParams } from 'react-router-dom';

const DashboardLayout = lazy(
  () => import('@/components/layout/dashboard-layout')
);
const SignInPage = lazy(() => import('@/pages/auth/signin'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const StudentPage = lazy(() => import('@/pages/students'));
const StudentDetailPage = lazy(
  () => import('@/pages/students/StudentDetailPage')
);

// ----------------------------------------------------------------------

export default function AppRouter() {
  const dashboardRoutes = [
    {
      path: '/',
      element: (
        <DashboardLayout>
          <Suspense>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      ),
      children: [
        {
          element: <DashboardPage />,
          index: true
        },
        {
          path: 'contatos',
          element: <StudentPage />
        },
        {
          path: "Clusters",
          element: <Clusters />
        },
        {
          path: "status",
          element: <Status />
        },
        {
          path: "reativos",
          element: <Reactives />
        },
        {
          path: 'student/details',
          element: <StudentDetailPage />
        },
        {
          path: 'form',
          element: <FormPage />
        }
      ]
    }
  ];

  const publicRoutes = [
    {
      path: '/login',
      element: <SignInPage />,
      index: true
    },
    {
      path: '/404',
      element: <NotFound />
    },
    {
      path: "/auth/callback",
      element: <Callback />
    },
    {
      path: '*',
      element: <Navigate to="/404" replace />
    },
  ];

  const routes = useRoutes([...dashboardRoutes, ...publicRoutes]);

  return routes;
}
