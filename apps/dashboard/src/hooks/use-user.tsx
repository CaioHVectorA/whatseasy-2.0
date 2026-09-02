import { Loader } from "@/components/loader";
import { api } from "@/lib/api";
import { User } from "@/types/user";
import { useQuery } from "@tanstack/react-query";
import { ComponentType } from "react";
import { Navigate } from "react-router-dom";

export function useUser() {
  const { data: user, isLoading, error, refetch } = useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await api.get<{ data: User }>('/auth/me');
      return res.data.data;
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  return { user, isLoading, error, refetch };
}

export function withUser<P extends { user: User }>(Component: ComponentType<P>) {
  return function WrapperComponent(props: Omit<P, 'user'>) {
    const { user, isLoading: loading, error } = useUser();

    if (loading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <Loader />
        </div>
      );
    }

    if (error || !user) {
      return <Navigate to="/login" replace />;
    }

    return <Component {...(props as P)} user={user} />;
  };
}