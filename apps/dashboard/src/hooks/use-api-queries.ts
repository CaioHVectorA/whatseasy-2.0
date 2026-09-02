import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCookie } from "@/lib/cookies";

const API_BASE = "http://localhost:3333";

function getAuthHeaders(hasBody = false) {
  const token = getCookie("token") || localStorage.getItem("token");
  return {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const hasBody = Boolean(options.body);
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(hasBody),
      ...(options.headers || {}),
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || "Erro ao processar requisição.");
  }
  return json.data !== undefined ? json.data : json;
}

// ================= DASHBOARD ================= //
export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<any>("/user/dashboard"),
    refetchInterval: 10000,
  });
}

// ================= WHATSAPP STATUS ================= //
export function useWhatsAppStatus() {
  return useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: () => apiFetch<any>("/whatsapp/status"),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "CONNECTING" || status === "QR_READY" || status === "RECONNECTING" ? 2000 : 8000;
    },
  });
}

export function useConnectWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<any>("/whatsapp/connect", { method: "POST" }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-status"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.info("Iniciando conexão...", { description: "Carregando o QR Code." });
    },
    onError: (err: any) => {
      toast.error("Erro ao conectar", { description: err.message });
    },
  });
}

export function useLogoutWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<any>("/whatsapp/logout", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-status"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("WhatsApp desconectado com sucesso.");
    },
    onError: (err: any) => {
      toast.error("Erro ao desconectar", { description: err.message });
    },
  });
}

// ================= CONTATOS ================= //
export function useContacts(params?: { search?: string; clusterId?: string; clusterIds?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.set("search", params.search);
  if (params?.clusterId) queryParams.set("clusterId", params.clusterId);
  if (params?.clusterIds) queryParams.set("clusterIds", params.clusterIds);

  const qs = queryParams.toString();
  return useQuery({
    queryKey: ["contacts", params?.search || "", params?.clusterId || "", params?.clusterIds || ""],
    queryFn: () =>
      apiFetch<{ contacts: any[]; clusters: any[]; customFieldDefs: any[]; totalCount: number }>(
        `/contacts${qs ? `?${qs}` : ""}`
      ),
  });
}

export function useClusterContacts(clusterId?: number | null) {
  return useQuery({
    queryKey: ["cluster-contacts", clusterId],
    queryFn: () =>
      apiFetch<{ cluster: any; contacts: any[]; totalContacts: number }>(
        `/clusters/${clusterId}/contacts`
      ),
    enabled: Boolean(clusterId),
  });
}

export function useSendContactMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, message }: { contactId: number; message: string }) =>
      apiFetch<any>(`/contacts/${contactId}/send-message`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Mensagem enviada com sucesso no WhatsApp!");
    },
    onError: (err: any) =>
      toast.error("Erro ao enviar mensagem", { description: err.message }),
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; phone: string; clusterIds?: number[]; customFields?: Record<string, any> }) =>
      apiFetch<any>("/contact", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Contato cadastrado com sucesso!");
    },
    onError: (err: any) => toast.error("Erro ao salvar contato", { description: err.message }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; phone?: string; clusterIds?: number[]; customFields?: Record<string, any> }) =>
      apiFetch<any>(`/contacts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato atualizado com sucesso!");
    },
    onError: (err: any) => toast.error("Erro ao atualizar contato", { description: err.message }),
  });
}

export function useDeleteContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactIds: number[]) =>
      apiFetch<any>("/contacts", { method: "DELETE", body: JSON.stringify({ contactIds }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Contatos excluídos com sucesso!");
    },
    onError: (err: any) => toast.error("Erro ao excluir", { description: err.message }),
  });
}

export function useBatchClusterContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { contactIds: number[]; clusterIds: number[]; action: "ADD" | "REMOVE" | "SET" }) =>
      apiFetch<any>("/contacts/batch-clusters", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Segmentações atualizadas com sucesso!");
    },
    onError: (err: any) => toast.error("Erro na operação em lote", { description: err.message }),
  });
}

export function useBatchFieldContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { contactIds: number[]; fieldKey: string; fieldValue: string }) =>
      apiFetch<any>("/contacts/batch-field", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Dados dinâmicos atualizados!");
    },
    onError: (err: any) => toast.error("Erro ao atualizar campos", { description: err.message }),
  });
}

// ================= BANCO DINÂMICO (CUSTOM FIELDS) ================= //
export function useCustomFields() {
  return useQuery({
    queryKey: ["custom-fields"],
    queryFn: () => apiFetch<any[]>("/custom-fields"),
  });
}

export function useSaveCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      key: string;
      label: string;
      type: string;
      options?: string[];
      mask?: string;
      regex?: string;
      min?: number;
      max?: number;
      description?: string;
      placeholder?: string;
      required?: boolean;
    }) =>
      apiFetch<any>("/custom-fields", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-fields"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Campo dinâmico configurado com sucesso!");
    },
    onError: (err: any) => toast.error("Erro ao salvar campo dinâmico", { description: err.message }),
  });
}

export function useDeleteCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/custom-fields/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-fields"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Campo dinâmico removido!");
    },
    onError: (err: any) => toast.error("Erro ao excluir", { description: err.message }),
  });
}

// ================= CLUSTERS ================= //
export function useClusters() {
  const { data } = useContacts();
  return {
    clusters: data?.clusters || [],
  };
}

export function useCreateCluster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiFetch<any>("/clusters", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Cluster criado com sucesso!");
    },
    onError: (err: any) => toast.error("Erro ao criar cluster", { description: err.message }),
  });
}

export function useDeleteCluster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/clusters/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Cluster excluído com sucesso!");
    },
    onError: (err: any) => toast.error("Erro ao excluir cluster", { description: err.message }),
  });
}

export function useSendClusterMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clusterId, message }: { clusterId: number; message: string }) =>
      apiFetch<any>(`/clusters/${clusterId}/send-message`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["logs"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(data?.message || "Mensagens disparadas para o cluster com sucesso!");
    },
    onError: (err: any) =>
      toast.error("Erro ao disparar mensagens", { description: err.message }),
  });
}

// ================= REATIVOS (RESPOSTAS INTELIGENTES & BLOCOS) ================= //
export function useReactives() {
  return useQuery({
    queryKey: ["reactives"],
    queryFn: () => apiFetch<any[]>("/reactives"),
  });
}

export function useSaveReactive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id?: number; name: string; active?: boolean; delaySeconds?: number; textTriggers: any[]; responses: any[]; clusterIds?: number[]; actionConfig?: any }) => {
      if (id) {
        return apiFetch<any>(`/reactives/${id}`, { method: "PUT", body: JSON.stringify(data) });
      }
      return apiFetch<any>("/reactives", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reactives"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Automação reativa salva com sucesso!");
    },
    onError: (err: any) => toast.error("Erro ao salvar reativo", { description: err.message }),
  });
}

export function useToggleReactive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/reactives/${id}/toggle`, { method: "PATCH" }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reactives"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(data?.active ? "Reativo ativado!" : "Reativo pausado.");
    },
    onError: (err: any) => toast.error("Erro ao alternar reativo", { description: err.message }),
  });
}

export function useDeleteReactive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/reactives/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reactives"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Reativo excluído!");
    },
    onError: (err: any) => toast.error("Erro ao excluir", { description: err.message }),
  });
}

// ================= GATILHOS TEMPORAIS & REMARKETING ================= //
export function useTriggers() {
  return useQuery({
    queryKey: ["triggers"],
    queryFn: () => apiFetch<any[]>("/triggers"),
  });
}

export function useSaveTrigger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => {
      if (id) {
        return apiFetch<any>(`/triggers/${id}`, { method: "PUT", body: JSON.stringify(data) });
      }
      return apiFetch<any>("/triggers", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["triggers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Gatilho salvo com sucesso!");
    },
    onError: (err: any) => toast.error("Erro ao salvar gatilho", { description: err.message }),
  });
}

export function useToggleTrigger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/triggers/${id}/toggle`, { method: "PATCH" }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["triggers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(data?.active ? "Gatilho ativado!" : "Gatilho pausado.");
    },
    onError: (err: any) => toast.error("Erro ao alternar gatilho", { description: err.message }),
  });
}

export function useDeleteTrigger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/triggers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["triggers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Gatilho excluído!");
    },
    onError: (err: any) => toast.error("Erro ao excluir", { description: err.message }),
  });
}

// ================= LOGS ================= //
export function useLogs(params?: { eventType?: string; status?: string }) {
  const qp = new URLSearchParams();
  if (params?.eventType && params.eventType !== "ALL") qp.set("eventType", params.eventType);
  if (params?.status && params.status !== "ALL") qp.set("status", params.status);

  const qs = qp.toString();
  return useQuery({
    queryKey: ["logs", params],
    queryFn: () => apiFetch<{ logs: any[]; total: number }>(`/logs${qs ? `?${qs}` : ""}`),
    refetchInterval: 5000,
  });
}
