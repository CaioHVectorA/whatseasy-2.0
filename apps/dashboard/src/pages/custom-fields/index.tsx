import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Database,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  Copy,
  Check,
  FileText,
  DollarSign,
  Calendar,
  Hash,
  ListFilter,
  ShieldCheck,
  Search,
  Sliders,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useCustomFields, useSaveCustomField, useDeleteCustomField } from "@/hooks/use-api-queries";
import { toast } from "sonner";

interface CustomFieldDef {
  id: number;
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
  defaultValue?: string;
}

const MASK_PRESETS = [
  { label: "CPF", mask: "999.999.999-99", type: "DOCUMENT" },
  { label: "CNPJ", mask: "99.999.999/9999-99", type: "DOCUMENT" },
  { label: "Telefone BR", mask: "(99) 99999-9999", type: "PHONE" },
  { label: "CEP", mask: "99999-999", type: "TEXT" },
  { label: "Data BR", mask: "99/99/9999", type: "DATE" },
  { label: "Moeda R$", mask: "R$ #.##0,00", type: "CURRENCY" },
];

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  regex?: string;
  hasParam?: "prefix" | "suffix" | "contains" | "custom";
  paramLabel?: string;
  paramPlaceholder?: string;
}

const VALIDATION_RULES: ValidationRule[] = [
  {
    id: "NONE",
    name: "Sem Restrição Especial (Texto Livre)",
    description: "Qualquer valor de texto digitado é aceito livremente sem restrições.",
    regex: "",
  },
  {
    id: "LETTERS_ONLY",
    name: "Apenas Letras e Espaços (Sem Números)",
    description: "Aceita somente letras e acentos, bloqueando qualquer dígito ou caractere especial.",
    regex: "^[a-zA-ZÀ-ÿ\\s]+$",
  },
  {
    id: "NUMBERS_ONLY",
    name: "Apenas Dígitos Numéricos (0 a 9)",
    description: "Aceita somente números inteiros positivos, sem letras ou pontuação.",
    regex: "^\\d+$",
  },
  {
    id: "ALPHANUMERIC",
    name: "Alfanumérico (Letras e Números)",
    description: "Aceita letras e números combinados, mas bloqueia símbolos e pontuações.",
    regex: "^[a-zA-Z0-9À-ÿ\\s]+$",
  },
  {
    id: "EMAIL",
    name: "Formato de E-mail Válido (usuario@dominio.com)",
    description: "Exige que o valor tenha estrutura válida de e-mail.",
    regex: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
  },
  {
    id: "CPF",
    name: "Formato de CPF Brasileiro (11 dígitos)",
    description: "Exige 11 dígitos numéricos com ou sem pontuação (000.000.000-00).",
    regex: "^(\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2})$",
  },
  {
    id: "CNPJ",
    name: "Formato de CNPJ Brasileiro (14 dígitos)",
    description: "Exige 14 dígitos numéricos com ou sem pontuação (00.000.000/0000-00).",
    regex: "^(\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2})$",
  },
  {
    id: "PHONE",
    name: "Telefone ou Celular Brasileiro",
    description: "Exige DDD + número de telefone fixo ou celular.",
    regex: "^(\\+?55)?\\s?\\(?\\d{2}\\)?\\s?\\d{4,5}-?\\d{4}$",
  },
  {
    id: "URL",
    name: "Endereço Web / Link (https://...)",
    description: "Exige que o valor seja uma URL iniciando com http:// ou https://.",
    regex: "^https?:\\/\\/[^\\s/$.?#].[^\\s]*$",
  },
  {
    id: "STARTS_WITH",
    name: "Deve Começar Com... (Prefixo Obrigatório)",
    description: "Exige que o valor inicie obrigatoriamente com o texto definido abaixo.",
    hasParam: "prefix",
    paramLabel: "Texto inicial obrigatório (Prefixo)",
    paramPlaceholder: "ex: CLI- ou COD-",
  },
  {
    id: "ENDS_WITH",
    name: "Deve Terminar Com... (Sufixo Obrigatório)",
    description: "Exige que o valor termine obrigatoriamente com o texto definido abaixo.",
    hasParam: "suffix",
    paramLabel: "Texto final obrigatório (Sufixo)",
    paramPlaceholder: "ex: @minhaempresa.com ou .pdf",
  },
  {
    id: "CONTAINS",
    name: "Deve Conter... (Palavra ou Código)",
    description: "Exige que o valor contenha obrigatoriamente o termo especificado.",
    hasParam: "contains",
    paramLabel: "Palavra ou termo obrigatório contido no valor",
    paramPlaceholder: "ex: VIP ou ATIVO",
  },
  {
    id: "CUSTOM",
    name: "Expressão Regular Personalizada (Avançado)",
    description: "Digite uma regex técnica customizada.",
    hasParam: "custom",
    paramLabel: "Expressão Regular (Regex)",
    paramPlaceholder: "ex: ^[A-Z]{3}-\\d{4}$",
  },
];

export default function CustomFieldsPage() {
  const { data: rawFields = [], isLoading } = useCustomFields();
  const saveMutation = useSaveCustomField();
  const deleteMutation = useDeleteCustomField();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState("TEXT");
  const [description, setDescription] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [mask, setMask] = useState("");
  const [min, setMin] = useState<string>("");
  const [max, setMax] = useState<string>("");
  const [required, setRequired] = useState(false);
  const [optionsList, setOptionsList] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  // Regra de Validação Avançada
  const [validationRuleId, setValidationRuleId] = useState("NONE");
  const [validationParam, setValidationParam] = useState("");

  // Simulador de Teste ao Vivo
  const [testValue, setTestValue] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fields: CustomFieldDef[] = useMemo(() => {
    return (rawFields as any[]).map((f) => ({
      ...f,
      options: Array.isArray(f.options) ? f.options : [],
    }));
  }, [rawFields]);

  const filteredFields = useMemo(() => {
    if (!search.trim()) return fields;
    const s = search.toLowerCase();
    return fields.filter(
      (f) =>
        f.label.toLowerCase().includes(s) ||
        f.key.toLowerCase().includes(s) ||
        f.type.toLowerCase().includes(s)
    );
  }, [fields, search]);

  // Computa o regex resultante a partir da regra selecionada e parâmetro
  const effectiveRegex = useMemo(() => {
    const rule = VALIDATION_RULES.find((r) => r.id === validationRuleId);
    if (!rule || rule.id === "NONE") return "";
    if (rule.regex) return rule.regex;
    if (rule.id === "STARTS_WITH" && validationParam.trim()) {
      const escaped = validationParam.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return `^${escaped}.*$`;
    }
    if (rule.id === "ENDS_WITH" && validationParam.trim()) {
      const escaped = validationParam.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return `^.*${escaped}$`;
    }
    if (rule.id === "CONTAINS" && validationParam.trim()) {
      const escaped = validationParam.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return `.*${escaped}.*`;
    }
    if (rule.id === "CUSTOM") {
      return validationParam.trim();
    }
    return "";
  }, [validationRuleId, validationParam]);

  const activeRule = useMemo(() => {
    return VALIDATION_RULES.find((r) => r.id === validationRuleId) || VALIDATION_RULES[0];
  }, [validationRuleId]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setKey("");
    setLabel("");
    setType("TEXT");
    setDescription("");
    setPlaceholder("");
    setMask("");
    setValidationRuleId("NONE");
    setValidationParam("");
    setMin("");
    setMax("");
    setRequired(false);
    setOptionsList([]);
    setNewOption("");
    setTestValue("");
    setShowAdvanced(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (f: CustomFieldDef) => {
    setEditingId(f.id);
    setKey(f.key);
    setLabel(f.label);
    setType(f.type || "TEXT");
    setDescription(f.description || "");
    setPlaceholder(f.placeholder || "");
    setMask(f.mask || "");
    
    // Reconhece a regra de validação pré-existente
    if (!f.regex) {
      setValidationRuleId("NONE");
      setValidationParam("");
    } else {
      const matchingPreset = VALIDATION_RULES.find((r) => r.regex === f.regex);
      if (matchingPreset) {
        setValidationRuleId(matchingPreset.id);
        setValidationParam("");
      } else if (f.regex.startsWith("^") && f.regex.endsWith(".*$")) {
        setValidationRuleId("STARTS_WITH");
        setValidationParam(f.regex.slice(1, -3).replace(/\\/g, ""));
      } else if (f.regex.startsWith("^.*") && f.regex.endsWith("$")) {
        setValidationRuleId("ENDS_WITH");
        setValidationParam(f.regex.slice(3, -1).replace(/\\/g, ""));
      } else {
        setValidationRuleId("CUSTOM");
        setValidationParam(f.regex);
      }
    }

    setMin(f.min !== undefined ? String(f.min) : "");
    setMax(f.max !== undefined ? String(f.max) : "");
    setRequired(Boolean(f.required));
    setOptionsList(f.options || []);
    setNewOption("");
    setTestValue("");
    setShowAdvanced(Boolean(f.mask || f.regex || f.min || f.max));
    setModalOpen(true);
  };

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    if (!editingId) {
      // Auto-gera a chave slug
      const generated = newLabel
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
      setKey(generated);
    }
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    if (optionsList.includes(newOption.trim())) {
      toast.info("Opção já adicionada");
      return;
    }
    setOptionsList([...optionsList, newOption.trim()]);
    setNewOption("");
  };

  const handleRemoveOption = (opt: string) => {
    setOptionsList(optionsList.filter((o) => o !== opt));
  };

  const handleSave = () => {
    if (!key.trim() || !label.trim()) {
      toast.error("Chave e rótulo do campo são obrigatórios!");
      return;
    }

    saveMutation.mutate(
      {
        key: key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        label: label.trim(),
        type,
        options: type === "SELECT" ? optionsList : undefined,
        mask: mask.trim() || undefined,
        regex: effectiveRegex || undefined,
        min: min !== "" ? Number(min) : undefined,
        max: max !== "" ? Number(max) : undefined,
        description: description.trim() || undefined,
        placeholder: placeholder.trim() || undefined,
        required,
      },
      {
        onSuccess: () => {
          setModalOpen(false);
        },
      }
    );
  };

  const handleCopyTag = (fieldKey: string) => {
    navigator.clipboard.writeText(`{${fieldKey}}`);
    setCopiedKey(fieldKey);
    toast.success(`Tag {${fieldKey}} copiada para a área de transferência!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Teste de validação ao vivo
  const isTestRegexValid = useMemo(() => {
    if (!effectiveRegex || !testValue) return true;
    try {
      const r = new RegExp(effectiveRegex);
      return r.test(testValue);
    } catch {
      return false;
    }
  }, [effectiveRegex, testValue]);

  const getTypeBadge = (t: string) => {
    switch (t) {
      case "NUMBER":
        return (
          <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 gap-1 text-[11px]">
            <Hash className="h-3 w-3" /> Número
          </Badge>
        );
      case "CURRENCY":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1 text-[11px]">
            <DollarSign className="h-3 w-3" /> Moeda (R$)
          </Badge>
        );
      case "DATE":
        return (
          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1 text-[11px]">
            <Calendar className="h-3 w-3" /> Data
          </Badge>
        );
      case "SELECT":
        return (
          <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 gap-1 text-[11px]">
            <ListFilter className="h-3 w-3" /> Seleção
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-foreground border-border/40 gap-1 text-[11px]">
            <FileText className="h-3 w-3" /> Texto
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Database className="h-7 w-7 text-primary" /> Banco de Dados Dinâmico
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Crie e gerencie atributos chave-valor estruturados para enriquecer o perfil de contatos,
            com máscaras de digitação, validação regex e uso dinâmico em mensagens automáticas.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="h-9 px-4 text-xs font-semibold gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Novo Atributo
        </Button>
      </div>

      {/* Cards de Métricas do Banco Dinâmico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/70 backdrop-blur-md border-border/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Atributos Criados</span>
            <Database className="h-4 w-4 text-primary" />
          </div>
          <span className="text-2xl font-black text-foreground block mt-2">{fields.length}</span>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Campos ativos no sistema
          </span>
        </Card>

        <Card className="bg-card/70 backdrop-blur-md border-border/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Com Máscara</span>
            <Sliders className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-emerald-400 block mt-2">
            {fields.filter((f) => f.mask).length}
          </span>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Formatação automática
          </span>
        </Card>

        <Card className="bg-card/70 backdrop-blur-md border-border/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Com Validação Regex</span>
            <ShieldCheck className="h-4 w-4 text-blue-400" />
          </div>
          <span className="text-2xl font-black text-blue-400 block mt-2">
            {fields.filter((f) => f.regex).length}
          </span>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Regras estritas ativas
          </span>
        </Card>

        <Card className="bg-card/70 backdrop-blur-md border-border/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Campos Obrigatórios</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <span className="text-2xl font-black text-amber-400 block mt-2">
            {fields.filter((f) => f.required).length}
          </span>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Exigidos no cadastro
          </span>
        </Card>
      </div>

      {/* Tabela de Campos */}
      <Card className="bg-card/60 backdrop-blur-md border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar atributo por chave, rótulo ou tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs bg-background/50 border-border/50"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {filteredFields.length} atributo(s) encontrado(s)
          </span>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground uppercase text-[11px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Rótulo / Nome Amigável</th>
                  <th className="py-3.5 px-4">Chave & Tag para Mensagens</th>
                  <th className="py-3.5 px-4">Tipo de Dado</th>
                  <th className="py-3.5 px-4">Máscara / Validação</th>
                  <th className="py-3.5 px-4">Limites (Mín/Máx)</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      Carregando atributos dinâmicos...
                    </td>
                  </tr>
                ) : filteredFields.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      Nenhum atributo encontrado. Clique em "+ Novo Atributo" para começar.
                    </td>
                  </tr>
                ) : (
                  filteredFields.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/25 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{f.label}</span>
                          {f.required && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                        {f.description && (
                          <span className="text-[11px] text-muted-foreground font-normal block mt-0.5">
                            {f.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-0.5 rounded bg-muted/60 text-[11px] font-mono border border-border/40 text-primary">
                            {`{${f.key}}`}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyTag(f.key)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            title="Copiar tag para mensagens"
                          >
                            {copiedKey === f.key ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{getTypeBadge(f.type)}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                        {f.mask ? (
                          <div className="flex items-center gap-1 text-emerald-400">
                            <Sliders className="h-3 w-3" /> {f.mask}
                          </div>
                        ) : f.regex ? (
                          <div className="flex items-center gap-1 text-blue-400 truncate max-w-[150px]" title={f.regex}>
                            <ShieldCheck className="h-3 w-3 shrink-0" /> {f.regex}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 italic">Padrão</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {f.min !== undefined || f.max !== undefined ? (
                          <span className="font-mono text-[11px]">
                            {f.min ?? "—"} até {f.max ?? "—"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 italic">Sem limite</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(f)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                            title="Editar Atributo"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(f.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Excluir Atributo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Criação / Edição Rica e Ultra-Intuitiva */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[92vh] overflow-y-auto bg-card border-border/80 shadow-2xl p-5">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {editingId ? "Editar Atributo Dinâmico" : "Novo Atributo do Banco Dinâmico"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Campos estruturados para guardar dados de contatos e usar como tags em mensagens.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* 1. Modelos Prontos em 1 Clique (Apenas na Criação) */}
            {!editingId && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-primary/10 via-background/60 to-primary/10 border border-primary/25 space-y-2">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Modelos Prontos (Preencher em 1 clique):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { icon: "🆔", name: "CPF", label: "CPF do Cliente", key: "cpf", type: "TEXT", placeholder: "000.000.000-00", mask: "999.999.999-99", rule: "CPF" },
                    { icon: "🏢", name: "CNPJ", label: "CNPJ da Empresa", key: "cnpj", type: "TEXT", placeholder: "00.000.000/0000-00", mask: "99.999.999/9999-99", rule: "CNPJ" },
                    { icon: "💼", name: "Cargo", label: "Cargo na Empresa", key: "cargo", type: "TEXT", placeholder: "ex: Gerente Comercial", rule: "NONE" },
                    { icon: "🏬", name: "Empresa", label: "Nome da Empresa", key: "empresa", type: "TEXT", placeholder: "ex: Tech Solutions", rule: "NONE" },
                    { icon: "💰", name: "Valor R$", label: "Ticket / Faturamento", key: "faturamento", type: "CURRENCY", placeholder: "R$ 0,00", mask: "R$ #.##0,00", rule: "NONE" },
                    { icon: "📅", name: "Data", label: "Data de Nascimento", key: "aniversario", type: "DATE", placeholder: "DD/MM/AAAA", mask: "99/99/9999", rule: "NONE" },
                    { icon: "📋", name: "Status", label: "Status do Lead", key: "status_lead", type: "SELECT", options: ["Novo Lead", "Em Contato", "Cliente Ativo", "Perdido"], rule: "NONE" },
                    { icon: "✉️", name: "E-mail", label: "E-mail", key: "email", type: "TEXT", placeholder: "nome@empresa.com", rule: "EMAIL" },
                  ].map((tmpl) => (
                    <button
                      key={tmpl.name}
                      type="button"
                      onClick={() => {
                        setLabel(tmpl.label);
                        setKey(tmpl.key);
                        setType(tmpl.type);
                        setPlaceholder(tmpl.placeholder || "");
                        setMask(tmpl.mask || "");
                        setValidationRuleId(tmpl.rule);
                        setValidationParam("");
                        if (tmpl.options) setOptionsList(tmpl.options);
                        toast.success(`Modelo "${tmpl.name}" aplicado!`);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-background hover:bg-primary hover:text-primary-foreground border border-border/70 text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                    >
                      <span>{tmpl.icon}</span>
                      <span>{tmpl.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Informações Principais (Essenciais e Limpas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-semibold">Nome do Atributo</Label>
                <Input
                  placeholder="ex: Cargo, CPF, Faturamento, Plano"
                  value={label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-foreground font-semibold">Chave da Tag</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">Uso: {`{${key || "tag"}}`}</span>
                </div>
                <Input
                  placeholder="ex: cargo, cpf, faturamento"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="h-8 text-xs font-mono bg-background text-primary font-semibold"
                  disabled={Boolean(editingId)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-semibold">Tipo de Dado</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEXT">📝 Texto Livre</SelectItem>
                    <SelectItem value="NUMBER">🔢 Número Inteiro</SelectItem>
                    <SelectItem value="CURRENCY">💰 Moeda (R$ BRL)</SelectItem>
                    <SelectItem value="DATE">📅 Data</SelectItem>
                    <SelectItem value="SELECT">📋 Lista de Escolha (Opções)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Texto de Orientação (Placeholder)</Label>
                <Input
                  placeholder="ex: Digite o cargo ou função..."
                  value={placeholder}
                  onChange={(e) => setPlaceholder(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            {/* Opções de Seleção quando Tipo for SELECT */}
            {type === "SELECT" && (
              <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-2.5">
                <Label className="text-xs font-semibold text-foreground">Opções do Menu</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Adicionar nova opção..."
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddOption())}
                    className="h-8 text-xs bg-background"
                  />
                  <Button size="sm" onClick={handleAddOption} className="h-8 text-xs px-3">
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {optionsList.map((opt) => (
                    <Badge
                      key={opt}
                      variant="secondary"
                      className="gap-1 text-xs px-2 py-0.5 bg-muted border border-border/60"
                    >
                      {opt}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(opt)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  {optionsList.length === 0 && (
                    <span className="text-[11px] text-muted-foreground italic">
                      Nenhuma opção adicionada ainda.
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 py-1">
              <Checkbox
                id="field-required"
                checked={required}
                onCheckedChange={(val) => setRequired(Boolean(val))}
              />
              <Label htmlFor="field-required" className="text-xs text-foreground font-medium cursor-pointer">
                Tornar este atributo obrigatório ao cadastrar ou editar contato
              </Label>
            </div>

            {/* 3. Seção Avançada Retrátil (Opcional - só abre se o usuário desejar) */}
            <div className="border border-border/50 rounded-2xl overflow-hidden bg-muted/10">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-3 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  Configurações Avançadas (Máscara, Validação e Limites)
                </span>
                <span className="text-[11px] text-primary font-mono font-medium">
                  {showAdvanced ? "▲ Ocultar" : "▼ Expandir (Opcional)"}
                </span>
              </button>

              {showAdvanced && (
                <div className="p-3.5 pt-1 space-y-3.5 border-t border-border/40 bg-background/40">
                  {/* Máscara de Entrada */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-foreground">Máscara de Digitação</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">9 = dígito</span>
                    </div>
                    <Input
                      placeholder="ex: 999.999.999-99 ou (99) 99999-9999"
                      value={mask}
                      onChange={(e) => setMask(e.target.value)}
                      className="h-8 text-xs font-mono bg-background"
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {MASK_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            setMask(p.mask);
                            if (p.type === "CURRENCY") setType("CURRENCY");
                            if (p.type === "DATE") setType("DATE");
                          }}
                          className="px-2 py-0.5 rounded bg-muted/60 border border-border/40 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          + {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Regra Inteligente de Validação */}
                  <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/40">
                    <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> Validação de Formato
                    </Label>
                    <Select
                      value={validationRuleId}
                      onValueChange={(val) => {
                        setValidationRuleId(val);
                        setValidationParam("");
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {VALIDATION_RULES.map((rule) => (
                          <SelectItem key={rule.id} value={rule.id} className="text-xs">
                            {rule.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {activeRule.hasParam && (
                      <div className="space-y-1 pt-1">
                        <Label className="text-[10px] text-muted-foreground">
                          {activeRule.paramLabel}
                        </Label>
                        <Input
                          placeholder={activeRule.paramPlaceholder}
                          value={validationParam}
                          onChange={(e) => setValidationParam(e.target.value)}
                          className="h-7 text-xs font-mono bg-background"
                        />
                      </div>
                    )}

                    <span className="text-[10px] text-muted-foreground block">
                      ℹ {activeRule.description}
                    </span>
                  </div>

                  {/* Limites Mínimo e Máximo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Valor Mínimo / Caracteres</Label>
                      <Input
                        type="number"
                        placeholder="ex: 0"
                        value={min}
                        onChange={(e) => setMin(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Valor Máximo / Caracteres</Label>
                      <Input
                        type="number"
                        placeholder="ex: 500"
                        value={max}
                        onChange={(e) => setMax(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>

                  {/* Descrição / Instruções */}
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Descrição de Ajuda</Label>
                    <Input
                      placeholder="ex: Preenchido automaticamente durante onboarding"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  {/* Simulador de Validação ao Vivo */}
                  {(mask || effectiveRegex) && (
                    <div className="p-2.5 rounded-xl bg-background/80 border border-border/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Simular Validação
                        </span>
                        {testValue ? (
                          isTestRegexValid ? (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> Válido
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              <XCircle className="h-3 w-3" /> Não atende à regra
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Digite para testar</span>
                        )}
                      </div>
                      <Input
                        placeholder={`Digite para testar ${mask ? `(Máscara: ${mask})` : ""}`}
                        value={testValue}
                        onChange={(e) => setTestValue(e.target.value)}
                        className="h-7 text-xs bg-background"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Mini Prévia do Atributo */}
            <div className="p-3 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Prévia na Ficha do Contato
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {label || "Nome do Atributo"}:{" "}
                  <span className="font-normal text-muted-foreground">
                    {placeholder || "Valor informado pelo cliente"}
                  </span>
                </span>
              </div>
              <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {`{${key || "tag"}}`}
              </code>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/40 flex sm:justify-between items-center">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="h-8 text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending || !key || !label}
              className="h-8 text-xs font-medium px-4 shadow-sm"
            >
              {editingId ? "Salvar Alterações" : "Criar Atributo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
