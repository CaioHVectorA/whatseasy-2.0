import { api } from "@/lib/api";
import { User } from "@/types/user";
import { useQuery } from "@tanstack/react-query";

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