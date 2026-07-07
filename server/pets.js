// 养幼崽核心逻辑：成长阶段、等级、随时间衰减、互动效果、反应文案

// 成长阶段（按等级）
const STAGES = [
	{ min: 1, name: '一颗蛋', emoji: '🥚', desc: '还在蛋里，好好照顾就会破壳哦' },
	{ min: 2, name: '破壳啦', emoji: '🐣', desc: '刚探出小脑袋，对世界充满好奇' },
	{ min: 4, name: '软萌幼崽', emoji: '🐤', desc: '走路还摇摇晃晃，超级黏人' },
	{ min: 7, name: '活泼小宝', emoji: '🐥', desc: '精力旺盛，最爱和你们玩' },
	{ min: 11, name: '机灵少年', emoji: '🐧', desc: '古灵精怪，开始有小主意了' },
	{ min: 16, name: '元气崽', emoji: '🦆', desc: '长大啦，是你们爱的结晶' }
]

const EXP_PER_LEVEL = 30

export function levelOf(exp) {
	return Math.floor((exp || 0) / EXP_PER_LEVEL) + 1
}
export function stageOf(level) {
	let s = STAGES[0]
	for (const st of STAGES) if (level >= st.min) s = st
	return s
}

// 互动效果：对四维的增减 + 成长值
export const ACTIONS = {
	feed: { name: '喂食', emoji: '🍼', exp: 3, d: { hunger: 25, mood: 3 },
		lines: ['呜姆…好好吃！', '还要还要~', '谢谢粑粑麻麻！', '这个我最爱惹！'] },
	play: { name: '陪玩', emoji: '🎮', exp: 5, d: { mood: 22, energy: -12, hunger: -5 },
		lines: ['嘿嘿好开心！', '再玩一会儿嘛~', '你们陪我玩最幸福啦', '转圈圈~转圈圈~'] },
	bath: { name: '洗澡', emoji: '🛁', exp: 3, d: { clean: 32, mood: 4 },
		lines: ['搓澡澡好舒服~', '我是香香崽啦！', '泡泡好好玩', '干干净净的最棒'] },
	sleep: { name: '哄睡', emoji: '😴', exp: 3, d: { energy: 30, mood: 5, hunger: -3 },
		lines: ['呼…睡个好觉', '晚安，做个甜甜的梦', 'zzz…', '被你们哄睡好安心'] },
	pet: { name: '摸摸', emoji: '💗', exp: 2, d: { mood: 10 },
		lines: ['蹭蹭~最喜欢你们了', '嘿嘿好痒', '再摸摸头嘛', '心里暖暖的'] },
	snack: { name: '喂零食', emoji: '🍭', exp: 2, d: { hunger: 12, mood: 14 },
		lines: ['甜甜的最幸福啦！', '偷吃零食嘿嘿', '再来一颗嘛~', '你们最宠我了'] },
	walk: { name: '散步', emoji: '🌳', exp: 4, d: { mood: 16, energy: -8, clean: -6 },
		lines: ['出去玩喽！', '外面的风好舒服呀', '牵着我的小手手~', '看到好多小花花！'] },
	study: { name: '教说话', emoji: '📖', exp: 6, d: { mood: 8, energy: -10 },
		lines: ['粑…粑粑！麻…麻麻！', '我学会新词啦！', '这个字怎么念呀？', '我是不是很聪明~'] },
	dress: { name: '打扮', emoji: '🎀', exp: 3, d: { mood: 18, clean: 6 },
		lines: ['我美不美呀！', '戴上蝴蝶结啦~', '今天要美美哒', '像小公主一样！'] },
	medicine: { name: '看医生', emoji: '💊', exp: 2, d: { mood: -4, energy: 18, clean: 8 },
		lines: ['呜…不怕不怕', '打针有点疼…', '有你们陪我就不怕', '很快就好起来啦'] }
}

// 随时间衰减（每小时下降速率）
const DECAY_PER_HOUR = { hunger: 6, mood: 4, clean: 3, energy: 5 }

function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))) }

// 根据距上次结算的分钟数，衰减四维
export function applyDecay(pet, nowMs, lastMs) {
	const mins = Math.max(0, (nowMs - lastMs) / 60000)
	const hours = mins / 60
	return {
		hunger: clamp(pet.hunger - DECAY_PER_HOUR.hunger * hours),
		mood: clamp(pet.mood - DECAY_PER_HOUR.mood * hours),
		clean: clamp(pet.clean - DECAY_PER_HOUR.clean * hours),
		energy: clamp(pet.energy - DECAY_PER_HOUR.energy * hours)
	}
}

export function applyAction(stats, action) {
	const a = ACTIONS[action]
	if (!a) return null
	const next = { ...stats }
	for (const k in a.d) next[k] = clamp((next[k] || 0) + a.d[k])
	const line = a.lines[Math.floor((stats.hunger + stats.mood + Date.now() / 1000) % a.lines.length)]
	return { stats: next, exp: a.exp, line }
}

// 综合状态描述
export function overallMood(stats) {
	const avg = (stats.hunger + stats.mood + stats.clean + stats.energy) / 4
	if (avg >= 75) return { face: '(๑>ᴗ<๑)', text: '状态超棒，元气满满！' }
	if (avg >= 50) return { face: '(・ω・)', text: '还不错，记得多陪陪我~' }
	if (avg >= 30) return { face: '(´-ω-`)', text: '有点无精打采了…' }
	return { face: '(╥﹏╥)', text: '好难受，快来照顾我呀！' }
}

export function needHint(stats) {
	const hints = []
	if (stats.hunger < 35) hints.push('肚子饿了')
	if (stats.mood < 35) hints.push('想你们陪玩')
	if (stats.clean < 35) hints.push('身上脏脏的')
	if (stats.energy < 35) hints.push('困困了')
	return hints
}

export function petView(pet) {
	const level = levelOf(pet.exp)
	const stage = stageOf(level)
	const stats = { hunger: pet.hunger, mood: pet.mood, clean: pet.clean, energy: pet.energy }
	return {
		name: pet.name,
		exp: pet.exp,
		level,
		stage: { name: stage.name, emoji: stage.emoji, desc: stage.desc },
		expInLevel: pet.exp % EXP_PER_LEVEL,
		expPerLevel: EXP_PER_LEVEL,
		...stats,
		...overallMood(stats),
		needs: needHint(stats),
		actions: Object.keys(ACTIONS).map(k => ({ key: k, name: ACTIONS[k].name, emoji: ACTIONS[k].emoji }))
	}
}
