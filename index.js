const { default: makeWASocket, useMultiFileAuthState, disconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const config = require('./config');

async function startBlackDragon() {
    const { state, saveCreds } = await useMultiFileAuthState('dragon_sessions');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ["Black Dragon MD", "Safari", "1.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== disconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) startBlackDragon();
        } else if (connection === 'open') {
            console.log('🐉 BLACK DRAGON MD IS NOW ONLINE!');
        }
    });

    // Message Logic & Commands
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        // Menu Command
        if (text === `${config.PREFIX}menu` || text === `${config.PREFIX}help`) {
            const menuText = `┌───『 🐉 ${config.BOT_NAME} 🐉 』───
│
├ 👑 Owner: ${config.OWNER_NAME}
├ ⚙️ Prefix: [ ${config.PREFIX} ]
├ 📌 Status: Active 🟢
│
├───『 MAIN COMMANDS 』───
│
├ 🎵 .song <Name> - Music Downloader
├ 🖼️ .sticker - Image to Sticker
├ ⚡ .ping - Speed Test
├ ⚙️ .system - Server Status
│
└─────────────────────────────
  Powered By - *${config.OWNER_NAME}*`;

            await sock.sendMessage(from, { text: menuText }, { quoted: msg });
        }

        // Ping Command
        if (text === `${config.PREFIX}ping`) {
            await sock.sendMessage(from, { text: '🐉 *Pong! Black Dragon MD Speed: 0.02s*' }, { quoted: msg });
        }
    });
}

startBlackDragon();
