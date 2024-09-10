import { jidDecode } from "@whiskeysockets/baileys";

export function decodeJid(jid: string) {
  if (!jid) return jid;
  if (/:\d+@/gi.test(jid)) {
    const decode = jidDecode(jid) || {};
    //@ts-ignore
    return (decode.user && decode.server && `${decode.user}@${decode.server}`) || jid;
  }
  return jid;
}