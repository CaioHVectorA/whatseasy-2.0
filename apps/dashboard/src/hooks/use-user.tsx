import { Error } from "@/components/error-page";
import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { User } from "@/types/user";
import { useQuery } from "@tanstack/react-query";
import { ComponentType } from "react";
import { Link } from "react-router-dom";

export function useUser() {
    const { data: user, isLoading, error } = useQuery<User>({
        queryKey: ['user'],
        queryFn: async () => {
            const res = await api.get<User>('/user/me');
            return res.data;
        }
    })
    return { user, isLoading, error };
}

export function withUser(Component: ComponentType<{ user: User }>) {
    return function WrapperComponent() {
        const { user, isLoading: loading, error } = useUser();
        if (loading) return <Loader />;
        console.log({ error })
        if (error) return (
            <Error cause={error.message || (error as unknown as string) || 'Erro desconhecido'}>
                <Button size={'lg'} asChild>
                    <Link to={'/login'}>Fazer login</Link>
                </Button>
            </Error>
        )
        if (!user) return (
            <div className='w-full h-full flex flex-col gap-2 items-center justify-center'>
                <h1 className=' text-5xl'>
                    Olá, visitante!
                </h1>
                <p className=' text-xl my-4'>
                    Para fazer as operações no dashboard, você deve estar logado.
                </p>
                <Button size={'lg'} asChild>
                    <Link to={'/login'}>Fazer login</Link>
                </Button>
            </div>
        );
        return <Component user={user} />;
    }
}