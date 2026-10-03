import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tag, Database, Trash2, Layers } from "lucide-react";
import { useBatchClusterContacts, useBatchFieldContacts, useDeleteContacts } from "@/hooks/use-api-queries";

interface BatchActionsModalProps {
  selectedContactIds: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusters: Array<{ id: number; name: string }>;
  onCompleted: () => void;
}

export function BatchActionsModal({
  selectedContactIds,
  open,
  onOpenChange,
  clusters,
  onCompleted,
}: BatchActionsModalProps) {
  const batchClusterMutation = useBatchClusterContacts();
  const batchFieldMutation = useBatchFieldContacts();
  const deleteContactsMutation = useDeleteContacts();

  const [activeTab, setActiveTab] = useState<"CLUSTER" | "FIELD" | "DELETE">("CLUSTER");
  const [selectedClusterIds, setSelectedClusterIds] = useState<number[]>([]);
  const [clusterAction, setClusterAction] = useState<"ADD" | "REMOVE" | "SET">("ADD");
  const [fieldKey, setFieldKey] = useState("");
  const [fieldValue, setFieldValue] = useState("");

  const toggleCluster = (id: number) => {
    setSelectedClusterIds((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id]
    );
  };

  const handleApplyClusters = () => {
    if (selectedClusterIds.length === 0) return;
    batchClusterMutation.mutate(
      {
        contactIds: selectedContactIds,
        clusterIds: selectedClusterIds,
        action: clusterAction,
      },
      {
        onSuccess: () => {
          onCompleted();
          onOpenChange(false);
        },
      }
    );
  };

  const handleApplyField = () => {
    if (!fieldKey) return;
    batchFieldMutation.mutate(
      {
        contactIds: selectedContactIds,
        fieldKey: fieldKey.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_"),
        fieldValue,
      },
      {
        onSuccess: () => {
          onCompleted();
          onOpenChange(false);
        },
      }
    );
  };

  const handleDelete = () => {
    deleteContactsMutation.mutate(selectedContactIds, {
      onSuccess: () => {
        onCompleted();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] bg-card border-border/80 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Ações em Lote ({selectedContactIds.length} selecionados)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Aplique alterações simultaneamente em todos os contatos selecionados.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-3 bg-muted/50 p-1">
            <TabsTrigger value="CLUSTER" className="text-xs gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Clusters
            </TabsTrigger>
            <TabsTrigger value="FIELD" className="text-xs gap-1.5">
              <Database className="h-3.5 w-3.5" /> Campo Dinâmico
            </TabsTrigger>
            <TabsTrigger value="DELETE" className="text-xs gap-1.5 text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CLUSTERS EM LOTE */}
          <TabsContent value="CLUSTER" className="space-y-4 pt-3">
            <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-lg">
              <Button
                type="button"
                size="sm"
                variant={clusterAction === "ADD" ? "default" : "ghost"}
                onClick={() => setClusterAction("ADD")}
                className="flex-1 h-7 text-xs"
              >
                Adicionar aos selecionados
              </Button>
              <Button
                type="button"
                size="sm"
                variant={clusterAction === "REMOVE" ? "default" : "ghost"}
                onClick={() => setClusterAction("REMOVE")}
                className="flex-1 h-7 text-xs"
              >
                Remover dos selecionados
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto p-1">
              {clusters.map((c) => {
                const checked = selectedClusterIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCluster(c.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all text-xs ${
                      checked
                        ? "bg-purple-500/10 border-purple-500/40 text-purple-300 font-medium"
                        : "bg-background/60 border-border/40 text-muted-foreground"
                    }`}
                  >
                    <Checkbox checked={checked} />
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={handleApplyClusters}
              disabled={selectedClusterIds.length === 0 || batchClusterMutation.isPending}
              className="w-full h-8 text-xs font-medium"
            >
              Aplicar Segmentação em Lote
            </Button>
          </TabsContent>

          {/* TAB 2: CAMPOS DINÂMICOS EM LOTE */}
          <TabsContent value="FIELD" className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Chave do Atributo</Label>
              <Input
                placeholder="ex: status, plano, origem"
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Valor a Atribuir a Todos</Label>
              <Input
                placeholder="ex: Qualificado, Premium, Campanha Instagram"
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>

            <Button
              onClick={handleApplyField}
              disabled={!fieldKey || batchFieldMutation.isPending}
              className="w-full h-8 text-xs font-medium mt-2"
            >
              Atualizar Atributo em {selectedContactIds.length} Contato(s)
            </Button>
          </TabsContent>

          {/* TAB 3: EXCLUSÃO EM LOTE */}
          <TabsContent value="DELETE" className="space-y-3 pt-3">
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
              <p className="font-semibold">Atenção!</p>
              <p>Esta ação excluirá permanentemente os {selectedContactIds.length} contatos selecionados.</p>
            </div>

            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteContactsMutation.isPending}
              className="w-full h-8 text-xs font-medium"
            >
              Confirmar Exclusão de {selectedContactIds.length} Contato(s)
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-2 border-t border-border/40">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
