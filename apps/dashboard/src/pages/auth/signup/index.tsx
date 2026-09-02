import UserSignUpForm from './components/user-signup-form';
import { MessageSquareCode, ShieldCheck, Zap } from 'lucide-react';
import PageHead from '@/components/shared/page-head';

export default function SignUpPage() {
  return (
    <>
      <PageHead title="Cadastro | WhatsEasy 2.0" />
      <div className="relative min-h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-slate-900 p-10 text-white lg:flex justify-between border-r border-slate-800">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-black shadow-lg">
              <MessageSquareCode className="h-6 w-6 text-white" />
            </div>
            <span>WhatsEasy 2.0</span>
          </div>

          <div className="space-y-6 max-w-md">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-100">
              Comece a automatizar seus fluxos de WhatsApp em minutos.
            </h2>
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                <span>Respostas automáticas para palavras-chave.</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Gatilhos agendados e remarketing inteligente.</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} WhatsEasy. Todos os direitos reservados.
          </p>
        </div>

        <div className="flex min-h-screen items-center justify-center p-6 lg:p-12">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-bold tracking-tight">Criar Conta</h1>
              <p className="text-sm text-muted-foreground">
                Preencha os dados abaixo para começar a usar
              </p>
            </div>
            <UserSignUpForm />
          </div>
        </div>
      </div>
    </>
  );
}
