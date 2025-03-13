import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader } from '@/components/loader'
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

// Extracted data
const salesData = [
  {
    id: 1,
    name: "Olivia Martin",
    phone: "olivia.martin@email.com",
    createdAt: new Date(),
    avatarFallback: "OM"
  },
  {
    id: 2,
    name: "Jackson Lee",
    phone: "jackson.lee@email.com",
    createdAt: new Date(),
    avatarFallback: "JL"
  },
  {
    id: 3,
    name: "Isabella Nguyen",
    phone: "isabella.nguyen@email.com",
    createdAt: new Date(),
    avatarFallback: "IN"
  },
  {
    id: 4,
    name: "William Kim",
    phone: "will@email.com",
    createdAt: new Date(),
    avatarFallback: "WK"
  },
  {
    id: 5,
    name: "Sofia Davis",
    phone: "sofia.davis@email.com",
    createdAt: new Date(),
    avatarFallback: "SD"
  }
];

export default function RecentSales() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['recent-messages'],
    queryFn: async () => {
      const res = await api.get('/most-recent-messages');
      return res.data
    },
    refetchInterval: 5000
  })
  if (isLoading || !data || error) {
    return <Loader />
  }
  return (
    <div className="space-y-8 overflow-auto">
      {data.map((sale) => (
        <div key={sale.id} className="flex items-center">
          <Avatar className={`h-9 w-9 ${sale.id === 2 ? "flex items-center justify-center space-y-0 border" : ""}`}>
            <AvatarFallback>{sale.avatarFallback}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{sale.name}</p>
            <p className="text-sm text-muted-foreground">
              {sale.phone}
            </p>
          </div>
          <div className="ml-auto font-medium">{formatDistanceToNow(sale.createdAt, { locale: ptBR, includeSeconds: true })}</div>
        </div>
      ))}
    </div>
  );
}