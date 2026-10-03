import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Users,
  Search,
  Tag,
  Database,
  Layers,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Edit,
  UserPlus,
  BarChart2,
  Send,
  GripVertical,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  useContacts,
  useCreateContact,
  useCreateCluster,
  useBatchClusterContacts,
} from "@/hooks/use-api-queries";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CustomFieldsManager } from "@/components/contacts/custom-fields-manager";
import { ContactDetailsDrawer } from "@/components/contacts/contact-details-drawer";
import { BatchActionsModal } from "@/components/contacts/batch-actions-modal";
import { ClusterDetailsModal } from "@/components/contacts/cluster-details-modal";
import { SendDirectMessageModal } from "@/components/contacts/send-direct-message-modal";
import { useDebounce } from "use-debounce";
import { formatPhoneNumber } from "@/lib/utils";

const columnHelper = createColumnHelper<any>();
const EMPTY_CONTACTS: any[] = [];
const EMPTY_CLUSTERS: any[] = [];

export default function ContactsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<string>("ALL");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });

  // Modais e Drawers
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [createClusterOpen, setCreateClusterOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [selectedClusterDetails, setSelectedClusterDetails] = useState<any | null>(null);
  const [directMessageContact, setDirectMessageContact] = useState<any | null>(null);

  // Form states para criação
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newClusterName, setNewClusterName] = useState("");
  const [newClusterDesc, setNewClusterDesc] = useState("");

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      clusterId: selectedClusterFilter !== "ALL" ? selectedClusterFilter : undefined,
    }),
    [debouncedSearch, selectedClusterFilter]
  );

  const { data, isLoading } = useContacts(queryParams);

  const contacts = data?.contacts ?? EMPTY_CONTACTS;
  const clusters = data?.clusters ?? EMPTY_CLUSTERS;

  const createContactMutation = useCreateContact();
  const createClusterMutation = useCreateCluster();
  const batchClusterMutation = useBatchClusterContacts();

  // Estados de Drag & Drop tátil para Clusters
  const [draggedContact, setDraggedContact] = useState<any | null>(null);
  const [dragOverClusterId, setDragOverClusterId] = useState<number | null>(null);

  const selectedContactIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((idx) => contacts[Number(idx)]?.id)
      .filter(Boolean);
  }, [rowSelection, contacts]);

  const handleCreateContact = () => {
    if (!newName || !newPhone) return;
    createContactMutation.mutate(
      { name: newName, phone: newPhone },
      {
        onSuccess: () => {
          setCreateContactOpen(false);
          setNewName("");
          setNewPhone("");
        },
      }
    );
  };

  const handleCreateCluster = () => {
    if (!newClusterName) return;
    createClusterMutation.mutate(
      { name: newClusterName, description: newClusterDesc },
      {
        onSuccess: () => {
          setCreateClusterOpen(false);
          setNewClusterName("");
          setNewClusterDesc("");
        },
      }
    );
  };

  // Drop tátil sobre o card de um cluster
  const handleDropOnCluster = (clusterId: number, clusterName: string) => {
    if (!draggedContact) return;
    const targetIds = selectedContactIds.includes(draggedContact.id)
      ? selectedContactIds
      : [draggedContact.id];

    batchClusterMutation.mutate(
      {
        contactIds: targetIds,
        clusterIds: [clusterId],
        action: "ADD",
      },
      {
        onSuccess: () => {
          toast.success(
            targetIds.length > 1
              ? `${targetIds.length} contatos vinculados ao cluster "${clusterName}"!`
              : `"${draggedContact.name}" vinculado ao cluster "${clusterName}"!`
          );
          setDraggedContact(null);
          setDragOverClusterId(null);
        },
      }
    );
  };

  const handleQuickAddToCluster = (contactId: number, clusterId: number, clusterName: string) => {
    batchClusterMutation.mutate(
      {
        contactIds: [contactId],
        clusterIds: [clusterId],
        action: "ADD",
      },
      {
        onSuccess: () => toast.success(`Vinculado ao cluster "${clusterName}"!`),
      }
    );
  };

  const handleQuickRemoveFromCluster = (contactId: number, clusterId: number, clusterName: string) => {
    batchClusterMutation.mutate(
      {
        contactIds: [contactId],
        clusterIds: [clusterId],
        action: "REMOVE",
      },
      {
        onSuccess: () => toast.info(`Removido do cluster "${clusterName}".`),
      }
    );
  };

  // TanStack Table Column Definitions
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
              aria-label="Selecionar todos"
              className="rounded"
            />
          </div>
        ),
        cell: ({ row }) => {
          const contact = row.original;
          return (
            <div className="flex items-center gap-1">
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", String(contact.id));
                  setDraggedContact(contact);
                }}
                onDragEnd={() => {
                  setDraggedContact(null);
                  setDragOverClusterId(null);
                }}
                className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-purple-400 p-0.5 rounded hover:bg-purple-500/10 transition-colors"
                title="Arraste e solte em um cluster acima"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </div>
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(val) => row.toggleSelected(!!val)}
                aria-label="Selecionar linha"
                className="rounded"
              />
            </div>
          );
        },
        enableSorting: false,
      }),
      columnHelper.accessor("name", {
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 text-xs font-semibold gap-1"
          >
            Nome do Contato <ArrowUpDown className="h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const contact = row.original;
          return (
            <div
              onClick={() => setSelectedContact(contact)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                {contact.name ? contact.name.charAt(0).toUpperCase() : "C"}
              </div>
              <div>
                <span className="font-semibold text-foreground text-xs group-hover:text-primary transition-colors block">
                  {contact.name}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {formatPhoneNumber(contact.phone)}
                </span>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("clusters", {
        header: "Clusters / Segmentos (N:N)",
        cell: ({ row }) => {
          const contact = row.original;
          const contactClusters = contact.clusters || [];
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {contactClusters.map((cl: any) => (
                <Badge
                  key={cl.id}
                  variant="outline"
                  className="group/badge text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-400 border-purple-500/25 font-medium flex items-center gap-1 transition-all"
                >
                  <span>{cl.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickRemoveFromCluster(contact.id, cl.id, cl.name);
                    }}
                    className="opacity-50 hover:opacity-100 hover:text-destructive hover:bg-destructive/10 rounded px-0.5 font-bold text-xs"
                    title={`Remover de ${cl.name}`}
                  >
                    ×
                  </button>
                </Badge>
              ))}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-5 w-5 rounded-full bg-muted/50 hover:bg-purple-500/20 text-muted-foreground hover:text-purple-400 flex items-center justify-center text-xs font-bold transition-colors border border-dashed border-border/60"
                    title="Vincular a um cluster"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="text-xs min-w-[150px]">
                  <DropdownMenuLabel className="text-[10px] text-muted-foreground">Vincular Cluster</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {clusters.filter((cl: any) => !contactClusters.some((c: any) => c.id === cl.id)).length === 0 ? (
                    <div className="px-2 py-1.5 text-[11px] text-muted-foreground italic">
                      Todos vinculados
                    </div>
                  ) : (
                    clusters
                      .filter((cl: any) => !contactClusters.some((c: any) => c.id === cl.id))
                      .map((cl: any) => (
                        <DropdownMenuItem
                          key={cl.id}
                          onClick={() => handleQuickAddToCluster(contact.id, cl.id, cl.name)}
                          className="cursor-pointer gap-2 text-xs"
                        >
                          <Tag className="h-3 w-3 text-purple-400" />
                          <span>{cl.name}</span>
                        </DropdownMenuItem>
                      ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      }),
      columnHelper.accessor("customFields", {
        header: "Atributos Dinâmicos",
        cell: ({ row }) => {
          const fields = row.original.customFields || {};
          const entries = Object.entries(fields);
          if (entries.length === 0) {
            return <span className="text-xs text-muted-foreground/60 italic">Nenhum</span>;
          }
          return (
            <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
              {entries.slice(0, 2).map(([k, v]) => (
                <span
                  key={k}
                  className="px-1.5 py-0.5 rounded bg-muted/60 text-[10px] font-mono text-muted-foreground border border-border/40 truncate max-w-[100px]"
                  title={`${k}: ${v}`}
                >
                  <strong className="text-foreground">{k}:</strong> {String(v)}
                </span>
              ))}
              {entries.length > 2 && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  +{entries.length - 2}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("lastInteraction", {
        header: "Última Interação",
        cell: ({ row }) => {
          const val = row.original.lastInteraction;
          if (!val) return <span className="text-xs text-muted-foreground/60">Nunca</span>;
          const d = new Date(val);
          return (
            <span className="text-xs text-muted-foreground font-mono">
              {d.toLocaleDateString("pt-BR")} às {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          const contact = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDirectMessageContact(contact)}
                className="h-7 text-xs gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 font-medium"
                title="Enviar Mensagem no WhatsApp"
              >
                <Send className="h-3 w-3" /> Mensagem
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedContact(contact)}
                className="h-7 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
              >
                <Edit className="h-3 w-3" /> Editar
              </Button>
            </div>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: contacts,
    columns,
    state: {
      sorting,
      rowSelection,
      pagination,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header com Ações Rápidas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="h-6 w-6 text-primary" /> Contatos & Segmentação
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Gestão de contatos com suporte a múltiplos clusters e banco de dados dinâmico chave-valor.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/banco-dados")}
            className="h-8 text-xs gap-1.5 border-border/60 hover:border-primary/40 text-foreground"
          >
            <Database className="h-3.5 w-3.5 text-emerald-400" /> Banco Dinâmico
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateClusterOpen(true)}
            className="h-8 text-xs gap-1.5 border-border/60 hover:border-purple-500/40 text-foreground"
          >
            <Tag className="h-3.5 w-3.5 text-purple-400" /> Novo Cluster
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateContactOpen(true)}
            className="h-8 text-xs gap-1.5 font-medium shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" /> Adicionar Contato
          </Button>
        </div>
      </div>

      {/* Barra Informativa Tátil durante o Arrasto de Contatos */}
      {draggedContact && (
        <div className="p-3.5 rounded-2xl bg-purple-600/20 border-2 border-purple-500/60 text-xs text-purple-200 flex items-center justify-between shadow-xl shadow-purple-950/50 animate-pulse transition-all">
          <span className="flex items-center gap-2 font-medium">
            <GripVertical className="h-4 w-4 text-purple-400" />
            Movendo contato <strong className="text-white">"{draggedContact.name}"</strong>
            {selectedContactIds.length > 1 && (
              <span className="bg-purple-500/30 px-2 py-0.5 rounded-full text-[11px] text-purple-200">
                + {selectedContactIds.length - 1} selecionado(s)
              </span>
            )}
          </span>
          <span className="text-[11px] font-semibold text-purple-300">
            Solte sobre qualquer card de cluster abaixo para vincular 🎯
          </span>
        </div>
      )}

      {/* Cards de Clusters (Carrossel / Grid Rápido de Filtros & Zonas de Drop) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => setSelectedClusterFilter("ALL")}
          className={`p-3 rounded-2xl border text-left transition-all ${
            selectedClusterFilter === "ALL"
              ? "bg-primary/10 border-primary/40 shadow-sm"
              : "bg-card/40 border-border/40 hover:border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Todos</span>
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground block mt-1">{contacts.length}</span>
        </button>

        {clusters.map((c: any) => {
          const isDragOver = dragOverClusterId === c.id;
          return (
            <div
              key={c.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverClusterId(c.id);
              }}
              onDragLeave={() => setDragOverClusterId(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnCluster(c.id, c.name);
              }}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between relative overflow-hidden ${
                isDragOver
                  ? "bg-purple-500/30 border-purple-400 ring-2 ring-purple-500 scale-[1.04] shadow-xl shadow-purple-900/50"
                  : selectedClusterFilter === String(c.id)
                  ? "bg-purple-500/10 border-purple-500/40 shadow-sm"
                  : "bg-card/40 border-border/40 hover:border-border"
              }`}
            >
              {isDragOver && (
                <div className="absolute inset-0 bg-purple-600/30 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-20">
                  <span className="text-[10px] font-bold text-white bg-purple-600 px-2.5 py-1 rounded-full shadow-lg animate-bounce">
                    Soltar para vincular
                  </span>
                </div>
              )}

              <div
                className="cursor-pointer"
                onClick={() => setSelectedClusterFilter(String(c.id))}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground truncate max-w-[85px]" title={c.name}>
                    {c.name}
                  </span>
                  <Tag className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <span className="text-lg font-bold text-foreground block mt-1">{c.totalContacts || 0}</span>
              </div>

              <div className="flex items-center justify-end gap-1 mt-2 pt-1 border-t border-border/30">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedClusterDetails(c);
                  }}
                  className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors"
                  title="Métricas & Disparo de Mensagens"
                >
                  <BarChart2 className="h-3 w-3" /> Detalhes & Disparo
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela Interativa TanStack Table */}
      <Card className="bg-card/60 backdrop-blur-md border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b border-border/40 bg-muted/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Campo de Pesquisa */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou atributo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs bg-background/50 border-border/50"
            />
          </div>

          {/* Ações em Lote quando selecionado */}
          {selectedContactIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
              <Badge variant="secondary" className="text-xs h-8 px-2.5 font-medium gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {selectedContactIds.length} selecionado(s)
              </Badge>
              <Button
                size="sm"
                variant="default"
                onClick={() => setBatchModalOpen(true)}
                className="h-8 text-xs gap-1.5 font-medium shadow-sm"
              >
                <Layers className="h-3.5 w-3.5" /> Ações em Lote
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground uppercase text-[11px] tracking-wider font-semibold">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="py-3 px-4">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                      Carregando contatos...
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                      Nenhum contato encontrado.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        row.getIsSelected() ? "bg-primary/5" : ""
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="py-3 px-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação da Tabela */}
          <div className="p-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Mostrando {table.getRowModel().rows.length} de {contacts.length} contatos
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium text-foreground px-2">
                Pág. {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drawer de Detalhes do Contato */}
      <ContactDetailsDrawer
        contact={selectedContact}
        open={Boolean(selectedContact)}
        onOpenChange={(op) => !op && setSelectedContact(null)}
        clusters={clusters}
        onOpenSendMessage={(c) => {
          setSelectedContact(null);
          setDirectMessageContact(c);
        }}
      />

      {/* Modal de Detalhes e Ações do Cluster */}
      <ClusterDetailsModal
        cluster={selectedClusterDetails}
        open={Boolean(selectedClusterDetails)}
        onOpenChange={(op) => !op && setSelectedClusterDetails(null)}
        allClusters={clusters}
        totalContactsCount={data?.totalCount ?? contacts.length}
      />

      {/* Modal de Envio Direto de Mensagem no WhatsApp */}
      <SendDirectMessageModal
        contact={directMessageContact}
        open={Boolean(directMessageContact)}
        onOpenChange={(op) => !op && setDirectMessageContact(null)}
      />

      {/* Gerenciador do Banco Dinâmico */}
      <CustomFieldsManager open={customFieldsOpen} onOpenChange={setCustomFieldsOpen} />

      {/* Modal de Ações em Lote */}
      <BatchActionsModal
        selectedContactIds={selectedContactIds}
        open={batchModalOpen}
        onOpenChange={setBatchModalOpen}
        clusters={clusters}
        onCompleted={() => setRowSelection({})}
      />

      {/* Modal Criar Contato */}
      <Dialog open={createContactOpen} onOpenChange={setCreateContactOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Novo Contato</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre um novo contato para automações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nome Completo</Label>
              <Input
                placeholder="ex: Lucas Martins"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Telefone com DDD</Label>
              <Input
                placeholder="ex: 5521999998888"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={() => setCreateContactOpen(false)} className="h-8 text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateContact}
              disabled={createContactMutation.isPending || !newName || !newPhone}
              className="h-8 text-xs font-medium"
            >
              Criar Contato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Criar Cluster */}
      <Dialog open={createClusterOpen} onOpenChange={setCreateClusterOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Novo Cluster</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Crie um novo grupo de segmentação para seus contatos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nome do Cluster</Label>
              <Input
                placeholder="ex: Clientes VIP, Leads Instagram"
                value={newClusterName}
                onChange={(e) => setNewClusterName(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
              <Input
                placeholder="ex: Clientes com compras acima de R$ 500"
                value={newClusterDesc}
                onChange={(e) => setNewClusterDesc(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={() => setCreateClusterOpen(false)} className="h-8 text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateCluster}
              disabled={createClusterMutation.isPending || !newClusterName}
              className="h-8 text-xs font-medium"
            >
              Criar Cluster
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
