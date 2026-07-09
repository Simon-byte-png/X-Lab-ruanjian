// 数据层：有 DATABASE_URL 用 Postgres(预览/上线由平台注入)，否则本地用 PGlite 文件库自测。
// 两者都说 Postgres SQL，业务代码只调 query()，无需区分方言。
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let queryFn = null
export let driver = 'none'

export async function initDb() {
	const url = process.env.DATABASE_URL
	if (url) {
		const pg = await import('pg')
		const needSSL = /sslmode=require/i.test(url) || process.env.PGSSL === '1'
		const pool = new pg.default.Pool({
			connectionString: url,
			ssl: needSSL ? { rejectUnauthorized: false } : undefined
		})
		await pool.query('SELECT 1')
		queryFn = (text, params) => pool.query(text, params)
		driver = 'postgres'
	} else {
		const { PGlite } = await import('@electric-sql/pglite')
		const dataDir = process.env.PGLITE_DATA_DIR
			? path.resolve(process.env.PGLITE_DATA_DIR)
			: path.join(__dirname, 'data', 'pgdata')
		fs.mkdirSync(dataDir, { recursive: true })
		const db = new PGlite(dataDir)
		await db.waitReady
		queryFn = (text, params) => db.query(text, params)
		driver = 'pglite'
	}
	await migrate()
	console.log('[db] ready, driver =', driver)
}

export function query(text, params) {
	if (!queryFn) throw new Error('db not initialized')
	return queryFn(text, params)
}

async function migrate() {
	await query(`
		CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			nickname TEXT,
			couple_id INTEGER,
			created_at TIMESTAMPTZ DEFAULT now()
		)`)
	await query(`
		CREATE TABLE IF NOT EXISTS couples (
			id SERIAL PRIMARY KEY,
			user_a INTEGER NOT NULL,
			user_b INTEGER NOT NULL,
			anniversary DATE,
			created_at TIMESTAMPTZ DEFAULT now()
		)`)
	await query(`
		CREATE TABLE IF NOT EXISTS invites (
			code TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL,
			created_at TIMESTAMPTZ DEFAULT now()
		)`)
	await query(`
		CREATE TABLE IF NOT EXISTS countdowns (
			id SERIAL PRIMARY KEY,
			owner_id INTEGER NOT NULL,
			couple_id INTEGER,
			title TEXT NOT NULL,
			target_date DATE NOT NULL,
			shared BOOLEAN DEFAULT false,
			created_at TIMESTAMPTZ DEFAULT now()
		)`)
	// AI 算命结果缓存（每日运势按 user+day+kind 唯一）
	await query(`
		CREATE TABLE IF NOT EXISTS ai_fortunes (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL,
			kind TEXT NOT NULL,
			day TEXT NOT NULL,
			payload TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT now()
		)`)
	await query(`CREATE UNIQUE INDEX IF NOT EXISTS ai_fortunes_uk ON ai_fortunes (user_id, kind, day)`)
	// 匹配度测试：每人对某题库的作答（按 couple+quiz+user 唯一）
	await query(`
		CREATE TABLE IF NOT EXISTS quiz_answers (
			id SERIAL PRIMARY KEY,
			couple_id INTEGER NOT NULL,
			quiz_id TEXT NOT NULL,
			user_id INTEGER NOT NULL,
			answers TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT now()
		)`)
	await query(`CREATE UNIQUE INDEX IF NOT EXISTS quiz_answers_uk ON quiz_answers (couple_id, quiz_id, user_id)`)
	// 匹配度结果缓存（双方答完后生成一次，答案变化则失效）
	await query(`
		CREATE TABLE IF NOT EXISTS quiz_results (
			couple_id INTEGER NOT NULL,
			quiz_id TEXT NOT NULL,
			sig TEXT NOT NULL,
			payload TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT now(),
			PRIMARY KEY (couple_id, quiz_id)
		)`)
	// 每日任务：AI 为情侣按天生成，双方共享，可勾选完成
	await query(`
		CREATE TABLE IF NOT EXISTS daily_tasks (
			id SERIAL PRIMARY KEY,
			couple_id INTEGER NOT NULL,
			day TEXT NOT NULL,
			emoji TEXT,
			title TEXT NOT NULL,
			detail TEXT,
			done BOOLEAN DEFAULT false,
			done_at TIMESTAMPTZ,
			created_at TIMESTAMPTZ DEFAULT now()
		)`)
	await query(`CREATE INDEX IF NOT EXISTS daily_tasks_ck ON daily_tasks (couple_id, day)`)
	// AI 陪伴：每个用户一个可养成的 AI 伙伴
	await query(`
		CREATE TABLE IF NOT EXISTS companions (
			user_id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			emoji TEXT,
			persona TEXT NOT NULL,
			address TEXT DEFAULT '你',
			preset_id TEXT,
			affinity INTEGER DEFAULT 0,
			affinity_day TEXT,
			affinity_today INTEGER DEFAULT 0,
			memory TEXT DEFAULT '',
			created_at TIMESTAMPTZ DEFAULT now()
		)`)
	await query(`
		CREATE TABLE IF NOT EXISTS companion_messages (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL,
			role TEXT NOT NULL,
			content TEXT NOT NULL,
			mode TEXT,
			created_at TIMESTAMPTZ DEFAULT now()
		)`)
	await query(`CREATE INDEX IF NOT EXISTS companion_messages_uk ON companion_messages (user_id, id)`)
	// 养幼崽：情侣共养一只
	await query(`
		CREATE TABLE IF NOT EXISTS pets (
			couple_id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			exp INTEGER DEFAULT 0,
			hunger INTEGER DEFAULT 80,
			mood INTEGER DEFAULT 80,
			clean INTEGER DEFAULT 80,
			energy INTEGER DEFAULT 80,
			born_at TIMESTAMPTZ DEFAULT now(),
			last_tick TIMESTAMPTZ DEFAULT now()
		)`)
	// 纪念本·相册：情侣共享的回忆
	await query(`
		CREATE TABLE IF NOT EXISTS memories (
			id SERIAL PRIMARY KEY,
			couple_id INTEGER NOT NULL,
			owner_id INTEGER NOT NULL,
			title TEXT NOT NULL,
			body TEXT,
			photo_url TEXT,
			mem_date DATE NOT NULL,
			created_at TIMESTAMPTZ DEFAULT now()
		)`)
	await query(`CREATE INDEX IF NOT EXISTS memories_ck ON memories (couple_id, mem_date)`)
	// AI 算命·合盘：邀请制双方生辰合盘
	await query(`
		CREATE TABLE IF NOT EXISTS fortune_sessions (
			code TEXT PRIMARY KEY,
			creator_id INTEGER NOT NULL,
			creator_birth TEXT NOT NULL,
			partner_id INTEGER,
			partner_birth TEXT,
			match_type TEXT,
			result_json TEXT,
			created_at TIMESTAMPTZ DEFAULT now()
		)`)
	// 搭小屋：情侣共享的房间 + 爱心币经济
	await query(`
		CREATE TABLE IF NOT EXISTS houses (
			couple_id INTEGER PRIMARY KEY,
			theme TEXT DEFAULT 'warm',
			coins INTEGER DEFAULT 60,
			items TEXT DEFAULT '[]',
			last_sign TEXT,
			created_at TIMESTAMPTZ DEFAULT now()
		)`)
}
