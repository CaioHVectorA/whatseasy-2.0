import PageHead from '@/components/shared/page-head.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import RecentSales from './components/recent-sales.js';
import { withUser } from '@/hooks/use-user.js';
import { User } from '@/types/user.js';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/index.js';
import { Send, Calendar, ChefHatIcon, Users } from 'lucide-react';
import Overview, { MessageData } from './components/overview.js';
type ApiResponse = {
  currentMonth: {
    Contacts: number;
    Trigger: number;
    SentMessages: number;
    Schedule: number;
  };
  lastMonth: {
    Contacts: number;
    Trigger: number;
    SentMessages: number;
    Schedule: number;
  };
  clientSync: boolean;
  sentMessages: MessageData[]
};

const dashboardData = [
  {
    title: 'Contatos',
    value: 0,
    change: 0,
    icon: <Users className="h-4 w-4 text-muted-foreground" />
  },
  {
    title: 'Reativos',
    value: 0,
    change: 0,
    icon: <ChefHatIcon className="h-4 w-4 text-muted-foreground" />
  },
  {
    title: 'Mensagens enviadas',
    value: 0,
    change: 0,
    icon: <Send className="h-4 w-4 text-muted-foreground" />
  },
  {
    title: 'Agendamentos',
    value: 0,
    change: 0,
    icon: <Calendar className="h-4 w-4 text-muted-foreground" />
  },

];

function DashboardCard({ title, value, change, icon }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{change} a mais que o mês passado!</p>
      </CardContent>
    </Card>
  );
}

function DashboardPage({ user }: { user: User }) {
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get<{ data: ApiResponse }>('/user/initial-data');
      return res.data.data
    }
  })
  const dataToRender = !data ? dashboardData : dashboardData.map((item, index) => {
    return {
      ...item,
      value: data.currentMonth[Object.keys(data.currentMonth)[index]],
      change: data.currentMonth[Object.keys(data.currentMonth)[index]] - data.lastMonth[Object.keys(data.lastMonth)[index]]
    }
  })
  return (
    <>
      <PageHead title="Dashboard | App" />
      <div className="max-h-screen flex-1 space-y-4 overflow-y-auto p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Olá, bem-vindo de volta, {user.name}👋
          </h2>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Resumo</TabsTrigger>
            <TabsTrigger value="analytics" disabled>
              Gráficos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {dataToRender.map((data, index) => (
                <DashboardCard key={index} {...data} />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Número de mensagens enviadas</CardTitle>
                </CardHeader>
                <CardContent className="pl-0">
                  <Overview data={data?.sentMessages || []} />
                </CardContent>
              </Card>
              <Card className="col-span-4 md:col-span-3">
                <CardHeader>
                  <CardTitle>Mensages</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    As últimas mensagens enviadas
                  </p>
                </CardHeader>
                <CardContent>
                  <RecentSales />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default withUser(DashboardPage);
