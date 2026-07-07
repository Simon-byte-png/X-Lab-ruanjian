// AI 调用封装：兼容两种网关，按顺序尝试，谁通用谁。
//  1) OpenAI 兼容网关：$OPENAI_BASE_URL + $OPENAI_API_KEY（zaodeploy 部署/预览环境注入，线上首选）
//  2) Anthropic 网关：$ANTHROPIC_BASE_URL + $ANTHROPIC_AUTH_TOKEN（本地开发自测兜底）
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

function hasOpenAI() { return !!process.env.OPENAI_API_KEY }
function hasAnthropic() { return !!(process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY) }

export function aiAvailable() { return hasOpenAI() || hasAnthropic() }

async function openaiChat(system, userText, { maxTokens = 700 } = {}) {
	const base = process.env.OPENAI_BASE_URL.replace(/\/$/, '')
	const key = process.env.OPENAI_API_KEY
	const url = /\/v\d+$/.test(base) ? base + '/chat/completions' : base + '/v1/chat/completions'
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + key },
		body: JSON.stringify({
			model: OPENAI_MODEL,
			max_tokens: maxTokens,
			messages: [{ role: 'system', content: system }, { role: 'user', content: userText }]
		})
	})
	if (!res.ok) throw new Error('openai ' + res.status + ' ' + (await res.text().catch(() => '')).slice(0, 160))
	const data = await res.json()
	const text = data.choices?.[0]?.message?.content?.trim()
	if (!text) throw new Error('openai 返回为空')
	return text
}

async function anthropicChat(system, userText, { maxTokens = 700 } = {}) {
	const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '')
	const token = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
	const res = await fetch(base + '/v1/messages', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-api-key': token,
			'authorization': 'Bearer ' + token,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: userText }] })
	})
	if (!res.ok) throw new Error('anthropic ' + res.status + ' ' + (await res.text().catch(() => '')).slice(0, 160))
	const data = await res.json()
	const text = (data.content || []).map(c => c.text || '').join('').trim()
	if (!text) throw new Error('anthropic 返回为空')
	return text
}

// 多轮对话：messages = [{role:'user'|'assistant', content}]
async function openaiConversation(system, messages, { maxTokens = 500 } = {}) {
	const base = process.env.OPENAI_BASE_URL.replace(/\/$/, '')
	const key = process.env.OPENAI_API_KEY
	const url = /\/v\d+$/.test(base) ? base + '/chat/completions' : base + '/v1/chat/completions'
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + key },
		body: JSON.stringify({ model: OPENAI_MODEL, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] })
	})
	if (!res.ok) throw new Error('openai ' + res.status + ' ' + (await res.text().catch(() => '')).slice(0, 160))
	const data = await res.json()
	const text = data.choices?.[0]?.message?.content?.trim()
	if (!text) throw new Error('openai 返回为空')
	return text
}

async function anthropicConversation(system, messages, { maxTokens = 500 } = {}) {
	const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '')
	const token = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
	// Anthropic 要求首条为 user，去掉开头的 assistant 消息
	let msgs = messages.slice()
	while (msgs.length && msgs[0].role !== 'user') msgs.shift()
	const res = await fetch(base + '/v1/messages', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-api-key': token, 'authorization': 'Bearer ' + token, 'anthropic-version': '2023-06-01' },
		body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, system, messages: msgs })
	})
	if (!res.ok) throw new Error('anthropic ' + res.status + ' ' + (await res.text().catch(() => '')).slice(0, 160))
	const data = await res.json()
	const text = (data.content || []).map(c => c.text || '').join('').trim()
	if (!text) throw new Error('anthropic 返回为空')
	return text
}

export async function conversation(system, messages, opts = {}) {
	const providers = []
	if (hasOpenAI()) providers.push(openaiConversation)
	if (hasAnthropic()) providers.push(anthropicConversation)
	if (!providers.length) throw new Error('AI 未配置')
	let lastErr
	for (const p of providers) {
		try { return await p(system, messages, opts) }
		catch (e) { lastErr = e; console.warn('[ai] conversation provider failed:', e.message) }
	}
	throw lastErr
}

export async function chat(system, userText, opts = {}) {
	const providers = []
	if (hasOpenAI()) providers.push(openaiChat)
	if (hasAnthropic()) providers.push(anthropicChat)
	if (!providers.length) throw new Error('AI 未配置')
	let lastErr
	for (const p of providers) {
		try { return await p(system, userText, opts) }
		catch (e) { lastErr = e; console.warn('[ai] provider failed:', e.message) }
	}
	throw lastErr
}

// 强制模型只输出 JSON，并容错解析
export async function chatJSON(system, userText, opts = {}) {
	const raw = await chat(system + '\n\n只输出合法 JSON，不要任何解释、不要 markdown 代码块。', userText, opts)
	let s = raw.trim()
	if (s.startsWith('```')) s = s.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim()
	// 兼容对象 {} 与数组 []：取最外层，谁先出现用谁
	const oi = s.indexOf('{'), ai = s.indexOf('[')
	const useArray = ai !== -1 && (oi === -1 || ai < oi)
	if (useArray) {
		const b = s.lastIndexOf(']')
		if (ai !== -1 && b !== -1) s = s.slice(ai, b + 1)
	} else {
		const b = s.lastIndexOf('}')
		if (oi !== -1 && b !== -1) s = s.slice(oi, b + 1)
	}
	return JSON.parse(s)
}
