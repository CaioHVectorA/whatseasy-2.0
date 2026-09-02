import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Phone,
  Tag,
  Database,
  Save,
  Trash2,
  Plus,
  Send,
} from "lucide-react";
import { useUpdateContact, useCustomFields } from "@/hooks/use-api-queries";
import { formatPhoneNumber } from "@/lib/utils";

interface ContactDetailsDrawerProps {
  contact: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusters: Array<{ id: number; name: string }>;
  onOpenSendMessage?: (contact: any) => void;
}

export function ContactDetailsDrawer({
  contact,
  open,
  onOpenChange,
  clusters,
  onOpenSendMessage,
}: ContactDetailsDrawerProps) {
  const updateContactMutation = useUpdateContact();
  const { data: definedFields = [] } = useCustomFields();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedClusterIds, setSelectedClusterIds] = useState<number[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  useEffect(() => {
    if (contact) {
      setName(contact.name || "");
      setPhone(contact.phone || "");
      const clusterIds = contact.clusters ? contact.clusters.map((c: any) => c.id) : [];
      if (contact.clusterId && !clusterIds.includes(contact.clusterId)) {
        clusterIds.push(contact.clusterId);
      }
      setSelectedClusterIds(clusterIds);
      setCustomFields(contact.customFields || {});
    }
  }, [contact]);

  const toggleCluster = (id: number) => {
    setSelectedClusterIds((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id]
    );
  };

  const updateFieldValue = (k: string, val: string) => {
    setCustomFields((prev) => ({ ...prev, [k]: val }));
  };

  const removeField = (k: string) => {
    setCustomFields((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const addCustomField = () => {
    if (!newKey) return;
    updateFieldValue(newKey.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_"), newVal);
    setNewKey("");
    setNewVal("");
  };

  const handleSave = () => {
    if (!contact) return;
    updateContactMutation.mutate(
      {
        id: contact.id,
        name,
        phone,
        clusterIds: selectedClusterIds,
        customFields,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto flex flex-col justify-between bg-card border-l border-border/80 shadow-2xl p-6">
        <div className="space-y-6">
          <SheetHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 shadow-sm">
                  {name ? name.charAt(0).toUpperCase() : "C"}
                </div>
                <div>
                  <SheetTitle className="text-base font-bold text-foreground">
                    {name || "Contato"}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 font-mono">
                    <Phone className="h-3 w-3 text-primary" /> {formatPhoneNumber(phone)}
                  </SheetDescription>
                </div>
              </div>

              {onOpenSendMessage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenSendMessage(contact)}
                  className="h-8 text-xs gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 font-medium"
                >
                  <Send className="h-3.5 w-3.5" /> Mensagem
                </Button>
              )}
            </div>
          </SheetHeader>

          {/* Dados Principais */}
          <div className="space-y-3.5 p-4 rounded-2xl bg-muted/30 border border-border/50">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Nome Completo</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Telefone / WhatsApp</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>

          {/* Clusters / Segmentações (Many-to-Many) */}
          <div className="space-y-2.5 p-4 rounded-2xl bg-muted/30 border border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-purple-400" /> Clusters & Grupos (N:N)
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {selectedClusterIds.length} selecionado(s)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {clusters.map((c) => {
                const checked = selectedClusterIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCluster(c.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all text-xs font-medium ${
                      checked
                        ? "bg-purple-500/10 border-purple-500/40 text-purple-300 shadow-sm"
                        : "bg-background/60 border-border/40 text-muted-foreground hover:border-border"
                    }`}
                  >
                    <Checkbox checked={checked} className="rounded-md" />
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banco de Dados Dinâmico (Chave-Valor) */}
          <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-emerald-400" /> Atributos Dinâmicos (Chave-Valor)
              </Label>
              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono">
                &#123;tags&#125;
              </Badge>
            </div>

            {/* Atributos Cadastrados */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {Object.entries(customFields).length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  Nenhum atributo dinâmico atribuído a este contato.
                </p>
              ) : (
                Object.entries(customFields).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-md bg-secondary/80 text-[11px] font-mono text-secondary-foreground border border-border/40 min-w-[90px] truncate">
                      {k}
                    </span>
                    <Input
                      value={v}
                      onChange={(e) => updateFieldValue(k, e.target.value)}
                      placeholder="Valor..."
                      className="h-7 text-xs bg-background flex-1"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeField(k)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Adicionar Novo Atributo com atalhos do Banco Dinâmico */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              {definedFields.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-muted-foreground mr-1">Campos do Banco:</span>
                  {definedFields
                    .filter((df: any) => !customFields[df.key])
                    .slice(0, 5)
                    .map((df: any) => (
                      <button
                        key={df.id}
                        type="button"
                        onClick={() => {
                          setNewKey(df.key);
                          setNewVal(df.placeholder || "");
                        }}
                        className="px-1.5 py-0.5 rounded bg-muted/60 hover:bg-muted text-[10px] text-foreground border border-border/40 flex items-center gap-1 transition-colors"
                        title={df.description || `Adicionar ${df.label}`}
                      >
                        + {df.label}
                      </button>
                    ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Chave (ex: empresa)..."
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="h-7 text-xs bg-background w-1/3 font-mono"
                />
                <Input
                  placeholder="Valor..."
                  value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  className="h-7 text-xs bg-background flex-1"
                  onKeyDown={(e) => e.key === "Enter" && addCustomField()}
                />
                <Button size="icon" variant="outline" onClick={addCustomField} className="h-7 w-7 shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="pt-4 border-t border-border/50 flex gap-2 sm:justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateContactMutation.isPending}
            className="h-8 text-xs gap-1.5 font-medium shadow-sm"
          >
            <Save className="h-3.5 w-3.5" /> Salvar Alterações
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
