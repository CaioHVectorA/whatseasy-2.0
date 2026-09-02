import { NavItem } from '@/types';

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: 'dashboard',
    label: 'Dashboard',
  },
  {
    title: 'Conexão WhatsApp',
    href: '/status',
    icon: 'whatsapp',
    label: 'Status',
  },
  {
    title: 'Contatos & Clusters',
    href: '/contatos',
    icon: 'contacts',
    label: 'Contatos',
  },
  {
    title: 'Banco Dinâmico',
    href: '/banco-dados',
    icon: 'database',
    label: 'Banco Dinâmico',
  },
  {
    title: 'Reativos',
    href: '/reativos',
    icon: 'reactive',
    label: 'Reativos',
  },
  {
    title: 'Gatilhos',
    href: '/gatilhos',
    icon: 'trigger',
    label: 'Gatilhos',
  },
  {
    title: 'Logs do Sistema',
    href: '/logs',
    icon: 'logs',
    label: 'Logs',
  },
];
