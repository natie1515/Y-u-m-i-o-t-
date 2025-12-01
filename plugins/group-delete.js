let handler = async (m, { conn }) => {
  if (!m.quoted) {
    return conn.reply(m.chat, `❀ Por favor, cita el mensaje que deseas eliminar.`, m)
  }

  try {
    return conn.sendMessage(m.chat, {
      delete: {
        remoteJid: m.chat,
        fromMe: false,
        id: m.quoted.key.id,
        participant: m.quoted.key.participant
      }
    })
  } catch {
    return conn.sendMessage(m.chat, { delete: m.quoted.key })
  }
}

handler.help = ['delete']
handler.tags = ['grupo']
handler.command = ['del', 'delete']
handler.group = true       // Solo en grupos
handler.admin = true       // Solo admins pueden usarlo
handler.botAdmin = true    // El bot debe ser admin

export default handler
