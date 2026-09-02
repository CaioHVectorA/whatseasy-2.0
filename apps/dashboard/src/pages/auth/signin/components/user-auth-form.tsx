import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { setCookie } from '@/lib/cookies';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Lock, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';

const formSchema = z.object({
  email: z.string().email({ message: 'Digite um e-mail válido' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres' }),
});

type UserFormValue = z.infer<typeof formSchema>;

export default function UserAuthForm() {
  const navigate = useNavigate();

  const form = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const { isPending: loading, mutate } = useMutation({
    mutationFn: async (data: UserFormValue) => {
      const res = await api.post('/auth/login', data);
      return res.data;
    },
    onSuccess: (response) => {
      const token = response.data?.token;
      if (token) {
        setCookie('token', token, 30);
        toast.success('Login realizado com sucesso!');
        navigate('/');
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Erro ao realizar login. Verifique suas credenciais.';
      toast.error(msg);
    },
  });

  const onSubmit = (data: UserFormValue) => {
    mutate(data);
  };

  return (
    <div className="grid gap-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      className="pl-9"
                      disabled={loading}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      disabled={loading}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" type="submit">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar no WhatsEasy
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm text-muted-foreground">
        Ainda não possui uma conta?{' '}
        <Link to="/register" className="font-semibold text-emerald-600 hover:underline">
          Cadastre-se gratuitamente
        </Link>
      </div>
    </div>
  );
}
