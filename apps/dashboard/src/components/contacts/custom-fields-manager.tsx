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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Database,
  Plus,
  Trash2,
  Sparkles,
  Copy,
  Check,
  FileText,
  DollarSign,
  Calendar,
  Hash,
} from "lucide-react";
import { useCustomFields, useSaveCustomField, useDeleteCustomField } from "@/hooks/use-api-queries";
import { toast } from "sonner";

interface CustomFieldsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomFieldsManager({ open, onOpenChange }: CustomFieldsManagerProps) {
  const { data: fields = [] } = useCustomFields();
  const saveFieldMutation = useSaveCustomField();
  const deleteFieldMutation = useDeleteCustomField();

  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState("TEXT");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleSave = () => {
    if (!key || !label) {
      toast.error("Informe a chave e o rótulo do campo.");
      return;
    }

    saveFieldMutation.mutate(
      { key, label, type },
      {
        onSuccess: () => {
          setKey("");
          setLabel("");
          setType("TEXT");
        },
      }
    );
  };

  const handleCopyTag = (fieldKey: string) => {
    navigator.clipboard.writeText(`{${fieldKey}}`);
    setCopiedKey(fieldKey);
    toast.success(`Tag {${fieldKey}} copiada!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case "NUMBER":
        return <Hash className="h-3.5 w-3.5 text-blue-400" />;
      case "CURRENCY":
        return <DollarSign className="h-3.5 w-3.5 text-emerald-400" />;
      case "DATE":
        return <Calendar className="h-3.5 w-3.5 text-amber-400" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-purple-400" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] bg-card border-border/80 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Banco de Dados Dinâmico de Atributos
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Crie campos customizados chave-valor plug & play para enriquecer contatos e usar nas automações.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Formulário de Criação de Novo Campo */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-primary" /> Novo Atributo Customizado
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Rótulo Visível</Label>
                <Input
                  placeholder="ex: Nome da Empresa"
                  value={label}
                  onChange={(e) => {
                    setLabel(e.target.value);
                    if (!key) {
                      setKey(
                        e.target.value
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[^a-z0-9]/g, "_")
                      );
                    }
                  }}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Chave da Variável</Label>
                <Input
                  placeholder="ex: empresa"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="h-8 text-xs bg-background font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Tipo de Dado</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEXT" className="text-xs">Texto Livre</SelectItem>
                    <SelectItem value="NUMBER" className="text-xs">Número Inteiro</SelectItem>
                    <SelectItem value="CURRENCY" className="text-xs">Valor Moeda (R$)</SelectItem>
                    <SelectItem value="DATE" className="text-xs">Data / Vencimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveFieldMutation.isPending || !key || !label}
                className="h-7 text-xs gap-1.5 font-medium shadow-sm"
              >
                <Plus className="h-3 w-3" /> Adicionar Atributo
              </Button>
            </div>
          </div>

          {/* Lista de Campos Definidos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Atributos Ativos ({fields.length})
              </h4>
              <span className="text-[11px] text-muted-foreground">
                Clique na tag para copiar para mensagens
              </span>
            </div>

            {fields.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-border/60 rounded-xl bg-muted/10 space-y-1">
                <Database className="h-6 w-6 mx-auto opacity-30 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Nenhum atributo dinâmico cadastrado ainda.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {fields.map((f: any) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl bg-card border border-border/50 hover:border-primary/40 transition-all flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-secondary/80 flex items-center justify-center">
                        {getTypeIcon(f.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{f.label}</span>
                          <Badge variant="outline" className="text-[9px] h-4 font-mono px-1 bg-muted/40">
                            {f.type}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyTag(f.key)}
                          className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:text-primary/80 transition-colors"
                        >
                          &#123;{f.key}&#125;
                          {copiedKey === f.key ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-60" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteFieldMutation.mutate(f.id)}
                      disabled={deleteFieldMutation.isPending}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border/40">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
