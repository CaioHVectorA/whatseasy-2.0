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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, AlertCircle, Sparkles } from "lucide-react";
import { useSendContactMessage, useCustomFields } from "@/hooks/use-api-queries";
import { formatPhoneNumber } from "@/lib/utils";
import { toast } from "sonner";

interface SendDirectMessageModalProps {
  contact: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendDirectMessageModal({
  contact,
  open,
  onOpenChange,
}: SendDirectMessageModalProps) {
  const [message, setMessage] = useState("");
  const sendMutation = useSendContactMessage();
  const { data: dynamicFields = [] } = useCustomFields();

  if (!contact) return null;

  const handleInsertTag = (tag: string) => {
    setMessage((prev) => `${prev} {${tag}} `);
  };

  const handleSend = () => {
    if (!message.trim()) {
      toast.error("Digite a mensagem antes de enviar!");
      return;
    }

    sendMutation.mutate(
      {
        contactId: contact.id,
        message: message.trim(),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setMessage("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border/80 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                Enviar Mensagem no WhatsApp
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Disparo direto para <strong className="text-foreground">{contact.name}</strong> ({formatPhoneNumber(contact.phone)})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Informações do Destinatário */}
          <div className="p-3 rounded-xl bg-muted/20 border border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                {contact.name ? contact.name.charAt(0).toUpperCase() : "C"}
              </div>
              <div>
                <span className="font-semibold text-foreground block">{contact.name}</span>
                <span className="text-[11px] text-muted-foreground font-mono">{formatPhoneNumber(contact.phone)}</span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              Direto
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-semibold">Texto da Mensagem</Label>
            </div>

            {/* Tags Dinâmicas */}
            <div className="flex items-center gap-1 flex-wrap text-[10px] p-2 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-muted-foreground font-medium mr-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-400" /> Tags:
              </span>
              <button
                type="button"
                onClick={() => handleInsertTag("primeiro_nome")}
                className="px-1.5 py-0.5 rounded bg-muted hover:bg-primary/20 text-primary font-mono transition-colors border border-border/50"
                title="Primeiro nome do contato"
              >
                {"{primeiro_nome}"}
              </button>
              <button
                type="button"
                onClick={() => handleInsertTag("nome")}
                className="px-1.5 py-0.5 rounded bg-muted hover:bg-primary/20 text-primary font-mono transition-colors border border-border/50"
                title="Nome completo do contato"
              >
                {"{nome}"}
              </button>
              <button
                type="button"
                onClick={() => handleInsertTag("telefone")}
                className="px-1.5 py-0.5 rounded bg-muted hover:bg-primary/20 text-primary font-mono transition-colors border border-border/50"
                title="Telefone formatado do contato"
              >
                {"{telefone}"}
              </button>

              {/* Tags dinâmicas do banco */}
              {dynamicFields.map((df: any) => (
                <button
                  key={df.id}
                  type="button"
                  onClick={() => handleInsertTag(df.key)}
                  className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono transition-colors border border-emerald-500/30"
                  title={`Atributo: ${df.label}`}
                >
                  {`{${df.key}}`}
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Olá {primeiro_nome}, como posso te ajudar hoje?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="text-xs bg-background leading-relaxed resize-none"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40 text-[11px] text-muted-foreground flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <span>
              A mensagem será enviada instantaneamente pelo WhatsApp conectado utilizando o motor de automação.
            </span>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border/40">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sendMutation.isPending || !message.trim()}
            className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-md shadow-emerald-900/30"
          >
            <Send className="h-3.5 w-3.5" />
            {sendMutation.isPending ? "Enviando..." : "Enviar Mensagem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
