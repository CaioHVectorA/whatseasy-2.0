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
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const formSchema = z.object({
  email: z.string().email({ message: 'Digite um e-mail válido' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres' }),
  name: z.string().optional(),
});

type UserFormValue = z.infer<typeof formSchema>;

export default function UserAuthForm() {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
    }
  });

  const onSubmit = async (data: UserFormValue) => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const endpoint = mode === 'LOGIN' ? '/auth/login' : '/auth/register';
      const res = await api.post(endpoint, data);
      const token = res.data?.data?.token;
      if (token) {
        setCookie('token', token, 30);
        window.location.href = '/';
      } else {
        setErrorMessage(res.data?.message || 'Erro ao autenticar');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Erro ao realizar login/cadastro');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const email = form.getValues('email') || 'dev@whatseasy.com';
      const res = await api.post('/auth/enter-development', { email });
      const token = res.data?.data?.token;
      if (token) {
        setCookie('token', token, 30);
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Erro no login dev');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg bg-muted p-1">
        <button
          type="button"
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
            mode === 'LOGIN'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => { setMode('LOGIN'); setErrorMessage(null); }}
        >
          Entrar
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
            mode === 'REGISTER'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => { setMode('REGISTER'); setErrorMessage(null); }}
        >
          Criar Conta
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-3">
          {mode === 'REGISTER' && (
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Seu nome..."
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    disabled={loading}
                    {...field}
                  />
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
                  <Input
                    type="password"
                    placeholder="••••••••"
                    disabled={loading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button disabled={loading} className="w-full" type="submit">
            {loading ? 'Aguarde...' : mode === 'LOGIN' ? 'Entrar' : 'Cadastrar'}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={loading}
            className="w-full border-dashed border-primary text-primary hover:bg-primary/10 mt-2"
            onClick={handleDevLogin}
          >
            ⚡ Entrar Direto (Dev Bypass)
          </Button>
        </form>
      </Form>
    </div>
  );
}
