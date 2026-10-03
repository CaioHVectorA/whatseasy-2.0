export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  password?: string;
}

export interface CreateContactRequest {
  name: string;
  phone: string;
  clusterId?: number | null;
}

export interface MoveContactsRequest {
  contactIds: number[];
  clusterId: number | null;
}

export interface DeleteContactsRequest {
  contactIds: number[];
}

export interface SendMessageRequest {
  phone: string;
  message: string;
}

export interface SendBulkMessageRequest {
  contactIds: number[];
  message: string;
}

export interface CreateClusterRequest {
  name: string;
  description?: string;
}

export interface UpdateClusterRequest {
  name: string;
  description?: string;
}

export interface CreateReactiveRequest {
  name: string;
  active?: boolean;
  textTriggers: Array<{
    text: string;
    type: "EQUALS" | "CONTAINS" | "STARTS_WITH" | "ENDS_WITH" | "REGEX";
  }>;
  responses: Array<{
    content: string;
    type?: string;
  }>;
  clusterIds?: number[];
  delaySeconds?: number;
  actionType?: string;
  actionConfig?: Record<string, any>;
}

export interface UpdateReactiveRequest extends CreateReactiveRequest {}

export interface CreateTriggerRequest {
  name: string;
  active?: boolean;
  type: "SPECIFIC_TIME" | "RECURRING_DAILY" | "INACTIVITY_DAYS" | "ON_CLUSTER_ENTER";
  targetTime?: string;
  inactivityDays?: number;
  cron?: string;
  clusterIds?: number[];
  responses: Array<{
    content: string;
    type?: string;
  }>;
  delaySeconds?: number;
  actionType?: string;
}