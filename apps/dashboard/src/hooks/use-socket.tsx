import { Loader } from '@/components/loader'
import { WebSocketResponse } from '@/lib/ws'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { BaseUrl } from '@/constants/base-url'
import { User } from '@/types/user'
import { Error } from '@/components/error-page'

const URL = BaseUrl.getWSUrl()

export function useSocket() {
    const [socket, setSocket] = useState<WebSocket>()
    const [connected, setConnected] = useState(false)
    const [error, setError] = useState<string>()
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()
    useEffect(() => {
        let ws: WebSocket | undefined

        try {
            ws = new WebSocket(URL)

            ws.onopen = () => {
                setConnected(true)
                setSocket(ws)
                setLoading(false)
            }

            ws.onclose = (event) => {
                setConnected(false)
                setSocket(undefined)
                if (!event.wasClean) {
                    console.error(`WebSocket closed unexpectedly: Code ${event.code}, Reason: ${event.reason}`)
                    // setError(`Unexpected closure: ${event.reason || 'Unknown reason'}`)
                }
            }
            ws.onerror = (e) => {
                console.error(`WebSocket encountered an error: ${e.type}`)
                console.log({ e })
                setConnected(false)
                setLoading(false)
                setError(`Erro na conexão de websocket`)
            }
            ws.onmessage = (e) => {
                const data = JSON.parse(e.data) as WebSocketResponse
                console.log({ data })
                toast({
                    title: data.message,
                })
            }
        } catch (err) {
            console.error(`Failed to create WebSocket: ${err}`)
            setError(`Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }

        return () => {
            if (ws?.readyState === WebSocket.OPEN) {
                ws.close()  // Fecha o WebSocket se ele estiver aberto
            }
        }
    }, [])

    return { socket, connected, error, loading }
}

export type WebsocketResponse = {
    event: string,
    message: string,
    clientUUid: string,
    data: string,
    send_date: string,
}
export function withSocket(Component: React.FC<{ socket: WebSocket, user: User, connected: boolean }>) {
    return function WrapperComponent({ user }: { user: User }) {
        const { connected, error, socket, loading } = useSocket();
        if (loading) return <Loader />
        if (!socket) return <Error cause={error || "Erro no servidor"} />
        return <Component socket={socket} user={user} connected={connected} />
    }
}