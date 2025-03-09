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
import { useRouter } from '@/routes/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CheckCircleIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const formSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address' })
});

type UserFormValue = z.infer<typeof formSchema>;

export default function UserAuthForm() {
  const router = useRouter();
  const [state, setState] = useState<'FORM' | 'SENDED'>('FORM');
  const { data, isPending: loading, mutate, error } = useMutation({
    mutationFn: async (data: UserFormValue) => {
      const res = await api.post('/auth/enter', data)
      return res.data
    },
    onSuccess: () => {
      setState('SENDED');
    }
  })
  const defaultValues = {
  };
  const form = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const onSubmit = async (data: UserFormValue) => {
    console.log('data', data);
    mutate(data);
    // router.push('/');
  };
  if (state === 'SENDED') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <CheckCircleIcon size={48} className=' text-green-500 mt-8' />
        <h1 className="text-2xl font-semibold">Quase lá!</h1>
        <p className="text-muted-foreground text-center">
          Nós enviamos um email para você com um link para continuar.
        </p>
      </div>
    );
  }
  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full space-y-2"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email..."
                    disabled={loading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button disabled={loading} className="ml-auto w-full" type="submit">
            Continue With Email
          </Button>
        </form>
      </Form>
      {/* <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div> */}
    </>
  );
}
