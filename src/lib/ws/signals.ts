export enum ServerSignals {
    NEW_CLIENT = 'new.client',
    GET_CLIENT = 'get.client',
}

export enum ClientSignals {
    CLIENT_UPDATE = 'client.update',
    QR = 'QR',
    CLIENT_SUCESS = 'client.success',
    CLIENT_FAIL = 'client.fail',
}

export type WebSocketResponse = {
    event: typeof ClientSignals[keyof typeof ClientSignals],
    data: any,
    uuid: string,
    message: string,
    send_date: string
}

export type WebSocketRequest = {
    event: typeof ServerSignals[keyof typeof ServerSignals],
    data: any,
    uuid: string,
    send_date: string
}