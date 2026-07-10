import express from 'express'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import { loadEnv } from './loadenv.js'
import { initDb, query, driver } from './db.js'
import { chatJSON, aiAvailable, conversation, chat } from './ai.js'
import { QUIZZES, getQuiz } from './quizzes.js'
import { PRESETS, getPreset, MODES, levelInfo, buildSystem } from './companions.js'
import { ACTIONS, applyDecay, applyAction, petView, levelOf, stageOf } from './pets.js'
import { uploadImage } from './storage.js'
import { SHOP, THEMES, getItem } from './house.js'

loadEnv()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json())

// H5 跨域：前端 dev 端口与后端 dev 端口不同（5173 vs 3000）时，浏览器会拦 CORS。
app.use((req, res, next) => {
	const origin = req.headers.origin
	// 开发/本地体验允许任意来源；线上如需收紧可改成白名单。
	res.setHeader('Access-Control-Allow-Origin', origin || '*')
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
	res.setHeader('Access-Control-Allow-Credentials', 'true')
	if (req.method === 'OPTIONS') return res.sendStatus(204)
	next()
})

const JWT_SECRET = process.env.JWT_SECRET || 'love-in-zju-dev-secret-change-me'
const H5_DIR = path.join(__dirname, '../frontend/dist/build/h5')
const UPLOAD_DIR = path.join(__dirname, 'uploads')

app.use('/uploads', express.static(UPLOAD_DIR))

// ---------- 工具 ----------
function sign(uid) {
	return jwt.sign({ uid }, JWT_SECRET, { expiresIn: '30d' })
}
function todayYMD() {
	return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }) // YYYY-MM-DD
}
function diffDays(targetYMD) {
	const a = Date.parse(targetYMD + 'T00:00:00Z')
	const b = Date.parse(todayYMD() + 'T00:00:00Z')
	return Math.round((a - b) / 86400000)
}
function genCode() {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去掉易混字符
	const bytes = crypto.randomBytes(6)
	let s = ''
	for (let i = 0; i < 6; i++) s += alphabet[bytes[i] % alphabet.length]
	return s
}
function publicUser(u) {
	if (!u) return null
	return { id: u.id, username: u.username, nickname: u.nickname }
}
async function getUser(id) {
	const { rows } = await query('SELECT * FROM users WHERE id = $1', [id])
	return rows[0]
}

// 鉴权中间件
async function auth(req, res, next) {
	const h = req.headers['authorization'] || ''
	const token = h.startsWith('Bearer ') ? h.slice(7) : ''
	if (!token) return res.status(401).json({ error: '未登录' })
	try {
		const { uid } = jwt.verify(token, JWT_SECRET)
		const u = await getUser(uid)
		if (!u) return res.status(401).json({ error: '账号不存在' })
		req.user = u
		next()
	} catch (e) {
		return res.status(401).json({ error: '登录已过期' })
	}
}

// ---------- 健康检查 ----------
app.get('/api/health', (req, res) => res.json({ ok: true, driver }))

// ---------- 注册/登录 ----------
app.post('/api/auth/register', async (req, res) => {
	try {
		const username = String(req.body.username || '').trim()
		const password = String(req.body.password || '')
		const nickname = String(req.body.nickname || '').trim() || username
		if (username.length < 2 || username.length > 20) return res.status(400).json({ error: '账号需2-20个字符' })
		if (password.length < 6) return res.status(400).json({ error: '密码至少6位' })
		const exist = await query('SELECT id FROM users WHERE username = $1', [username])
		if (exist.rows.length) return res.status(400).json({ error: '该账号已被注册' })
		const hash = bcrypt.hashSync(password, 10)
		const { rows } = await query(
			'INSERT INTO users (username, password_hash, nickname) VALUES ($1,$2,$3) RETURNING id',
			[username, hash, nickname]
		)
		res.json({ token: sign(rows[0].id) })
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: '注册失败' })
	}
})

app.post('/api/auth/login', async (req, res) => {
	try {
		const username = String(req.body.username || '').trim()
		const password = String(req.body.password || '')
		const { rows } = await query('SELECT * FROM users WHERE username = $1', [username])
		const u = rows[0]
		if (!u || !bcrypt.compareSync(password, u.password_hash)) {
			return res.status(400).json({ error: '账号或密码错误' })
		}
		res.json({ token: sign(u.id) })
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: '登录失败' })
	}
})

// ---------- 个人信息 ----------
app.get('/api/me', auth, async (req, res) => {
	const u = req.user
	let partner = null
	let togetherDays = null
	let anniversary = null
	if (u.couple_id) {
		const { rows } = await query(
			"SELECT *, to_char(anniversary,'YYYY-MM-DD') AS anni FROM couples WHERE id = $1",
			[u.couple_id]
		)
		const c = rows[0]
		if (c) {
			const partnerId = c.user_a === u.id ? c.user_b : c.user_a
			partner = publicUser(await getUser(partnerId))
			anniversary = c.anni
			if (anniversary) togetherDays = Math.abs(diffDays(anniversary)) + (diffDays(anniversary) <= 0 ? 1 : 0)
		}
	}
	res.json({
		user: { id: u.id, username: u.username, nickname: u.nickname, status: u.couple_id ? 'couple' : 'single' },
		partner,
		anniversary,
		togetherDays
	})
})

app.put('/api/me', auth, async (req, res) => {
	const nickname = String(req.body.nickname || '').trim()
	if (!nickname) return res.status(400).json({ error: '昵称不能为空' })
	await query('UPDATE users SET nickname = $1 WHERE id = $2', [nickname, req.user.id])
	res.json({ ok: true })
})

// ---------- 情侣绑定 ----------
app.post('/api/couple/invite', auth, async (req, res) => {
	if (req.user.couple_id) return res.status(400).json({ error: '你已经绑定了另一半' })
	await query('DELETE FROM invites WHERE user_id = $1', [req.user.id])
	let code
	for (let i = 0; i < 5; i++) {
		code = genCode()
		const dup = await query('SELECT code FROM invites WHERE code = $1', [code])
		if (!dup.rows.length) break
	}
	await query('INSERT INTO invites (code, user_id) VALUES ($1,$2)', [code, req.user.id])
	res.json({ code })
})

app.post('/api/couple/bind', auth, async (req, res) => {
	try {
		const code = String(req.body.code || '').trim().toUpperCase()
		if (!code) return res.status(400).json({ error: '请输入邀请码' })
		if (req.user.couple_id) return res.status(400).json({ error: '你已经绑定了另一半' })
		const { rows } = await query('SELECT * FROM invites WHERE code = $1', [code])
		const inv = rows[0]
		if (!inv) return res.status(400).json({ error: '邀请码无效' })
		if (inv.user_id === req.user.id) return res.status(400).json({ error: '不能绑定自己哦' })
		const inviter = await getUser(inv.user_id)
		if (!inviter) return res.status(400).json({ error: '对方账号不存在' })
		if (inviter.couple_id) return res.status(400).json({ error: '对方已经绑定了别人' })
		const c = await query(
			'INSERT INTO couples (user_a, user_b) VALUES ($1,$2) RETURNING id',
			[inviter.id, req.user.id]
		)
		const coupleId = c.rows[0].id
		await query('UPDATE users SET couple_id = $1 WHERE id = $2', [coupleId, inviter.id])
		await query('UPDATE users SET couple_id = $1 WHERE id = $2', [coupleId, req.user.id])
		await query('DELETE FROM invites WHERE user_id = $1 OR user_id = $2', [inviter.id, req.user.id])
		res.json({ ok: true })
	} catch (e) {
		console.error(e)
		res.status(500).json({ error: '绑定失败' })
	}
})

app.post('/api/couple/unbind', auth, async (req, res) => {
	const cid = req.user.couple_id
	if (!cid) return res.status(400).json({ error: '你还没有绑定' })
	await query('UPDATE users SET couple_id = NULL WHERE couple_id = $1', [cid])
	await query('UPDATE countdowns SET shared = false, couple_id = NULL WHERE couple_id = $1', [cid])
	await query('DELETE FROM couples WHERE id = $1', [cid])
	res.json({ ok: true })
})

app.post('/api/couple/anniversary', auth, async (req, res) => {
	const cid = req.user.couple_id
	if (!cid) return res.status(400).json({ error: '还没有绑定另一半' })
	const date = String(req.body.date || '')
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: '日期格式不对' })
	await query('UPDATE couples SET anniversary = $1 WHERE id = $2', [date, cid])
	res.json({ ok: true })
})

// ---------- 倒数日 ----------
app.get('/api/countdowns', auth, async (req, res) => {
	const u = req.user
	const { rows } = await query(
		`SELECT id, owner_id, couple_id, title, to_char(target_date,'YYYY-MM-DD') AS target_date, shared
		 FROM countdowns
		 WHERE owner_id = $1 OR (shared = true AND couple_id = $2)
		 ORDER BY target_date ASC`,
		[u.id, u.couple_id || -1]
	)
	const list = rows.map(r => ({
		id: r.id,
		title: r.title,
		target_date: r.target_date,
		shared: !!r.shared,
		mine: r.owner_id === u.id,
		days: diffDays(r.target_date)
	}))
	res.json({ list })
})

app.post('/api/countdowns', auth, async (req, res) => {
	const title = String(req.body.title || '').trim()
	const date = String(req.body.target_date || '')
	const shared = !!req.body.shared && !!req.user.couple_id
	if (!title) return res.status(400).json({ error: '请填写名称' })
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: '日期格式不对' })
	await query(
		'INSERT INTO countdowns (owner_id, couple_id, title, target_date, shared) VALUES ($1,$2,$3,$4,$5)',
		[req.user.id, shared ? req.user.couple_id : null, title, date, shared]
	)
	res.json({ ok: true })
})

app.delete('/api/countdowns/:id', auth, async (req, res) => {
	const id = parseInt(req.params.id, 10)
	if (!id) return res.status(400).json({ error: '参数错误' })
	await query('DELETE FROM countdowns WHERE id = $1 AND owner_id = $2', [id, req.user.id])
	res.json({ ok: true })
})

// ---------- AI 算命（生辰八字）----------
app.get('/api/ai/status', (req, res) => res.json({ available: aiAvailable() }))

function validateBirth(b) {
	if (!b || typeof b !== 'object') return '请填写完整的出生信息'
	const y = Number.parseInt(b.year, 10)
	const m = Number.parseInt(b.month, 10)
	const d = Number.parseInt(b.day, 10)
	const h = Number.parseInt(b.hour, 10)
	const min = Number.parseInt(b.minute, 10)
	const gender = b.gender

	if (!Number.isFinite(y) || y < 1900 || y > 2100) return '出生年份不合法'
	if (!Number.isFinite(m) || m < 1 || m > 12) return '出生月份不合法'
	if (!Number.isFinite(d) || d < 1 || d > 31) return '出生日期不合法'
	if (!Number.isFinite(h) || h < 0 || h > 23) return '出生小时不合法'
	if (!Number.isFinite(min) || min < 0 || min > 59) return '出生分钟不合法'

	// 校验真实日期（如 2 月 30 日不合法）
	const dt = new Date(Date.UTC(y, m - 1, d, h, min, 0))
	if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
		return '出生日期不合法'
	}

	if (gender !== 'male' && gender !== 'female') return '性别不合法'
	return null
}

function birthLabel(b) {
	const g = b.gender === 'male' ? '男' : b.gender === 'female' ? '女' : '未填'
	return `${b.year}年${b.month}月${b.day}日 ${String(b.hour).padStart(2,'0')}:${String(b.minute).padStart(2,'0')}（${g}）`
}

function clampInt(n, min, max, fallback) {
	const x = typeof n === 'number' ? n : Number(n)
	if (!Number.isFinite(x)) return fallback
	const v = Math.round(x)
	return Math.max(min, Math.min(max, v))
}

function safeString(v, fallback = '', maxLen) {
	let s = typeof v === 'string' ? v : (v === undefined || v === null) ? '' : String(v)
	s = s.trim()
	if (!s) s = fallback
	if (typeof maxLen === 'number') s = s.slice(0, maxLen)
	return s
}

function normalizeTraits(v, { fallback = [], maxItems = 3, maxLen = 12 } = {}) {
	let arr = Array.isArray(v) ? v : []
	arr = arr.map(x => safeString(x, '', maxLen)).filter(Boolean)
	if (!arr.length) arr = fallback
	return arr.slice(0, maxItems)
}

function normalizeFortunePersonal(raw) {
	if (!raw || typeof raw !== 'object') throw new Error('personal payload invalid')
	if (raw.score === undefined) throw new Error('personal score missing')

	const five = (raw.fiveElements && typeof raw.fiveElements === 'object') ? raw.fiveElements : null
	const peach = (raw.peachBlossom && typeof raw.peachBlossom === 'object') ? raw.peachBlossom : null
	const next = (raw.nextRomance && typeof raw.nextRomance === 'object') ? raw.nextRomance : null
	const love = (raw.trueLove && typeof raw.trueLove === 'object') ? raw.trueLove : null
	if (!five || !peach || !next || !love) throw new Error('personal fields missing')

	return {
		score: clampInt(raw.score, 0, 100, 50),
		fiveElements: {
			dayMaster: safeString(five.dayMaster, '日主未解析', 30),
			distribution: safeString(five.distribution, '五行分布未解析', 40),
			analysis: safeString(five.analysis, '五行影响未解析', 60)
		},
		peachBlossom: {
			direction: safeString(peach.direction, '桃花方位未解析', 20),
			timing: safeString(peach.timing, '桃花时机未解析', 24),
			analysis: safeString(peach.analysis, '桃花运势未解析', 60)
		},
		nextRomance: {
			description: safeString(next.description, '下一个桃花的线索未解析', 60),
			where: safeString(next.where, '可能场合未解析', 30),
			when: safeString(next.when, '大概时间未解析', 20),
			traits: normalizeTraits(next.traits, { fallback: ['更容易心动', '沟通顺畅'], maxItems: 3, maxLen: 12 })
		},
		trueLove: {
			description: safeString(love.description, '正缘整体描述未解析', 70),
			where: safeString(love.where, '可能在哪里遇见未解析', 30),
			traits: normalizeTraits(love.traits, { fallback: ['气质温柔', '价值观相合'], maxItems: 3, maxLen: 12 }),
			howToMeet: safeString(love.howToMeet, '如何把握未解析', 40)
		},
		advice: safeString(raw.advice, '整体恋爱建议未解析', 50)
	}
}

function normalizeFortuneCouple(raw) {
	if (!raw || typeof raw !== 'object') throw new Error('couple payload invalid')
	if (raw.score === undefined) throw new Error('couple score missing')

	if (!raw.fiveElementsMatch || !raw.personalities || !raw.strengths) throw new Error('couple fields missing')

	return {
		score: clampInt(raw.score, 0, 100, 60),
		fiveElementsMatch: safeString(raw.fiveElementsMatch, '五行匹配未解析', 70),
		personalities: safeString(raw.personalities, '性格匹配未解析', 70),
		strengths: normalizeTraits(raw.strengths, { fallback: ['互相理解'], maxItems: 4, maxLen: 18 }),
		challenges: normalizeTraits(raw.challenges, { fallback: [], maxItems: 4, maxLen: 18 }),
		prediction: safeString(raw.prediction, '发展预测未解析', 60),
		advice: safeString(raw.advice, '相处建议未解析', 50)
	}
}

// 个人命理
app.post('/api/ai/fortune/personal', auth, async (req, res) => {
	try {
		const birth = req.body.birth || {}
		const err = validateBirth(birth)
		if (err) return res.status(400).json({ error: err })
		const gender = birth.gender === 'male' ? '男' : birth.gender === 'female' ? '女' : '未填'
		const day = todayYMD()
		const nick = req.user.nickname || req.user.username

		// 按天缓存：同一用户当天返回同一份结果，体验更稳定
		try {
			const cached = await query(
				'SELECT payload FROM ai_fortunes WHERE user_id=$1 AND kind=$2 AND day=$3',
				[req.user.id, 'personal', day]
			)
			if (cached.rows.length) {
				const parsed = JSON.parse(cached.rows[0].payload || '{}')
				const norm = normalizeFortunePersonal(parsed)
				return res.json(norm)
			}
		} catch (e) {
			console.warn('[fortune personal] cache fail:', e.message)
		}

		const sys = `你是一位精通传统八字命理和现代恋爱心理学的资深命理师。你根据生辰八字（年月日时分）推算五行属性、桃花方位、正缘特征。你的语言温暖、具体、有画面感，既有传统命理的底蕴又有现代感，绝不迷信恐吓，始终积极正向。

请严格按以下 JSON 格式返回（不要 markdown 代码块）：
{
  "score": 0到100的整数（综合恋爱运势评分）,
  "fiveElements": {
    "dayMaster": "日主天干，如「甲木」",
    "distribution": "五行分布简述，如「木旺、火相、土休」",
    "analysis": "五行对你性格和感情的影响，不超过60字"
  },
  "peachBlossom": {
    "direction": "桃花方位，如「正南方」",
    "timing": "桃花出现的时机，如「每年春夏之交」",
    "analysis": "桃花运势分析，不超过60字"
  },
  "nextRomance": {
    "description": "下一个桃花的性格特征和外貌描述，不超过60字",
    "where": "可能出现的地点和场合，不超过30字",
    "when": "大概出现的时间，不超过20字",
    "traits": ["性格标签1", "性格标签2", "性格标签3"]
  },
  "trueLove": {
    "description": "正缘的整体描述，不超过70字",
    "where": "可能在哪里遇见，不超过30字",
    "traits": ["正缘特征1", "特征2", "特征3"],
    "howToMeet": "如何把握正缘的建议，不超过40字"
  },
  "advice": "整体恋爱建议，不超过50字"
}`

		let lastErr
		for (let i = 0; i < 2; i++) {
			try {
				const data = await chatJSON(
					sys,
					`用户「${nick}」，出生时间：${birthLabel(birth)}。请为 TA 推算命理恋爱运势。`,
					{ maxTokens: 1200 }
				)
				const norm = normalizeFortunePersonal(data)
				await query(
					`INSERT INTO ai_fortunes (user_id, kind, day, payload)
					 VALUES ($1,$2,$3,$4)
					 ON CONFLICT (user_id, kind, day)
					 DO UPDATE SET payload=EXCLUDED.payload, created_at=now()`,
					[req.user.id, 'personal', day, JSON.stringify(norm)]
				)
				return res.json(norm)
			} catch (e) {
				lastErr = e
				console.warn('[fortune personal] gen fail:', e.message)
			}
		}
		console.error('[fortune personal] final fail:', lastErr?.message)
		return res.status(503).json({ error: 'AI 暂时不在状态，待会再试试～' })
	} catch (e) {
		console.error('[fortune personal]', e.message)
		res.status(503).json({ error: 'AI 暂时不在状态，待会再试试～' })
	}
})

// 发起合盘
app.post('/api/ai/fortune/invite', auth, async (req, res) => {
	try {
		const birth = req.body.birth || {}
		const err = validateBirth(birth)
		if (err) return res.status(400).json({ error: err })
		// 清理旧会话
		await query('DELETE FROM fortune_sessions WHERE creator_id=$1', [req.user.id])
		let code
		for (let i = 0; i < 20; i++) {
			code = genCode()
			const dup = await query('SELECT code FROM fortune_sessions WHERE code=$1', [code])
			if (!dup.rows.length) break
		}
		if (!code) return res.status(500).json({ error: '生成邀请码失败' })
		await query('INSERT INTO fortune_sessions (code, creator_id, creator_birth) VALUES ($1,$2,$3)',
			[code, req.user.id, JSON.stringify(birth)])
		res.json({ code })
	} catch (e) {
		console.error('[fortune invite]', e.message)
		res.status(500).json({ error: '生成邀请码失败' })
	}
})

// 接受合盘邀请
app.post('/api/ai/fortune/accept', auth, async (req, res) => {
	try {
		const code = String(req.body.code || '').trim().toUpperCase()
		const birth = req.body.birth || {}
		const matchType = req.body.matchType === 'friend' ? 'friend' : 'love'
		if (!code) return res.status(400).json({ error: '请输入邀请码' })
		const err = validateBirth(birth)
		if (err) return res.status(400).json({ error: err })

		const { rows } = await query('SELECT * FROM fortune_sessions WHERE code=$1', [code])
		const session = rows[0]
		if (!session) return res.status(400).json({ error: '邀请码无效或已过期' })
		if (session.creator_id === req.user.id) return res.status(400).json({ error: '不能和自己合盘哦' })
		if (session.partner_id && session.partner_id !== req.user.id) {
			return res.status(400).json({ error: '该邀请码已被其他人使用' })
		}

		// 如果已有结果，直接返回
		if (session.result_json) {
			try {
				const parsed = JSON.parse(session.result_json || '{}')
				const norm = normalizeFortuneCouple(parsed)
				return res.json({ code, matchType: session.match_type, ...norm })
			} catch (e) {
				console.warn('[fortune accept] cached result parse fail:', e.message)
				// 缓存不可用，继续走重新生成流程
			}
		}

		const creator = await getUser(session.creator_id)
		const creatorBirth = JSON.parse(session.creator_birth)
		const creatorName = (creator && (creator.nickname || creator.username)) || '发起者'
		const myName = req.user.nickname || req.user.username

		const typeLabel = matchType === 'friend' ? '友谊' : '恋爱'
		const sys = `你是一位精通八字合盘的资深命理师。你根据两人的生辰八字分析他们的匹配程度。你的分析有传统命理的深度，又温暖亲切、积极正向，仅供娱乐参考。

请严格按以下 JSON 格式返回（不要 markdown 代码块）：
{
  "score": 0到100的整数（综合匹配分数）,
  "fiveElementsMatch": "双方五行生克分析，如「你的甲木得对方癸水滋润，相生相济」，不超过70字",
  "personalities": "双方性格匹配分析，不超过70字",
  "strengths": ["互补或契合的点1", "点2", "点3"],
  "challenges": ["需要注意或磨合的地方1", "地方2"],
  "prediction": "${typeLabel}关系发展预测，不超过60字",
  "advice": "给你们${typeLabel}相处的建议，不超过50字"
}`

		const userPrompt = `请为以下两人进行${typeLabel}合盘测算：
「${creatorName}」的出生时间：${birthLabel(creatorBirth)}
「${myName}」的出生时间：${birthLabel(birth)}
测算类型：${typeLabel}匹配`

		let lastErr
		for (let i = 0; i < 2; i++) {
			try {
				const data = await chatJSON(sys, userPrompt, { maxTokens: 1200 })
				const norm = normalizeFortuneCouple(data)
				const resultJson = JSON.stringify(norm)

				await query(
					'UPDATE fortune_sessions SET partner_id=$1, partner_birth=$2, match_type=$3, result_json=$4 WHERE code=$5',
					[req.user.id, JSON.stringify(birth), matchType, resultJson, code])

				return res.json({ code, matchType, ...norm })
			} catch (e) {
				lastErr = e
				console.warn('[fortune accept] gen fail:', e.message)
			}
		}
		console.error('[fortune accept] final fail:', lastErr?.message)
		return res.status(503).json({ error: 'AI 暂时不在状态，待会再试试～' })
	} catch (e) {
		console.error('[fortune accept]', e.message)
		res.status(503).json({ error: 'AI 暂时不在状态，待会再试试～' })
	}
})

// 查看合盘状态/结果
app.get('/api/ai/fortune/session/:code', auth, async (req, res) => {
	const code = String(req.params.code || '').trim().toUpperCase()
	if (!code) return res.status(400).json({ error: '缺少邀请码' })
	const { rows } = await query('SELECT * FROM fortune_sessions WHERE code=$1', [code])
	const session = rows[0]
	if (!session) return res.status(400).json({ error: '会话不存在' })
	const isCreator = session.creator_id === req.user.id
	const isPartner = session.partner_id === req.user.id
	if (!isCreator && !isPartner) return res.status(403).json({ error: '无权查看' })

	if (!session.result_json) {
		return res.json({
			code: session.code,
			ready: false,
			creatorName: (await getUser(session.creator_id))?.nickname || '发起者',
			partnerJoined: !!session.partner_id,
			matchType: null
		})
	}

	try {
		const parsed = JSON.parse(session.result_json || '{}')
		const norm = normalizeFortuneCouple(parsed)
		return res.json({
			code: session.code,
			ready: true,
			matchType: session.match_type,
			...norm
		})
	} catch (e) {
		console.error('[fortune session] parse fail:', e.message)
		return res.status(503).json({ error: '结果生成失败，请稍后再试～' })
	}
})

// ---------- 匹配度测试 ----------
app.get('/api/quiz/list', auth, (req, res) => {
	res.json({ list: QUIZZES.map(q => ({ id: q.id, title: q.title, desc: q.desc, count: q.questions.length })) })
})

app.get('/api/quiz/:id', auth, (req, res) => {
	const quiz = getQuiz(req.params.id)
	if (!quiz) return res.status(404).json({ error: '题库不存在' })
	res.json({ id: quiz.id, title: quiz.title, desc: quiz.desc, questions: quiz.questions.map(q => ({ q: q.q, options: q.options })) })
})

app.post('/api/quiz/:id/answer', auth, async (req, res) => {
	const quiz = getQuiz(req.params.id)
	if (!quiz) return res.status(404).json({ error: '题库不存在' })
	if (!req.user.couple_id) return res.status(400).json({ error: '绑定另一半后才能玩双人测试哦' })
	const answers = Array.isArray(req.body.answers) ? req.body.answers : []
	if (answers.length !== quiz.questions.length) return res.status(400).json({ error: '请把题目答完' })
	const clean = answers.map(a => parseInt(a, 10))
	if (clean.some((a, i) => !(a >= 0 && a < quiz.questions[i].options.length))) return res.status(400).json({ error: '答案不合法' })
	await query(
		'INSERT INTO quiz_answers (couple_id, quiz_id, user_id, answers) VALUES ($1,$2,$3,$4) ON CONFLICT (couple_id, quiz_id, user_id) DO UPDATE SET answers=EXCLUDED.answers, created_at=now()',
		[req.user.couple_id, quiz.id, req.user.id, JSON.stringify(clean)])
	// 答案变了则清掉旧结果
	await query('DELETE FROM quiz_results WHERE couple_id=$1 AND quiz_id=$2', [req.user.couple_id, quiz.id])
	const cnt = await query('SELECT COUNT(*)::int AS n FROM quiz_answers WHERE couple_id=$1 AND quiz_id=$2', [req.user.couple_id, quiz.id])
	res.json({ youDone: true, bothDone: cnt.rows[0].n >= 2 })
})

app.get('/api/quiz/:id/result', auth, async (req, res) => {
	try {
		const quiz = getQuiz(req.params.id)
		if (!quiz) return res.status(404).json({ error: '题库不存在' })
		const cid = req.user.couple_id
		if (!cid) return res.status(400).json({ error: '绑定另一半后才能玩双人测试哦' })
		const { rows } = await query('SELECT user_id, answers FROM quiz_answers WHERE couple_id=$1 AND quiz_id=$2', [cid, quiz.id])
		const mine = rows.find(r => r.user_id === req.user.id)
		const other = rows.find(r => r.user_id !== req.user.id)
		if (!mine) return res.json({ ready: false, youDone: false, partnerDone: !!other })
		if (!other) return res.json({ ready: false, youDone: true, partnerDone: false })

		const aAns = JSON.parse(mine.answers), bAns = JSON.parse(other.answers)
		// 稳定签名：按 user_id 排序，双方调用得到相同 sig，答案变化即失效
		const sig = JSON.stringify([[mine.user_id, aAns], [other.user_id, bAns]].sort((x, y) => x[0] - y[0]))
		const cached = await query('SELECT payload, sig FROM quiz_results WHERE couple_id=$1 AND quiz_id=$2', [cid, quiz.id])
		if (cached.rows.length && cached.rows[0].sig === sig) {
			return res.json({ ready: true, ...JSON.parse(cached.rows[0].payload) })
		}
		let matched = 0
		quiz.questions.forEach((_, i) => { if (aAns[i] === bAns[i]) matched++ })
		const total = quiz.questions.length
		const score = Math.round(40 + 60 * matched / total)

		// 交给 AI 生成解读
		const partner = await getUser(other.user_id)
		const meName = req.user.nickname || req.user.username
		const taName = (partner && (partner.nickname || partner.username)) || '对方'
		const detail = quiz.questions.map((q, i) =>
			`题:${q.q}\n${meName}选:${q.options[aAns[i]]}\n${taName}选:${q.options[bAns[i]]}`).join('\n\n')
		let ai = { summary: '', highlights: [], suggestion: '' }
		try {
			ai = await chatJSON(
				'你是温柔的恋爱关系分析师，根据情侣二人的答题结果，写一段积极、具体、有温度的默契解读。',
				`情侣「${meName}」和「${taName}」完成了「${quiz.title}」，共 ${total} 题，其中 ${matched} 题选择一致。以下是逐题作答：\n\n${detail}\n\n请返回 JSON：{"summary": "整体默契解读(不超过100字)", "highlights": ["2到3条你们很合拍或值得注意的点，每条不超过25字"], "suggestion": "给这对情侣的一条相处小建议(不超过40字)"}`,
				{ maxTokens: 700 })
		} catch (e) {
			ai = { summary: `你们在 ${total} 道题里有 ${matched} 题想法一致，默契值 ${score} 分！继续多聊聊彼此的想法吧～`, highlights: [], suggestion: '找时间聊聊那些答案不同的题，会更懂对方哦。' }
		}
		const payload = { score, matched, total, meName, taName, ...ai }
		await query('INSERT INTO quiz_results (couple_id, quiz_id, sig, payload) VALUES ($1,$2,$3,$4) ON CONFLICT (couple_id, quiz_id) DO UPDATE SET sig=EXCLUDED.sig, payload=EXCLUDED.payload, created_at=now()',
			[cid, quiz.id, sig, JSON.stringify(payload)])
		res.json({ ready: true, ...payload })
	} catch (e) {
		console.error('[quiz result]', e.message)
		res.status(500).json({ error: '生成结果失败，稍后再试' })
	}
})

// ---------- 匹配度测试·分享版（无需绑定情侣） ----------
// 计算两份答案的默契度并交给 AI 生成解读（视角无关，双方看到相同解读）
async function analyzeQuizPair(quiz, aAns, aName, bAns, bName) {
	let matched = 0
	quiz.questions.forEach((_, i) => { if (aAns[i] === bAns[i]) matched++ })
	const total = quiz.questions.length
	const score = Math.round(40 + 60 * matched / total)
	const detail = quiz.questions.map((q, i) =>
		`题:${q.q}\n${aName}选:${q.options[aAns[i]]}\n${bName}选:${q.options[bAns[i]]}`).join('\n\n')
	let ai = { summary: '', highlights: [], suggestion: '' }
	try {
		ai = await chatJSON(
			'你是温柔风趣的关系分析师，根据两个人的答题结果，写一段积极、具体、有温度的默契解读。他们不一定是情侣，可能是朋友、暧昧对象或只是想测测默契的两个人，用词请中性友好。',
			`「${aName}」和「${bName}」完成了「${quiz.title}」，共 ${total} 题，其中 ${matched} 题选择一致。以下是逐题作答：\n\n${detail}\n\n请返回 JSON：{"summary": "整体默契解读(不超过100字)", "highlights": ["2到3条你们很合拍或值得注意的点，每条不超过25字"], "suggestion": "给两人的一条相处小建议(不超过40字)"}`,
			{ maxTokens: 700 })
	} catch (e) {
		ai = { summary: `你们在 ${total} 道题里有 ${matched} 题想法一致，默契值 ${score} 分！继续多聊聊彼此的想法吧～`, highlights: [], suggestion: '找时间聊聊那些答案不同的题，会更懂对方哦。' }
	}
	return {
		score, matched, total,
		summary: ai.summary || '',
		highlights: Array.isArray(ai.highlights) ? ai.highlights.slice(0, 3) : [],
		suggestion: ai.suggestion || ''
	}
}

// 发起人先答题 → 生成邀请码（可拼成链接分享）
app.post('/api/quiz/:id/share', auth, async (req, res) => {
	const quiz = getQuiz(req.params.id)
	if (!quiz) return res.status(404).json({ error: '题库不存在' })
	const answers = Array.isArray(req.body.answers) ? req.body.answers : []
	if (answers.length !== quiz.questions.length) return res.status(400).json({ error: '请把题目答完' })
	const clean = answers.map(a => parseInt(a, 10))
	if (clean.some((a, i) => !(a >= 0 && a < quiz.questions[i].options.length))) return res.status(400).json({ error: '答案不合法' })
	try {
		// 清理该用户此题库下还没人作答的旧邀请，避免堆积
		await query('DELETE FROM quiz_sessions WHERE creator_id=$1 AND quiz_id=$2 AND result_json IS NULL', [req.user.id, quiz.id])
		let code
		for (let i = 0; i < 20; i++) {
			code = genCode()
			const dup = await query('SELECT code FROM quiz_sessions WHERE code=$1', [code])
			if (!dup.rows.length) break
		}
		if (!code) return res.status(500).json({ error: '生成邀请码失败' })
		const creatorName = req.user.nickname || req.user.username
		await query('INSERT INTO quiz_sessions (code, quiz_id, creator_id, creator_name, creator_answers) VALUES ($1,$2,$3,$4,$5)',
			[code, quiz.id, req.user.id, creatorName, JSON.stringify(clean)])
		res.json({ code, quizId: quiz.id })
	} catch (e) {
		console.error('[quiz share create]', e.message)
		res.status(500).json({ error: '生成分享失败，稍后再试' })
	}
})

// 查看分享测试的状态/结果（发起人轮询、加入者进入前预览都走这里）
app.get('/api/quiz/share/:code', auth, async (req, res) => {
	const code = String(req.params.code || '').trim().toUpperCase()
	if (!code) return res.status(400).json({ error: '缺少邀请码' })
	const { rows } = await query('SELECT * FROM quiz_sessions WHERE code=$1', [code])
	const s = rows[0]
	if (!s) return res.status(404).json({ error: '链接无效或已过期' })
	const quiz = getQuiz(s.quiz_id)
	const isCreator = s.creator_id === req.user.id
	const isPartner = s.partner_id === req.user.id
	const base = {
		code: s.code,
		quizId: s.quiz_id,
		quizTitle: quiz ? quiz.title : '匹配度测试',
		quizDesc: quiz ? quiz.desc : '',
		creatorName: s.creator_name || '发起者',
		isCreator,
		isPartner,
		joined: !!s.partner_id
	}
	if (s.result_json) {
		try {
			const r = JSON.parse(s.result_json)
			const meName = isCreator ? s.creator_name : (isPartner ? s.partner_name : s.creator_name)
			const taName = isCreator ? s.partner_name : (isPartner ? s.creator_name : s.partner_name)
			return res.json({ ...base, ready: true, ...r, meName: meName || '你', taName: taName || '对方' })
		} catch (e) {
			console.error('[quiz share get] parse fail:', e.message)
		}
	}
	res.json({ ...base, ready: false })
})

// 加入者凭邀请码作答 → 立即出结果
app.post('/api/quiz/share/:code/answer', auth, async (req, res) => {
	const code = String(req.params.code || '').trim().toUpperCase()
	if (!code) return res.status(400).json({ error: '缺少邀请码' })
	const { rows } = await query('SELECT * FROM quiz_sessions WHERE code=$1', [code])
	const s = rows[0]
	if (!s) return res.status(404).json({ error: '链接无效或已过期' })
	const quiz = getQuiz(s.quiz_id)
	if (!quiz) return res.status(404).json({ error: '题库不存在' })
	if (s.creator_id === req.user.id) return res.status(400).json({ error: '这是你发起的测试，等对方来答就好啦～' })
	// 已经出过结果
	if (s.result_json) {
		if (s.partner_id === req.user.id) {
			try {
				const r = JSON.parse(s.result_json)
				return res.json({ ready: true, ...r, meName: s.partner_name || '你', taName: s.creator_name || '对方' })
			} catch (e) { /* 落到重新生成 */ }
		} else {
			return res.status(400).json({ error: '这个链接已经有人答过啦，让 TA 再发个新的给你吧～' })
		}
	}
	if (s.partner_id && s.partner_id !== req.user.id) return res.status(400).json({ error: '这个链接已经有人在答了' })
	const answers = Array.isArray(req.body.answers) ? req.body.answers : []
	if (answers.length !== quiz.questions.length) return res.status(400).json({ error: '请把题目答完' })
	const clean = answers.map(a => parseInt(a, 10))
	if (clean.some((a, i) => !(a >= 0 && a < quiz.questions[i].options.length))) return res.status(400).json({ error: '答案不合法' })
	try {
		const creatorAns = JSON.parse(s.creator_answers)
		const partnerName = req.user.nickname || req.user.username
		const analysis = await analyzeQuizPair(quiz, creatorAns, s.creator_name || '发起者', clean, partnerName)
		await query('UPDATE quiz_sessions SET partner_id=$1, partner_name=$2, partner_answers=$3, result_json=$4 WHERE code=$5',
			[req.user.id, partnerName, JSON.stringify(clean), JSON.stringify(analysis), code])
		res.json({ ready: true, ...analysis, meName: partnerName, taName: s.creator_name || '对方' })
	} catch (e) {
		console.error('[quiz share answer]', e.message)
		res.status(500).json({ error: '生成结果失败，稍后再试' })
	}
})

// ---------- 每日任务 ----------
async function partnerNames(user) {
	let me = user.nickname || user.username
	let ta = '另一半'
	if (user.couple_id) {
		const { rows } = await query('SELECT * FROM couples WHERE id=$1', [user.couple_id])
		const c = rows[0]
		if (c) {
			const pid = c.user_a === user.id ? c.user_b : c.user_a
			const p = await getUser(pid)
			if (p) ta = p.nickname || p.username
		}
	}
	return { me, ta }
}

async function generateDailyTasks(user) {
	const { me, ta } = await partnerNames(user)
	const fallback = [
		{ emoji: '🤝', title: '一起完成一件小事', detail: '今天挑一件平时懒得做的小事，两个人一起搞定，比如整理房间或做顿饭。' },
		{ emoji: '💌', title: '给对方留一句话', detail: `${me} 和 ${ta} 互相说一句最近想对对方说、却没说出口的话。` },
		{ emoji: '📷', title: '拍一张今天的合照', detail: '哪怕不在一起，也各自拍一张此刻的风景发给对方，把今天存进回忆。' }
	]
	try {
		const arr = await chatJSON(
			'你是「爱在浙大」的恋爱任务官，为浙大的情侣设计今天可完成的小任务，温暖有趣、门槛低、能增进感情，可适当结合校园或日常场景。',
			`为情侣「${me}」和「${ta}」生成今天的 3 个恋爱小任务。要求：一个偏"一起做一件事"，一个偏"表达心意"，一个偏"小惊喜或记录"。返回 JSON 数组，每个元素：{"emoji":"一个emoji", "title":"任务名(不超过12字)", "detail":"具体怎么做(不超过45字)"}。只返回数组。`,
			{ maxTokens: 700 })
		const list = Array.isArray(arr) ? arr : (arr.tasks || arr.list || [])
		const cleaned = list.filter(t => t && t.title).slice(0, 3).map(t => ({
			emoji: String(t.emoji || '💗').slice(0, 4),
			title: String(t.title).slice(0, 40),
			detail: String(t.detail || '').slice(0, 120)
		}))
		return cleaned.length ? cleaned : fallback
	} catch (e) {
		console.warn('[tasks] ai fail, use fallback:', e.message)
		return fallback
	}
}

async function todayTasks(user) {
	const day = todayYMD()
	const { rows } = await query('SELECT id, emoji, title, detail, done FROM daily_tasks WHERE couple_id=$1 AND day=$2 ORDER BY id ASC', [user.couple_id, day])
	const list = rows.map(r => ({ id: r.id, emoji: r.emoji, title: r.title, detail: r.detail, done: !!r.done }))
	return { day, list, doneCount: list.filter(t => t.done).length, total: list.length }
}

app.get('/api/tasks/today', auth, async (req, res) => {
	try {
		if (!req.user.couple_id) return res.status(400).json({ error: '绑定另一半后就有每日任务啦' })
		const day = todayYMD()
		const exist = await query('SELECT COUNT(*)::int AS n FROM daily_tasks WHERE couple_id=$1 AND day=$2', [req.user.couple_id, day])
		if (exist.rows[0].n === 0) {
			const tasks = await generateDailyTasks(req.user)
			for (const t of tasks) {
				await query('INSERT INTO daily_tasks (couple_id, day, emoji, title, detail) VALUES ($1,$2,$3,$4,$5)',
					[req.user.couple_id, day, t.emoji, t.title, t.detail])
			}
		}
		res.json(await todayTasks(req.user))
	} catch (e) {
		console.error('[tasks today]', e.message)
		res.status(500).json({ error: '获取任务失败' })
	}
})

app.post('/api/tasks/:id/toggle', auth, async (req, res) => {
	if (!req.user.couple_id) return res.status(400).json({ error: '未绑定' })
	const id = parseInt(req.params.id, 10)
	const { rows } = await query('SELECT * FROM daily_tasks WHERE id=$1 AND couple_id=$2', [id, req.user.couple_id])
	if (!rows.length) return res.status(404).json({ error: '任务不存在' })
	const done = !rows[0].done
	await query('UPDATE daily_tasks SET done=$1, done_at=$2 WHERE id=$3', [done, done ? new Date().toISOString() : null, id])
	if (done) await addCoins(req.user.couple_id, 5) // 完成任务赚爱心币
	res.json(await todayTasks(req.user))
})

app.post('/api/tasks/refresh', auth, async (req, res) => {
	try {
		if (!req.user.couple_id) return res.status(400).json({ error: '未绑定' })
		const day = todayYMD()
		await query('DELETE FROM daily_tasks WHERE couple_id=$1 AND day=$2', [req.user.couple_id, day])
		const tasks = await generateDailyTasks(req.user)
		for (const t of tasks) {
			await query('INSERT INTO daily_tasks (couple_id, day, emoji, title, detail) VALUES ($1,$2,$3,$4,$5)',
				[req.user.couple_id, day, t.emoji, t.title, t.detail])
		}
		res.json(await todayTasks(req.user))
	} catch (e) {
		console.error('[tasks refresh]', e.message)
		res.status(500).json({ error: '换一批失败' })
	}
})

// ---------- AI 陪伴 ----------
const MODE_KEYS = Object.keys(MODES)

function companionView(c) {
	if (!c) return null
	return { name: c.name, emoji: c.emoji, persona: c.persona, address: c.address, presetId: c.preset_id, ...levelInfo(c.affinity || 0) }
}
async function getCompanion(uid) {
	const { rows } = await query('SELECT * FROM companions WHERE user_id=$1', [uid])
	return rows[0] || null
}

app.get('/api/companion/presets', auth, (req, res) => {
	res.json({
		presets: PRESETS.map(p => ({ id: p.id, name: p.name, emoji: p.emoji, gender: p.gender, persona: p.persona })),
		modes: MODE_KEYS.map(k => ({ key: k, name: MODES[k].name, emoji: MODES[k].emoji }))
	})
})

app.get('/api/companion', auth, async (req, res) => {
	const c = await getCompanion(req.user.id)
	if (!c) return res.json({ companion: null, messages: [] })
	const { rows } = await query('SELECT id, role, content, mode FROM companion_messages WHERE user_id=$1 ORDER BY id ASC LIMIT 60', [req.user.id])
	res.json({ companion: companionView(c), messages: rows })
})

app.post('/api/companion', auth, async (req, res) => {
	try {
		let name, emoji, persona, address, presetId
		if (req.body.presetId) {
			const p = getPreset(req.body.presetId)
			if (!p) return res.status(400).json({ error: '角色不存在' })
			name = p.name; emoji = p.emoji; persona = p.persona; address = p.address; presetId = p.id
		} else {
			name = String(req.body.name || '').trim().slice(0, 12)
			emoji = String(req.body.emoji || '💗').slice(0, 4)
			persona = String(req.body.persona || '').trim().slice(0, 300)
			address = String(req.body.address || '你').trim().slice(0, 10) || '你'
			presetId = null
			if (!name) return res.status(400).json({ error: '给 TA 起个名字吧' })
			if (!persona) return res.status(400).json({ error: '描述一下 TA 的性格吧' })
		}
		// 覆盖式创建：清掉旧的伙伴与聊天记录
		await query('DELETE FROM companion_messages WHERE user_id=$1', [req.user.id])
		await query('DELETE FROM companions WHERE user_id=$1', [req.user.id])
		await query('INSERT INTO companions (user_id, name, emoji, persona, address, preset_id) VALUES ($1,$2,$3,$4,$5,$6)',
			[req.user.id, name, emoji, persona, address, presetId])
		const c = await getCompanion(req.user.id)
		// 生成开场白
		let greeting = `嗨，我是${name}，以后我来陪你呀～`
		try {
			greeting = await conversation(buildSystem(c, 'chat', ''), [{ role: 'user', content: `（这是你和 ${req.user.nickname || req.user.username} 的第一次见面）用一句温暖自然的话跟 TA 打个招呼，做个自我介绍，别太长。` }], { maxTokens: 200 })
		} catch (e) { console.warn('[companion greeting]', e.message) }
		await query('INSERT INTO companion_messages (user_id, role, content, mode) VALUES ($1,$2,$3,$4)', [req.user.id, 'assistant', greeting, 'chat'])
		res.json({ companion: companionView(c), greeting })
	} catch (e) {
		console.error('[companion create]', e.message)
		res.status(500).json({ error: '创建失败' })
	}
})

app.post('/api/companion/chat', auth, async (req, res) => {
	try {
		const c = await getCompanion(req.user.id)
		if (!c) return res.status(400).json({ error: '还没有你的 AI 伙伴' })
		const text = String(req.body.message || '').trim().slice(0, 500)
		const mode = MODE_KEYS.includes(req.body.mode) ? req.body.mode : 'chat'
		if (!text) return res.status(400).json({ error: '说点什么吧' })
		await query('INSERT INTO companion_messages (user_id, role, content, mode) VALUES ($1,$2,$3,$4)', [req.user.id, 'user', text, mode])

		// 取最近历史构建上下文
		const hist = await query('SELECT role, content FROM companion_messages WHERE user_id=$1 ORDER BY id DESC LIMIT 16', [req.user.id])
		const messages = hist.rows.reverse().map(m => ({ role: m.role, content: m.content }))
		let reply
		try {
			reply = await conversation(buildSystem(c, mode, c.memory), messages, { maxTokens: 400 })
		} catch (e) {
			console.warn('[companion chat ai]', e.message)
			reply = '（信号好像有点弱…）我在的，你再跟我说一遍好不好？'
		}
		await query('INSERT INTO companion_messages (user_id, role, content, mode) VALUES ($1,$2,$3,$4)', [req.user.id, 'assistant', reply, mode])

		// 亲密度（每天上限 +12）
		const day = todayYMD()
		let affinity = c.affinity || 0
		let today = c.affinity_day === day ? (c.affinity_today || 0) : 0
		if (today < 12) { affinity += 1; today += 1 }
		await query('UPDATE companions SET affinity=$1, affinity_day=$2, affinity_today=$3 WHERE user_id=$4', [affinity, day, today, req.user.id])

		// 每 6 条用户消息，滚动更新记忆
		const cntRow = await query("SELECT COUNT(*)::int AS n FROM companion_messages WHERE user_id=$1 AND role='user'", [req.user.id])
		if (cntRow.rows[0].n % 6 === 0) {
			updateMemory(req.user.id, c).catch(e => console.warn('[memory]', e.message))
		}
		res.json({ reply, ...levelInfo(affinity) })
	} catch (e) {
		console.error('[companion chat]', e.message)
		res.status(500).json({ error: '出错了，稍后再试' })
	}
})

async function updateMemory(uid, c) {
	const hist = await query('SELECT role, content FROM companion_messages WHERE user_id=$1 ORDER BY id DESC LIMIT 24', [uid])
	const convo = hist.rows.reverse().map(m => (m.role === 'user' ? '用户' : c.name) + '：' + m.content).join('\n')
	const summary = await chat(
		'你在维护一份关于用户的长期记忆摘要，供 AI 恋爱伙伴记住用户。请把值得长期记住的信息（名字、喜好、经历、心事、重要的人和事、称呼习惯等）浓缩成简洁要点。',
		`已有记忆：${c.memory || '（暂无）'}\n\n最近对话：\n${convo}\n\n请输出更新后的记忆摘要（不超过200字，条目式或短句，只保留稳定有用的信息，不要复述寒暄）。`,
		{ maxTokens: 400 })
	await query('UPDATE companions SET memory=$1 WHERE user_id=$2', [summary.trim().slice(0, 1000), uid])
}

app.post('/api/companion/reset', auth, async (req, res) => {
	if (req.body.deleteAll) {
		await query('DELETE FROM companion_messages WHERE user_id=$1', [req.user.id])
		await query('DELETE FROM companions WHERE user_id=$1', [req.user.id])
		return res.json({ ok: true, deleted: true })
	}
	// 只清空聊天记录，保留人设与亲密度
	await query('DELETE FROM companion_messages WHERE user_id=$1', [req.user.id])
	res.json({ ok: true })
})

// ---------- 养幼崽 ----------
async function loadPet(coupleId) {
	const { rows } = await query('SELECT * FROM pets WHERE couple_id=$1', [coupleId])
	return rows[0] || null
}
// 结算时间衰减并落库，返回最新 pet 行
async function tickPet(pet) {
	const now = Date.now()
	const last = new Date(pet.last_tick).getTime()
	const decayed = applyDecay(pet, now, last)
	await query('UPDATE pets SET hunger=$1, mood=$2, clean=$3, energy=$4, last_tick=$5 WHERE couple_id=$6',
		[decayed.hunger, decayed.mood, decayed.clean, decayed.energy, new Date(now).toISOString(), pet.couple_id])
	return { ...pet, ...decayed }
}

app.get('/api/pet', auth, async (req, res) => {
	if (!req.user.couple_id) return res.status(400).json({ error: '绑定另一半后就能一起养幼崽啦' })
	let pet = await loadPet(req.user.couple_id)
	if (!pet) return res.json({ pet: null })
	pet = await tickPet(pet)
	res.json({ pet: petView(pet) })
})

app.post('/api/pet', auth, async (req, res) => {
	if (!req.user.couple_id) return res.status(400).json({ error: '绑定另一半后就能一起养幼崽啦' })
	const exist = await loadPet(req.user.couple_id)
	if (exist) return res.status(400).json({ error: '你们已经有一只幼崽啦' })
	const name = String(req.body.name || '').trim().slice(0, 12)
	if (!name) return res.status(400).json({ error: '给幼崽起个名字吧' })
	await query('INSERT INTO pets (couple_id, name) VALUES ($1,$2)', [req.user.couple_id, name])
	const pet = await loadPet(req.user.couple_id)
	res.json({ pet: petView(pet) })
})

app.post('/api/pet/action', auth, async (req, res) => {
	if (!req.user.couple_id) return res.status(400).json({ error: '未绑定' })
	let pet = await loadPet(req.user.couple_id)
	if (!pet) return res.status(400).json({ error: '还没有幼崽' })
	pet = await tickPet(pet)
	const action = req.body.action
	if (!ACTIONS[action]) return res.status(400).json({ error: '未知操作' })
	const r = applyAction({ hunger: pet.hunger, mood: pet.mood, clean: pet.clean, energy: pet.energy }, action)
	const beforeLevel = levelOf(pet.exp)
	const newExp = pet.exp + r.exp
	await query('UPDATE pets SET hunger=$1, mood=$2, clean=$3, energy=$4, exp=$5 WHERE couple_id=$6',
		[r.stats.hunger, r.stats.mood, r.stats.clean, r.stats.energy, newExp, req.user.couple_id])
	const afterLevel = levelOf(newExp)
	const leveledUp = afterLevel > beforeLevel
	await addCoins(req.user.couple_id, 2) // 照顾幼崽赚爱心币
	pet = await loadPet(req.user.couple_id)
	res.json({ pet: petView(pet), line: r.line, gainExp: r.exp, leveledUp, newStage: leveledUp ? stageOf(afterLevel) : null })
})

app.post('/api/pet/talk', auth, async (req, res) => {
	if (!req.user.couple_id) return res.status(400).json({ error: '未绑定' })
	let pet = await loadPet(req.user.couple_id)
	if (!pet) return res.status(400).json({ error: '还没有幼崽' })
	pet = await tickPet(pet)
	const v = petView(pet)
	const { me, ta } = await partnerNames(req.user)
	const state = `饱食${v.hunger} 心情${v.mood} 清洁${v.clean} 精力${v.energy}${v.needs.length ? '，现在' + v.needs.join('、') : ''}`
	let line = '（歪着小脑袋看着你）'
	try {
		line = await chat(
			`你是一只名叫「${pet.name}」的养成小幼崽，正处于「${v.stage.name}」阶段，主人是情侣「${me}」和「${ta}」。用奶声奶气、可爱软萌的第一人称说一两句话，可结合当前状态（饿了就撒娇要吃的、困了就喊困等）。只输出这句话本身。`,
			`你当前状态：${state}。跟主人说句话吧。`,
			{ maxTokens: 150 })
	} catch (e) { console.warn('[pet talk]', e.message) }
	res.json({ line, pet: v })
})

// ---------- 图片上传 ----------
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
app.post('/api/upload', auth, upload.single('file'), async (req, res) => {
	try {
		if (!req.file) return res.status(400).json({ error: '没有收到文件' })
		const url = await uploadImage(req.file.buffer, req.file.mimetype)
		res.json({ url })
	} catch (e) {
		console.error('[upload]', e.message)
		res.status(500).json({ error: '上传失败' })
	}
})

// ---------- 纪念本·相册 ----------
app.get('/api/memories', auth, async (req, res) => {
	if (!req.user.couple_id) return res.status(400).json({ error: '绑定另一半后一起记录回忆吧' })
	const { rows } = await query(
		"SELECT id, owner_id, title, body, photo_url, to_char(mem_date,'YYYY-MM-DD') AS mem_date FROM memories WHERE couple_id=$1 ORDER BY mem_date DESC, id DESC",
		[req.user.couple_id])
	res.json({ list: rows.map(r => ({ id: r.id, title: r.title, body: r.body, photoUrl: r.photo_url, memDate: r.mem_date, mine: r.owner_id === req.user.id })) })
})

app.post('/api/memories', auth, async (req, res) => {
	if (!req.user.couple_id) return res.status(400).json({ error: '绑定另一半后一起记录回忆吧' })
	const title = String(req.body.title || '').trim().slice(0, 40)
	const body = String(req.body.body || '').trim().slice(0, 1000)
	const photoUrl = String(req.body.photoUrl || '').trim().slice(0, 500)
	const date = String(req.body.memDate || '')
	if (!title) return res.status(400).json({ error: '写个标题吧' })
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: '选择日期' })
	await query('INSERT INTO memories (couple_id, owner_id, title, body, photo_url, mem_date) VALUES ($1,$2,$3,$4,$5,$6)',
		[req.user.couple_id, req.user.id, title, body, photoUrl || null, date])
	res.json({ ok: true })
})

app.delete('/api/memories/:id', auth, async (req, res) => {
	if (!req.user.couple_id) return res.status(400).json({ error: '未绑定' })
	const id = parseInt(req.params.id, 10)
	await query('DELETE FROM memories WHERE id=$1 AND couple_id=$2', [id, req.user.couple_id])
	res.json({ ok: true })
})

// ---------- 搭小屋 ----------
async function ensureHouse(coupleId) {
	let { rows } = await query('SELECT * FROM houses WHERE couple_id=$1', [coupleId])
	if (!rows.length) {
		await query('INSERT INTO houses (couple_id) VALUES ($1)', [coupleId])
		rows = (await query('SELECT * FROM houses WHERE couple_id=$1', [coupleId])).rows
	}
	return rows[0]
}
async function addCoins(coupleId, n) {
	if (!coupleId || n <= 0) return
	await ensureHouse(coupleId)
	await query('UPDATE houses SET coins = coins + $1 WHERE couple_id=$2', [n, coupleId])
}
function houseView(h) {
	let owned = []
	try { owned = JSON.parse(h.items || '[]') } catch (e) { owned = [] }
	return {
		theme: h.theme,
		coins: h.coins,
		owned,
		signedToday: h.last_sign === todayYMD(),
		themes: THEMES,
		shop: SHOP.map(i => ({ ...i, owned: owned.includes(i.id) }))
	}
}

app.get('/api/house', auth, async (req, res) => {
	if (!req.user.couple_id) return res.status(400).json({ error: '绑定另一半后一起搭小屋吧' })
	const h = await ensureHouse(req.user.couple_id)
	res.json(houseView(h))
})

app.post('/api/house/sign', auth, async (req, res) => {
	if (!req.user.couple_id) return res.status(400).json({ error: '未绑定' })
	const h = await ensureHouse(req.user.couple_id)
	const day = todayYMD()
	if (h.last_sign === day) return res.status(400).json({ error: '今天已经签到过啦' })
	await query('UPDATE houses SET coins = coins + 20, last_sign=$1 WHERE couple_id=$2', [day, req.user.couple_id])
	const nh = await ensureHouse(req.user.couple_id)
	res.json({ ...houseView(nh), reward: 20 })
})

app.post('/api/house/buy', auth, async (req, res) => {
	if (!req.user.couple_id) return res.status(400).json({ error: '未绑定' })
	const item = getItem(req.body.itemId)
	if (!item) return res.status(400).json({ error: '物品不存在' })
	const h = await ensureHouse(req.user.couple_id)
	let owned = []
	try { owned = JSON.parse(h.items || '[]') } catch (e) { owned = [] }
	if (owned.includes(item.id)) return res.status(400).json({ error: '已经拥有啦' })
	if (h.coins < item.price) return res.status(400).json({ error: '爱心币不够哦' })
	owned.push(item.id)
	await query('UPDATE houses SET coins = coins - $1, items=$2 WHERE couple_id=$3', [item.price, JSON.stringify(owned), req.user.couple_id])
	const nh = await ensureHouse(req.user.couple_id)
	res.json(houseView(nh))
})

app.post('/api/house/theme', auth, async (req, res) => {
	if (!req.user.couple_id) return res.status(400).json({ error: '未绑定' })
	const theme = String(req.body.theme || '')
	if (!THEMES.find(t => t.id === theme)) return res.status(400).json({ error: '主题不存在' })
	await ensureHouse(req.user.couple_id)
	await query('UPDATE houses SET theme=$1 WHERE couple_id=$2', [theme, req.user.couple_id])
	const nh = await ensureHouse(req.user.couple_id)
	res.json(houseView(nh))
})

// ---------- 静态前端 ----------
app.use(express.static(H5_DIR))
// SPA 兜底：非 /api 的 GET 回退到 index.html（静态资源已在上面命中，缺失的会自然 404）
app.get(/^\/(?!api\/).*/, (req, res, next) => {
	if (req.method !== 'GET') return next()
	res.sendFile(path.join(H5_DIR, 'index.html'), (err) => {
		if (err) res.status(404).send('frontend not built')
	})
})

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '0.0.0.0'
initDb()
	.then(() => {
		app.listen(PORT, HOST, () => console.log(`[server] listening on ${HOST}:${PORT}`))
	})
	.catch((e) => {
		console.error('[server] db init failed:', e)
		process.exit(1)
	})
