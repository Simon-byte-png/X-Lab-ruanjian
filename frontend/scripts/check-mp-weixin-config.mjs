import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function readJson(file) {
	return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
}

function readEnvFile(file) {
	const fullPath = path.join(root, file)
	if (!fs.existsSync(fullPath)) return {}

	const values = {}
	for (const line of fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) continue

		const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
		if (!match) continue

		const [, key, rawValue] = match
		values[key] = rawValue.replace(/^['"]|['"]$/g, '')
	}
	return values
}

function resolveEnv(key) {
	const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local']
	for (const file of envFiles) {
		const value = readEnvFile(file)[key]
		if (value) return value
	}
	return process.env[key] || ''
}

const manifest = readJson('src/manifest.json')
const appid = manifest?.['mp-weixin']?.appid || ''
const apiBase = resolveEnv('VITE_API_BASE_URL')
const errors = []

if (!appid) {
	errors.push('frontend/src/manifest.json 里的 mp-weixin.appid 还没填')
}

if (!apiBase) {
	errors.push('还没配置 VITE_API_BASE_URL，可复制 frontend/.env.example 为 .env.production 后填写')
} else {
	try {
		const url = new URL(apiBase)
		if (url.protocol !== 'https:') {
			errors.push('VITE_API_BASE_URL 必须是 https 地址')
		}
		if (!url.pathname.endsWith('/api/')) {
			errors.push('VITE_API_BASE_URL 建议以 /api/ 结尾，例如 https://your-domain.com/api/')
		}
	} catch {
		errors.push('VITE_API_BASE_URL 不是合法 URL')
	}
}

if (errors.length) {
	console.error('微信小程序正式打包前还差这些配置：')
	for (const error of errors) {
		console.error('- ' + error)
	}
	process.exit(1)
}

console.log('微信小程序正式打包配置检查通过')
