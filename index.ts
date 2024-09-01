import fs from 'fs';
import { makeWASocket, DisconnectReason, makeCacheableSignalKeyStore, Browsers, useMultiFileAuthState, jidDecode, getChatId } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino, { type Logger } from "pino";
const myChatId = '5521986723607@s.whatsapp.net'
const INCLUDED_CHATS = [
  myChatId,
  // '120363163589691744@g.us',
  // '5514999030862-1623680354@g.us'
]
function color(text: string, color?: string) {
  console.log(text)
}
async function connectToWhatsApp() {
  const initDate = new Date().getTime() / 1000;
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
  const sock = makeWASocket({
    printQRInTerminal: true,
    browser: Browsers.macOS('Desktop'),
    auth: state,
    //@ts-ignore
    logger: pino({ level: 'silent' }),
    
  });
  //@ts-ignore
  sock.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      //@ts-ignore
      return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
    } else return jid;
  };
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason === DisconnectReason.badSession) {
        console.log(`Bad Session File, Please Delete Session and Scan Again`);
        process.exit();
      } else if (reason === DisconnectReason.connectionClosed) {
        console.log("Connection closed, reconnecting....");
        connectToWhatsApp();
      } else if (reason === DisconnectReason.connectionLost) {
        console.log("Connection Lost from Server, reconnecting...");
        connectToWhatsApp();
      } else if (reason === DisconnectReason.connectionReplaced) {
        console.log("Connection Replaced, Another New Session Opened, Please Restart Bot");
        process.exit();
      } else if (reason === DisconnectReason.loggedOut) {
        console.log(`Device Logged Out, Please Delete Folder Session yusril and Scan Again.`);
        process.exit();
      } else if (reason === DisconnectReason.restartRequired) {
        console.log("Restart Required, Restarting...");
        connectToWhatsApp();
      } else if (reason === DisconnectReason.timedOut) {
        console.log("Connection TimedOut, Reconnecting...");
        connectToWhatsApp();
      } else {
        console.log(`Unknown DisconnectReason: ${reason}|${connection}`);
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      //@ts-ignore
      const botNumber = await sock.decodeJid(sock.user.id);
      sock.sendMessage(botNumber, { text: `Bot iniciado com sucesso!` });
    }
    // console.log('Connected...', update)
  });
  sock.ev.on("messages.upsert", async (m) => {
    // console.log(getChatId({ ...m.messages[0].key }));
    if (m.messages[0].message?.conversation === "Olá, mundo!" || !INCLUDED_CHATS.includes(getChatId({ ...m.messages[0].key })) ) return;
    //@ts-ignore
    if ((m.messages[0].messageTimestamp) < initDate) return;
    if (m.messages[0].message?.conversation === '') return  (m.messages[0].messageTimestamp, initDate)
    console.log("Responderia!!!")
    // return;  
    const response = 'Olá, mundo!';
    if (!m.messages[0].key.remoteJid) return;
    await sock.sendMessage(m.messages[0].key.remoteJid, {
      text: response,
    });
  });
}
// run in main file
connectToWhatsApp();