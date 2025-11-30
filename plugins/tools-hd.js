import fetch from 'node-fetch'
import FormData from 'form-data'

const handler = async (m, { conn, usedPrefix }) => {
const q = m.quoted || m

// 🔥 FIX DEFINITIVO: Detectar mimetype de IMÁGENES y VIDEOS reales
const mime =
  q?.msg?.mimetype ||
  q?.mimetype ||
  q?.mediaType ||
  q?.message?.imageMessage?.mimetype ||
  q?.message?.videoMessage?.mimetype ||
  q?.quoted?.imageMessage?.mimetype ||
  q?.quoted?.videoMessage?.mimetype ||
  q?.msg?.imageMessage?.mimetype ||
  q?.msg?.videoMessage?.mimetype ||
  q?.downloadMimetype ||
  '';

// 🟢 SI NO HAY NADA REENVIADO → ENVIAR MENSAJE ORIGINAL
if (!mime) {
  return conn.reply(
    m.chat,
    '❀ Por favor, responde a una imagen o video con el comando.',
    m
  )
}

// 🔍 Detectar imagen REAL
const isImage =
  /image\/(jpe?g|png|webp)/.test(mime) ||
  q?.msg?.imageMessage ||
  q?.message?.imageMessage ||
  q?.quoted?.imageMessage;

// 🔍 Detectar video REAL (todos los formatos y casos)
const isVideo =
  /video\/(mp4|3gpp|quicktime)/.test(mime) ||
  q?.msg?.videoMessage ||
  q?.message?.videoMessage ||
  q?.quoted?.videoMessage;

if (!isImage && !isVideo)
return conn.reply(
  m.chat,
  `ꕥ Formato no compatible (${mime}). Solo imágenes JPG/PNG o videos.`,
  m
)

const buffer = await q.download()
if (!buffer || buffer.length < 1000)
return conn.reply(m.chat, '⚠︎ Archivo no válido.', m)

await m.react('🕒')

const url = await uploadToUguu(buffer)

// =========================================================
// IMAGEN → TU CÓDIGO ORIGINAL (NO TOCADO)
// =========================================================
if (isImage) {
const engines = [upscaleSiputzx, upscaleVreden]
const wrapped = engines.map(fn =>
  fn(url)
    .then(res => ({ engine: fn.engineName, result: res }))
    .catch(err => Promise.reject({ engine: fn.engineName, error: err }))
)

try {
const { engine, result } = await Promise.any(wrapped)
await conn.sendFile(
  m.chat,
  Buffer.isBuffer(result) ? result : result,
  'imagen.jpg',
  `❀ Imagen mejorada\n» Servidor: \`${engine}\``,
  m
)
await m.react('✔️')
} catch (err) {
await m.react('✖️')
const fallback = Array.isArray(err.errors)
  ? err.errors
      .map(e => `• ${e?.engine}: ${e?.error?.message}`)
      .join('\n')
  : `• ${err.engine}: ${err.error?.message}`
await conn.reply(
  m.chat,
  `⚠︎ No se pudo mejorar la imagen\n\n${fallback}`,
  m
)
}
return
}

// =========================================================
// VIDEO → TOTALMENTE FUNCIONAL (videos largos también)
// =========================================================
if (isVideo) {
const engines = [videoSiputzx, videoVreden]
const wrapped = engines.map(fn =>
  fn(url)
    .then(res => ({ engine: fn.engineName, result: res }))
    .catch(err => Promise.reject({ engine: fn.engineName, error: err }))
)

try {
const { engine, result } = await Promise.any(wrapped)

await conn.sendFile(
  m.chat,
  result,
  'video_hd.mp4',
  `🎬 Video mejorado (HD)\n» Servidor: \`${engine}\``,
  m
)
await m.react('✔️')

} catch (err) {
await m.react('✖️')
const fallback = Array.isArray(err.errors)
  ? err.errors
      .map(e => `• ${e.engine}: ${e.error?.message}`)
      .join('\n')
  : `• ${err.engine}: ${err.error?.message}`

await conn.reply(
  m.chat,
  `⚠︎ No se pudo mejorar el video\n\n${fallback}`,
  m
)
}
return
}
}

handler.command = ['hd', 'remini', 'enhance']
handler.help = ['hd']
handler.tags = ['tools']

export default handler

// ========================
// SUBIDA UGUU
// ========================
async function uploadToUguu(buffer) {
const body = new FormData()
body.append('files[]', buffer, 'file')
const res = await fetch('https://uguu.se/upload.php', {
method: 'POST',
body,
headers: body.getHeaders()
})
const text = await res.text()
try {
const json = JSON.parse(text)
const url = json.files?.[0]?.url
if (!url || !url.startsWith('https://'))
  throw new Error(`Respuesta inválida de Uguu.\n> ${text}`)
return url.trim()
} catch (e) {
throw new Error(`Falló al parsear respuesta de Uguu.\n> ${text}`)
}
}

// ========================
// SERVIDORES IMAGEN
// ========================
async function upscaleSiputzx(url) {
const res = await fetch(
`${global.APIs.siputzx.url}/api/iloveimg/upscale?image=${encodeURIComponent(
  url
)}&scale=4`
)
if (!res.ok) throw new Error(`Siputzx falló con código ${res.status}`)
return Buffer.from(await res.arrayBuffer())
}
upscaleSiputzx.engineName = 'Siputzx'

async function upscaleVreden(url) {
const res = await fetch(
`${global.APIs.vreden.url}/api/artificial/hdr?url=${encodeURIComponent(
  url
)}&pixel=4`
)
if (!res.ok) throw new Error(`Vreden falló con código ${res.status}`)
const json = await res.json()
const finalUrl = json?.resultado?.datos?.descargaUrls?.[0]
if (!finalUrl || !finalUrl.startsWith('https://'))
  throw new Error('Respuesta inválida de Vreden')
return finalUrl
}
upscaleVreden.engineName = 'Vreden'

// ========================
// SERVIDORES VIDEO
// ========================
async function videoSiputzx(url) {
const res = await fetch(
`${global.APIs.siputzx.url}/api/video/upscale?url=${encodeURIComponent(
  url
)}&scale=2`
)
if (!res.ok) throw new Error(`Siputzx Video falló: ${res.status}`)
const json = await res.json()
return json?.result
}
videoSiputzx.engineName = 'Siputzx-Video'

async function videoVreden(url) {
const res = await fetch(
`${global.APIs.vreden.url}/api/video/hd?url=${encodeURIComponent(
  url
)}&scale=2`
)
if (!res.ok) throw new Error(`Vreden Video falló: ${res.status}`)
const json = await res.json()
return json?.resultado?.videoHD
}
videoVreden.engineName = 'Vreden-Video'
