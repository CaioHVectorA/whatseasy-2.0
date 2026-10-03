export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  Client?: {
    id: number;
    status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';
    isConnected: boolean;
    phone?: string | null;
    name?: string | null;
    last_conn?: string | null;
    last_sync?: string | null;
  } | null;
}

export interface Contact {
  id: number;
  phone: string;
  name: string;
  clusterId?: number | null;
  lastInteraction?: string | null;
  createdAt: string;
  updatedAt: string;
  Cluster?: {
    id: number;
    name: string;
  } | null;
}

export interface Cluster {
  id: number;
  name: string;
  description?: string | null;
  totalContacts?: number;
}

export interface Reactive {
  id: number;
  name: string;
  active: boolean;
  delaySeconds: number;
  usageCount: number;
  actionType?: string | null;
  textTriggers: Array<{
    id?: number;
    text: string;
    type: 'EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX';
  }>;
  responses: Array<{
    id?: number;
    content: string;
    type?: string;
  }>;
  clusters: Array<{
    id: number;
    name: string;
    included: boolean;
  }>;
  createdAt: string;
}

export interface TriggerItem {
  id: number;
  name: string;
  active: boolean;
  usageCount: number;
  condition?: {
    type: 'SPECIFIC_TIME' | 'RECURRING_DAILY' | 'INACTIVITY_DAYS' | 'ON_CLUSTER_ENTER';
    targetTime?: string | null;
    inactivityDays?: number | null;
    cron?: string | null;
  } | null;
  responses: Array<{
    id?: number;
    content: string;
  }>;
  clusters: Array<{
    id: number;
    name: string;
  }>;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  userId: string;
  eventType: string;
  description: string;
  contactPhone?: string | null;
  contactName?: string | null;
  automationType?: string | null;
  automationId?: number | null;
  status: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';
  metadata?: string | null;
  createdAt: string;
}
