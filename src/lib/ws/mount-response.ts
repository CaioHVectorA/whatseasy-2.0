type WebsocketResponse = {
    event: string,
    message: string,
    clientUUid: string,
    data: string,
    send_date: string,
}

export function mountResponse(event: string, message: string, clientUUid: string, data: any = {}): string {
    return JSON.stringify({
        event,
        message,
        clientUUid,
        data,
        send_date: new Date().toISOString()
    })
}

export function mountApiResponse(data: any, toastMessage?: string, message?: string) {
    return {
        message,
        toastMessage: message,
        data,
    }
}