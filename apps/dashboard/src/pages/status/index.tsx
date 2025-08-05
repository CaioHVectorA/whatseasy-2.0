import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogTitle,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast"
import { WebsocketResponse, withSocket } from "@/hooks/use-socket"
import { withUser } from "@/hooks/use-user"
import { ClientSignals, ServerSignals, mountRequest } from "@/lib/ws"
import { User } from "@/types/user"
import { useEffect, useState } from "react"
import { LoadingRing } from "@/components/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ClientLog {
    id: string;
    type: string;
    createdAt: string;
}

interface ClientMetrics {
    totalSyncs: number;
    lastConnection: string | null;
    logs: ClientLog[];
}

function StatusBase({ socket, user }: { socket: WebSocket, user: User }) {
    const [qrCode, setQrCode] = useState<string>();
    const [connected, setConnected] = useState(false);
    const { toast } = useToast()
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: metrics, isLoading } = useQuery({
        queryKey: ['client-metrics'],
        queryFn: async () => {
            const response = await api.get<{ data: ClientMetrics }>('/user/client-logs');
            return response.data.data;
        },
        refetchInterval: 30000, // Atualiza a cada 30 segundos
    });

    // Verifica o status inicial de conexão
    useEffect(() => {
        socket.send(mountRequest(ServerSignals.GET_CLIENT, user.id));
    }, [socket, user.id]);

    useEffect(() => {
        socket.onmessage = (e) => {
            const data = JSON.parse(e.data) as WebsocketResponse;
            try {
                const response = data as WebsocketResponse;
                if (response.event == ClientSignals.QR) {
                    setQrCode(response.data);
                }
                if (response.event == ClientSignals.CLIENT_SUCESS) {
                    setConnected(true);
                    setIsModalOpen(false);
                }
                if (response.event == ClientSignals.CLIENT_UPDATE) {
                    let normalizedData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                    setConnected(normalizedData.isConnected || false);
                }
            } catch (error) {
                console.log(e.data, e.origin, error);
            }
            toast({ title: data.message })
        };
    }, [socket])

    const syncCount = metrics?.logs.filter(log => log.type === 'SYNC').length || 0;
    const lastConnection = metrics?.logs.find(log => log.type === 'CONNECT')?.createdAt;

    return (
        <main className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Status do Cliente</h1>
                <Badge variant={connected ? "default" : "destructive"} className="text-lg">
                    {connected ? "Conectado" : "Desconectado"}
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Total de Sincronizações</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{syncCount}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Última Conexão</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg">
                            {lastConnection
                                ? format(new Date(lastConnection), "PPpp", { locale: ptBR })
                                : "Nunca conectado"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Ações</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!connected && (
                            <Button
                                onClick={() => {
                                    socket.send(mountRequest(ServerSignals.NEW_CLIENT, user.id))
                                    setIsModalOpen(true);
                                }}
                                className="w-full"
                            >
                                Conectar Cliente
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center">
                            <LoadingRing />
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                            {metrics?.logs.map((log) => (
                                <div key={log.id} className="flex justify-between items-center p-2 bg-muted rounded">
                                    <span className="font-medium">{log.type}</span>
                                    <span className="text-sm text-muted-foreground">
                                        {format(new Date(log.createdAt), "PPpp", { locale: ptBR })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {qrCode ? 'Scanneie o QR Code!' : 'Seu QR Code está sendo gerado...'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {qrCode ? <img src={qrCode} alt="QR Code" className="mx-auto" /> : <LoadingRing />}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    )
}

export const Status = withUser(withSocket(StatusBase))