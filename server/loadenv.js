// 极简 .env 加载：把 server/.env 里的 KEY=VALUE 读进 process.env（不覆盖已存在的）。
// 用于让预览/本地进程也能拿到 AI 网关配置；上线时优先用运行环境注入的变量。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function loadEnv() {
	const file = path.join(__dirname, '.env')
	if (!fs.existsSync(file)) return
	const text = fs.readFileSync(file, 'utf8')
	for (const line of text.split('\n')) {
		const s = line.trim()
		if (!s || s.startsWith('#')) continue
		const i = s.indexOf('=')
		if (i === -1) continue
		const k = s.slice(0, i).trim()
		let v = s.slice(i + 1).trim()
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
			v = v.slice(1, -1)
		}
		if (!(k in process.env)) process.env[k] = v
	}
}
