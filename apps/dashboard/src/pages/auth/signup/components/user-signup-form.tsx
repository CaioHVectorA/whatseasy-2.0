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
import { Loader2, Lock, Mail, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';

const formSchema = z
  .object({
    name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres' }),
    email: z.string().email({ message: 'Digite um e-mail válido' }),
    password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres' }),
    confirmPassword: z.string().min(6, { message: 'Confirme a sua senha' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type SignUpFormValue = z.infer<typeof formSchema>;

export default function UserSignUpForm() {
  const navigate = useNavigate();

  const form = useForm<SignUpFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const { isPending: loading, mutate } = useMutation({
    mutationFn: async (data: SignUpFormValue) => {
      const res = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      return res.data;
    },
    onSuccess: (response) => {
      const token = response.data?.token;
      if (token) {
        setCookie('token', token, 30);
        toast.success('Conta criada com sucesso!');
        navigate('/');
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Erro ao criar conta. Tente novamente.';
      toast.error(msg);
    },
  });

  const onSubmit = (data: SignUpFormValue) => {
    mutate(data);
  };

  return (
    <div className="grid gap-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Ex: Caio Henrique"
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

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar Senha</FormLabel>
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
            Criar Minha Conta
          </Button>
        </form>
      </Form>

      <div className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{' '}
        <Link to="/login" className="font-semibold text-emerald-600 hover:underline">
          Fazer Login
        </Link>
      </div>
    </div>
  );
}
