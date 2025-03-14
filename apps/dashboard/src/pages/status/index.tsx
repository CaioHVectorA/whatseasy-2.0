import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogTitle,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, AlertDialogPortal, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast"
import { WebsocketResponse, withSocket } from "@/hooks/use-socket"
import { withUser } from "@/hooks/use-user"
import { ClientSignals, ServerSignals, mountRequest } from "@/lib/ws"
import { User } from "@/types/user"
import { useEffect, useState } from "react"
import { LoadingRing } from "@/components/loader";
function StatusBase({ socket, user }: { socket: WebSocket, user: User }) {
    const [qrCode, setQrCode] = useState<string>();
    const [connected, setConnected] = useState(false);
    const { toast } = useToast()
    const [isModalOpen, setIsModalOpen] = useState(false);
    useEffect(() => {
        socket.onmessage = (e) => {
            const data = JSON.parse(e.data) as WebsocketResponse;
            console.log({ data })
            try {
                const response = data as WebsocketResponse;
                if (response.event == ClientSignals.QR) {
                    setQrCode(response.data);
                }
                if (response.event == ClientSignals.CLIENT_SUCESS) {
                    setConnected(true);
                    setIsModalOpen(false);
                }
            } catch (error) {
                console.log(e.data, e.origin);
            }
            toast({ title: data.message })
        };
    }, [socket])
    return (
        <main className=" p-6">
            <h1 className=" text-3xl mb-4">Status</h1>
            <h3 className="text-xl font-bold">
                Você está {connected ? "conectado" : "desconectado"}
            </h3>
            {!connected && (
                <Button onClick={() => {
                    socket.send(mountRequest(ServerSignals.NEW_CLIENT, user.id))
                    setIsModalOpen(true);

                }}>
                    Conectar
                </Button>
            )}
            <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{qrCode ? 'Scanneie o QR Code!' : 'Seu QR Code está sendo gerado...'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {qrCode ? <img src={qrCode} alt="QR Code" /> : <LoadingRing />}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        {/* <AlertDialogCancel>Cancel</AlertDialogCancel> */}
                        {/* <AlertDialogAction>Continue</AlertDialogAction> */}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main >
    )
}
export const Status = withUser(withSocket(StatusBase))