export enum ServerSignals {
  NEW_CLIENT = 'new.client',
  GET_CLIENT = 'get.client'
}

export enum ClientSignals {
  CLIENT_UPDATE = 'client.update',
  QR = 'QR',
  CLIENT_SUCESS = 'client.success',
  CLIENT_FAIL = 'client.fail'
}

export function mountRequest(event: string, uuid: string, data?: any) {
  return JSON.stringify({
    event,
    data,
    send_date: new Date().toISOString(),
    uuid
  } as WebSocketRequest);
}

export type WebSocketResponse = {
  event: (typeof ClientSignals)[keyof typeof ClientSignals];
  data: any;
  uuid: string;
  message: string;
  send_date: string;
};

export type WebSocketRequest = {
  event: (typeof ServerSignals)[keyof typeof ServerSignals];
  data: any;
  uuid: string;
  send_date: string;
};
