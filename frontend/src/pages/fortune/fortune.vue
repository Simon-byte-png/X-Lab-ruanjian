<template>
	<view class="page">
		<!-- 加载遮罩 -->
		<view class="loading-mask" v-if="aiLoading">
			<view class="loading-card">
				<view class="loading-orb">🔮</view>
				<text class="loading-title">AI 正在推算中…</text>
				<text class="loading-sub">正在结合生辰八字排盘，请稍候</text>
			</view>
		</view>

		<view class="tabs">
			<text :class="['tab', tab === 'personal' ? 'on' : '']" @click="tab = 'personal'">个人命理</text>
			<text :class="['tab', tab === 'couple' ? 'on' : '']" @click="tab = 'couple'">合盘测算</text>
		</view>

		<!-- ========== Tab 1：个人命理 ========== -->
		<view v-if="tab === 'personal'">
			<!-- 输入表单 -->
			<view class="form-card" v-if="!personal">
				<text class="form-title">🔮 解锁你的恋爱密码</text>
				<text class="form-desc">请填写出生时间，越精确越准哦</text>

				<view class="field">
					<text class="field-label">出生日期</text>
					<picker mode="date" :value="pBirthDate" :end="todayStr" @change="onPDate" @click.native.stop>
						<view class="picker-box" :class="{ filled: pBirthDate }">
							{{ pBirthDate || '请选择出生日期' }}
						</view>
					</picker>
				</view>

				<view class="field">
					<text class="field-label">出生时间</text>
					<picker mode="time" :value="pBirthTime" @change="onPTime">
						<view class="picker-box" :class="{ filled: pBirthTime }">
							{{ pBirthTime || '请选择出生时间' }}
						</view>
					</picker>
				</view>

				<view class="field">
					<text class="field-label">性别</text>
					<picker mode="selector" :range="['男', '女']" :value="pGenderIndex" @change="onPGender">
						<view class="picker-box" :class="{ filled: pGender }">
							{{ pGender || '请选择性别' }}
						</view>
					</picker>
				</view>

				<!-- 已填信息回显 -->
				<view class="summary" v-if="pBirthDate || pBirthTime || pGender">
					<text class="summary-label">已填写</text>
					<text class="summary-text">📅{{ pBirthDate || '?' }} ⏰{{ pBirthTime || '?' }} 👤{{ pGender || '?' }}</text>
				</view>

				<button class="cast-btn" :loading="loadingPersonal" :disabled="loadingPersonal" @click="doPersonal">
					{{ loadingPersonal ? '计算中…' : '开始测算' }}
				</button>
			</view>

			<!-- 结果面板 -->
			<view v-else>
				<view class="score-ring">
					<text class="score-num">{{ personal.score }}</text>
					<text class="score-label">恋爱运势</text>
				</view>

				<view class="card">
					<text class="card-title">🌿 五行属性</text>
					<text class="card-highlight">{{ personal.fiveElements.dayMaster }}</text>
					<text class="card-text">{{ personal.fiveElements.distribution }}</text>
					<text class="card-text secondary">{{ personal.fiveElements.analysis }}</text>
				</view>

				<view class="card">
					<text class="card-title">🌸 桃花方位</text>
					<view class="row2">
						<view class="mini">
							<text class="mini-l">方位</text>
							<text class="mini-v">{{ personal.peachBlossom.direction }}</text>
						</view>
						<view class="mini">
							<text class="mini-l">时机</text>
							<text class="mini-v">{{ personal.peachBlossom.timing }}</text>
						</view>
					</view>
					<text class="card-text secondary" style="margin-top:16rpx;">{{ personal.peachBlossom.analysis }}</text>
				</view>

				<view class="card">
					<text class="card-title">💫 下一个桃花</text>
					<text class="card-text">{{ personal.nextRomance.description }}</text>
					<view class="tags">
						<text class="tag" v-for="t in personal.nextRomance.traits" :key="t">{{ t }}</text>
					</view>
					<view class="row2">
						<view class="mini">
							<text class="mini-l">可能出现</text>
							<text class="mini-v">{{ personal.nextRomance.where }}</text>
						</view>
						<view class="mini">
							<text class="mini-l">大概时间</text>
							<text class="mini-v">{{ personal.nextRomance.when }}</text>
						</view>
					</view>
				</view>

				<view class="card">
					<text class="card-title">💍 正缘画像</text>
					<text class="card-text">{{ personal.trueLove.description }}</text>
					<view class="tags">
						<text class="tag" v-for="t in personal.trueLove.traits" :key="t">{{ t }}</text>
					</view>
					<text class="card-text secondary" style="margin-top:12rpx;">💡 {{ personal.trueLove.howToMeet }}</text>
				</view>

				<view class="advice">
					<text class="adv-text">✨ {{ personal.advice }}</text>
				</view>

				<button class="retry-btn" @click="personal = null">重新测算</button>
			</view>
		</view>

		<!-- ========== Tab 2：合盘测算 ========== -->
		<view v-if="tab === 'couple'">
			<!-- 状态：发起合盘 -->
			<view class="form-card" v-if="!cpCode && !cpJoining && !cpResult">
				<text class="form-title">💑 发起合盘</text>
				<text class="form-desc">先填你的生辰，生成邀请码发给对方</text>

				<view class="field">
					<text class="field-label">你的出生日期</text>
					<picker mode="date" :value="cBirthDate" :end="todayStr" @change="onCDate">
						<view class="picker-box" :class="{ filled: cBirthDate }">{{ cBirthDate || '请选择出生日期' }}</view>
					</picker>
				</view>
				<view class="field">
					<text class="field-label">你的出生时间</text>
					<picker mode="time" :value="cBirthTime" @change="onCTime">
						<view class="picker-box" :class="{ filled: cBirthTime }">{{ cBirthTime || '请选择出生时间' }}</view>
					</picker>
				</view>
				<view class="field">
					<text class="field-label">你的性别</text>
					<picker mode="selector" :range="['男', '女']" :value="cGenderIndex" @change="onCGender">
						<view class="picker-box" :class="{ filled: cGender }">{{ cGender || '请选择性别' }}</view>
					</picker>
				</view>

				<view class="summary" v-if="cBirthDate || cBirthTime || cGender">
					<text class="summary-label">已填写</text>
					<text class="summary-text">📅{{ cBirthDate || '?' }} ⏰{{ cBirthTime || '?' }} 👤{{ cGender || '?' }}</text>
				</view>

				<button class="cast-btn" :loading="loadingInvite" :disabled="loadingInvite" @click="doInvite">
					{{ loadingInvite ? '生成中…' : '生成邀请码' }}
				</button>

				<view class="divider">
					<text class="divider-text">—— 或 ——</text>
				</view>

				<text class="form-title" style="font-size:28rpx;">📨 加入合盘</text>
				<view class="field">
					<text class="field-label">输入邀请码</text>
					<input class="code-input" v-model="joinCode" placeholder="请输入6位邀请码"
						placeholder-class="ph" maxlength="6" @input="joinCode = joinCode.toUpperCase()" />
				</view>
				<button class="cast-btn outline" @click="doJoinCode">
					下一步
				</button>
			</view>

			<!-- 状态：等待对方加入 -->
			<view class="form-card" v-if="cpCode && !cpJoining && !cpResult">
				<text class="form-title">📋 你的邀请码</text>
				<text class="code-display">{{ cpCode }}</text>
				<text class="form-desc">把邀请码或链接发给对方，TA 打开填生辰就能看合盘结果</text>

				<view class="invite-link" v-if="inviteLink">
					<text class="il-label">合盘邀请链接</text>
					<text class="il-text" selectable>{{ inviteLink }}</text>
				</view>
				<button class="cast-btn" @click="copyInviteLink">{{ inviteLink ? '复制邀请链接' : '复制邀请码' }}</button>

				<view class="waiting-hint">
					<text class="dot-anim">⏳</text>
					<text>等待对方加入...</text>
				</view>
				<button class="retry-btn" :loading="loadingSession" @click="checkSession">刷新查看结果</button>
				<button class="retry-btn" style="margin-top:12rpx; background:none; color:rgba(255,255,255,0.7);" @click="cpCode = ''; cBirthDate = ''; cBirthTime = ''; cGender = ''">
					取消邀请
				</button>
			</view>

			<!-- 状态：输入邀请码后填写信息 -->
			<view class="form-card" v-if="cpJoining && !cpResult">
				<text class="form-title">📝 填写你的生辰</text>
				<text class="form-desc">邀请码：{{ joinCode }}</text>

				<view class="field">
					<text class="field-label">出生日期</text>
					<picker mode="date" :value="cBirthDate" :end="todayStr" @change="onCDate">
						<view class="picker-box" :class="{ filled: cBirthDate }">{{ cBirthDate || '请选择出生日期' }}</view>
					</picker>
				</view>
				<view class="field">
					<text class="field-label">出生时间</text>
					<picker mode="time" :value="cBirthTime" @change="onCTime">
						<view class="picker-box" :class="{ filled: cBirthTime }">{{ cBirthTime || '请选择出生时间' }}</view>
					</picker>
				</view>
				<view class="field">
					<text class="field-label">性别</text>
					<picker mode="selector" :range="['男', '女']" :value="cGenderIndex" @change="onCGender">
						<view class="picker-box" :class="{ filled: cGender }">{{ cGender || '请选择性别' }}</view>
					</picker>
				</view>
				<view class="field">
					<text class="field-label">测算类型</text>
					<view class="type-toggle">
						<text :class="['type-opt', cpType === 'love' ? 'on' : '']" @click="cpType = 'love'">💗 恋爱匹配</text>
						<text :class="['type-opt', cpType === 'friend' ? 'on' : '']" @click="cpType = 'friend'">🤝 友谊匹配</text>
					</view>
				</view>

				<button class="cast-btn" :loading="loadingAccept" :disabled="loadingAccept" @click="doAccept">
					{{ loadingAccept ? '计算中…' : '查看合盘结果' }}
				</button>
			</view>

			<!-- 状态：合盘结果 -->
			<view v-if="cpResult">
				<text class="type-badge">{{ cpResult.matchType === 'friend' ? '🤝 友谊合盘' : '💗 恋爱合盘' }}</text>

				<view class="score-ring pink">
					<text class="score-num">{{ cpResult.score }}</text>
					<text class="score-label">合盘指数</text>
				</view>

				<view class="card">
					<text class="card-title">🌿 五行匹配</text>
					<text class="card-text">{{ cpResult.fiveElementsMatch }}</text>
				</view>

				<view class="card">
					<text class="card-title">🎭 性格分析</text>
					<text class="card-text">{{ cpResult.personalities }}</text>
				</view>

				<view class="card">
					<text class="card-title">✨ {{ cpResult.matchType === 'friend' ? '契合点' : '互补默契' }}</text>
					<view class="tags">
						<text class="tag" v-for="s in cpResult.strengths" :key="s">{{ s }}</text>
					</view>
				</view>

				<view class="card" v-if="cpResult.challenges && cpResult.challenges.length">
					<text class="card-title">⚡ 需要注意</text>
					<view class="tags">
						<text class="tag warn" v-for="c in cpResult.challenges" :key="c">{{ c }}</text>
					</view>
				</view>

				<view class="card">
					<text class="card-title">🔮 发展预测</text>
					<text class="card-text">{{ cpResult.prediction }}</text>
				</view>

				<view class="advice">
					<text class="adv-text">💡 {{ cpResult.advice }}</text>
				</view>

				<button class="retry-btn" @click="resetCouple">重新合盘</button>
			</view>
		</view>
	</view>
</template>

<script>
import { api, getToken } from '@/utils/request.js'

function parseBirth(dateStr, timeStr, gender) {
	if (!dateStr || !timeStr || !gender) return null
	const [y, m, d] = dateStr.split('-').map(Number)
	const [h, min] = timeStr.split(':').map(Number)
	const g = gender === '男' ? 'male' : gender === '女' ? 'female' : undefined
	return { year: y, month: m, day: d, hour: h, minute: min, gender: g }
}

// Mock 数据：AI 不可用时展示固定示例结果
const MOCK_PERSONAL = {
	score: 78,
	fiveElements: {
		dayMaster: '甲木',
		distribution: '木旺、火相、土休、金囚、水死',
		analysis: '日主甲木生于春月得令，性格积极向上，心地善良，感情中主动热情，但有时过于理想化，需脚踏实地。'
	},
	peachBlossom: {
		direction: '东南方',
		timing: '每年春季、兔年（卯年）',
		analysis: '桃花星入命宫，异性缘佳，但需分辨正缘与烂桃花。春季桃花最旺，多参加户外活动可提升运势。'
	},
	nextRomance: {
		description: '身材修长、气质清秀的文艺型对象，喜欢阅读和旅行，说话温声细语，眼神清澈有灵气。',
		where: '图书馆、书展、文化沙龙或校园东区',
		when: '2026年春季或4月前后',
		traits: ['文艺气质', '温柔细腻', '学识渊博', '热爱自然']
	},
	trueLove: {
		description: '正缘为水木属性之人，性格温柔而有主见，事业稳定，与你志趣相投，能互相成就。',
		where: '学术交流场合、文化活动或通过朋友介绍',
		traits: ['成熟稳重', '志趣相投', '包容体贴', '有上进心'],
		howToMeet: '多参与学术和文化活动，扩大社交圈，缘分自然会出现。'
	},
	advice: '保持真实自我，不要为了迎合他人而改变本心。今年春天是桃花旺季，多出门走走会有惊喜。'
}

function waitMs(ms) {
	return new Promise(r => setTimeout(r, ms))
}

function buildFortuneLink(code) {
	// #ifdef H5
	const base = window.location.href.split('#')[0]
	return `${base}#/pages/fortune/fortune?join=${code}`
	// #endif
	// #ifndef H5
	return ''
	// #endif
}

export default {
	data() {
		const now = new Date()
		const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
		return {
			tab: 'personal',
			todayStr: today,
			// 个人命理
			pBirthDate: '', pBirthTime: '', pGender: '', pGenderIndex: 0,
			personal: null, loadingPersonal: false,
			// 合盘 - 发起
			cBirthDate: '', cBirthTime: '', cGender: '', cGenderIndex: 0,
			cpCode: '', loadingInvite: false,
			// 合盘 - 加入
			joinCode: '', cpJoining: false, cpType: 'love', loadingAccept: false,
			// 合盘 - 结果
			cpResult: null,
			loadingSession: false,
			// 通过链接进入的待处理邀请码
			pendingJoinFromLink: false
		}
	},
	computed: {
		aiLoading() {
			return this.loadingPersonal || this.loadingAccept
		},
		inviteLink() {
			return this.cpCode ? buildFortuneLink(this.cpCode) : ''
		}
	},
	onLoad(query) {
		if (query && query.join) {
			const code = String(query.join).trim().toUpperCase()
			this.tab = 'couple'
			this.joinCode = code
			this.pendingJoinFromLink = true
			uni.setStorageSync('pendingJoin', { page: 'fortune', code })
		}
	},
	onShow() {
		if (!getToken()) {
			uni.reLaunch({ url: '/pages/login/login' })
			return
		}
		// 通过分享链接进入：直接跳到「填写生辰加入合盘」
		if (this.pendingJoinFromLink && this.joinCode) {
			this.pendingJoinFromLink = false
			uni.removeStorageSync('pendingJoin')
			this.tab = 'couple'
			this.cpJoining = true
		}
	},
	methods: {
		// ---- 个人命理 ----
		onPDate(e) { this.pBirthDate = e.detail.value },
		onPTime(e) { this.pBirthTime = e.detail.value },
		onPGender(e) {
			const idx = e.detail.value
			this.pGenderIndex = idx
			this.pGender = ['男', '女'][idx]
		},
		async doPersonal() {
			const birth = parseBirth(this.pBirthDate, this.pBirthTime, this.pGender)
			if (!birth) return uni.showToast({ title: '请完整填写出生日期、时间和性别', icon: 'none' })
			this.loadingPersonal = true
			try {
				// 先尝试真实 AI，失败则等 2 秒后返回 mock
				const result = await Promise.race([
					api.fortunePersonal({ birth }),
					waitMs(8000).then(() => { throw new Error('timeout') })
				])
				this.personal = result
			} catch (e) {
				console.warn('[fortune] AI fallback to mock:', e.message)
				// 固定展示 mock 数据，至少等 2 秒让用户看到加载动画
				await waitMs(2000)
				this.personal = { ...MOCK_PERSONAL }
			} finally {
				this.loadingPersonal = false
			}
		},

		// ---- 合盘：发起 ----
		onCDate(e) { this.cBirthDate = e.detail.value },
		onCTime(e) { this.cBirthTime = e.detail.value },
		onCGender(e) {
			const idx = e.detail.value
			this.cGenderIndex = idx
			this.cGender = ['男', '女'][idx]
		},
		async doInvite() {
			const birth = parseBirth(this.cBirthDate, this.cBirthTime, this.cGender)
			if (!birth) return uni.showToast({ title: '请完整填写出生日期、时间和性别', icon: 'none' })
			this.loadingInvite = true
			try {
				const res = await api.fortuneInvite({ birth })
				this.cpCode = res.code
			} catch (e) {
				// 邀请码也兜底：本地生成一个
				const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
				let code = ''
				for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
				this.cpCode = code
				uni.showToast({ title: '已生成本地邀请码', icon: 'none' })
			} finally {
				this.loadingInvite = false
			}
		},

		// ---- 合盘：复制邀请链接/邀请码 ----
		copyInviteLink() {
			const data = this.inviteLink || this.cpCode
			if (!data) return
			uni.setClipboardData({
				data,
				success: () => uni.showToast({ title: this.inviteLink ? '邀请链接已复制' : '邀请码已复制', icon: 'none' })
			})
		},

		// ---- 合盘：输入邀请码 ----
		doJoinCode() {
			const code = this.joinCode.trim().toUpperCase()
			if (!code || code.length !== 6) return uni.showToast({ title: '请输入6位邀请码', icon: 'none' })
			this.cpJoining = true
		},

		// ---- 合盘：接受邀请 / 查看结果 ----
		async doAccept() {
			const birth = parseBirth(this.cBirthDate, this.cBirthTime, this.cGender)
			if (!birth) return uni.showToast({ title: '请完整填写出生日期、时间和性别', icon: 'none' })
			this.loadingAccept = true
			try {
				const res = await Promise.race([
					api.fortuneAccept({
						code: this.joinCode.trim().toUpperCase(),
						birth,
						matchType: this.cpType
					}),
					waitMs(8000).then(() => { throw new Error('timeout') })
				])
				this.cpResult = res
				this.cpJoining = false
			} catch (e) {
				console.warn('[fortune] couple fallback to mock:', e.message)
				await waitMs(2000)
				const isLove = this.cpType === 'love'
				this.cpResult = {
					matchType: this.cpType,
					score: isLove ? 85 : 82,
					fiveElementsMatch: isLove
						? '木火相生，彼此滋养。甲木遇丙火，如同春日暖阳照拂新芽，生机勃勃、相互成就。'
						: '五行互补，木土相安。性格上各有侧重却恰好互补，相处自然不费力。',
					personalities: isLove
						? '你们性格互补，一个外放热情一个内敛细腻，在一起既有激情又有安全感，是令人羡慕的一对。'
						: '一个理性规划一个随性自在，彼此欣赏对方的不同，友谊在互补中愈发深厚。',
					strengths: isLove
						? ['情绪互补，你热他稳', '价值观高度一致', '沟通顺畅少有误会']
						: ['兴趣广泛总有话聊', '彼此尊重各自空间', '关键时刻靠得住'],
					challenges: isLove
						? ['意见不合时都偏固执', '对未来的规划节奏不同']
						: ['偶尔因小事较真', '一方太忙时联络变少'],
					prediction: isLove
						? '你们的关系有长期发展的潜力，关键是在分歧时学会换位思考。今年秋冬是关系升温的关键期。'
						: '友谊会随着时间沉淀越发珍贵，彼此成长路上不可或缺的伙伴，未来合作做事也会很合拍。',
					advice: isLove
						? '多创造共同回忆，一起旅行或完成一个小目标，会让你们的关系更牢固。'
						: '保持真诚和坦率，友情需要经营，定期见面聊聊近况很重要。'
				}
				this.cpJoining = false
			} finally {
				this.loadingAccept = false
			}
		},

		// ---- 合盘：查看结果 ----
		async checkSession() {
			if (!this.cpCode) return
			this.loadingSession = true
			try {
				const res = await api.fortuneSession(this.cpCode)
				if (res.ready) {
					this.cpResult = res
				} else if (res.partnerJoined) {
					uni.showToast({ title: '对方已加入，结果生成中...', icon: 'none' })
				} else {
					uni.showToast({ title: '对方还没加入，再等等～', icon: 'none' })
				}
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.loadingSession = false
			}
		},

		// ---- 重置 ----
		resetCouple() {
			this.cpCode = ''
			this.cpJoining = false
			this.cpResult = null
			this.loadingSession = false
			this.joinCode = ''
			this.cBirthDate = ''
			this.cBirthTime = ''
			this.cGender = ''
			this.cGenderIndex = 0
			this.cpType = 'love'
		}
	}
}
</script>

<style>
.page { min-height: 100vh; background: linear-gradient(180deg, #2b1b4d 0%, #4a2b6b 40%, #7a3d7a 100%); padding: 32rpx 28rpx 80rpx; }

/* 计算中遮罩 */
.loading-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 999; background: rgba(20, 10, 40, 0.72); display: flex; align-items: center; justify-content: center; }
.loading-card { width: 78%; max-width: 560rpx; background: rgba(255,255,255,0.96); border-radius: 28rpx; padding: 56rpx 40rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.35); }
.loading-orb { font-size: 96rpx; animation: orb-pulse 1.4s ease-in-out infinite; }
.loading-title { margin-top: 28rpx; font-size: 32rpx; font-weight: 700; color: #7a3d7a; }
.loading-sub { margin-top: 14rpx; font-size: 24rpx; color: #999; text-align: center; line-height: 1.6; }
@keyframes orb-pulse {
	0% { transform: scale(0.86) rotate(-6deg); opacity: 0.7; }
	50% { transform: scale(1.12) rotate(6deg); opacity: 1; }
	100% { transform: scale(0.86) rotate(-6deg); opacity: 0.7; }
}

/* 已填信息回显 */
.summary { background: #faf3ff; border: 1px solid #ecd9f7; border-radius: 16rpx; padding: 20rpx 24rpx; margin-top: 8rpx; margin-bottom: 8rpx; }
.summary-label { display: block; font-size: 22rpx; color: #a97fc0; margin-bottom: 8rpx; }
.summary-text { display: block; font-size: 26rpx; color: #5a2a6a; font-weight: 600; }
.tabs { display: flex; background: rgba(255,255,255,0.12); border-radius: 44rpx; padding: 8rpx; margin-bottom: 40rpx; }
.tab { flex: 1; text-align: center; padding: 18rpx 0; font-size: 28rpx; color: rgba(255,255,255,0.7); border-radius: 40rpx; }
.tab.on { background: #fff; color: #7a3d7a; font-weight: 700; }

/* 表单 */
.form-card { background: rgba(255,255,255,0.95); border-radius: 24rpx; padding: 40rpx 32rpx; display: flex; flex-direction: column; }
.form-title { font-size: 34rpx; font-weight: 700; color: #7a3d7a; text-align: center; margin-bottom: 8rpx; }
.form-desc { font-size: 24rpx; color: #999; text-align: center; margin-bottom: 32rpx; }
.field { margin-bottom: 24rpx; }
.field-label { font-size: 26rpx; color: #666; margin-bottom: 10rpx; display: block; }
.picker-box { background: #f5f0f8; border-radius: 16rpx; padding: 22rpx 28rpx; font-size: 28rpx; color: #bbb; }
.picker-box.filled { color: #5a2a6a; font-weight: 600; background: #f0e6f8; border: 1px solid #d9bdee; }
.cast-btn { background: linear-gradient(90deg, #ffd36b, #ff9a76); color: #5a2a00; font-size: 30rpx; font-weight: 700; border-radius: 44rpx; border: none; padding: 0 80rpx; margin-top: 20rpx; }
.cast-btn::after { border: none; }
.cast-btn.outline { background: linear-gradient(90deg, #e0c3fc, #c2a0f5); color: #4a2060; }
.retry-btn { background: rgba(255,255,255,0.15); color: #fff; font-size: 26rpx; border-radius: 44rpx; border: 1px solid rgba(255,255,255,0.3); margin-top: 28rpx; padding: 16rpx 0; text-align: center; }
.retry-btn::after { border: none; }

/* 邀请码 */
.code-display { font-size: 72rpx; font-weight: 800; color: #7a3d7a; text-align: center; letter-spacing: 16rpx; margin: 24rpx 0; }
.code-input { width: 100%; height: 88rpx; background: #f5f0f8; border-radius: 16rpx; padding: 0 28rpx; font-size: 32rpx; box-sizing: border-box; text-align: center; letter-spacing: 8rpx; text-transform: uppercase; }
.invite-link { width: 100%; box-sizing: border-box; background: #f5f0f8; border-radius: 16rpx; padding: 20rpx 24rpx; margin-top: 8rpx; }
.il-label { display: block; font-size: 22rpx; color: #a97fc0; margin-bottom: 8rpx; }
.il-text { display: block; font-size: 22rpx; color: #7a3d7a; word-break: break-all; line-height: 1.5; }
.waiting-hint { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-top: 24rpx; color: #999; font-size: 26rpx; }
.dot-anim { font-size: 36rpx; }
.divider { display: flex; align-items: center; justify-content: center; margin: 36rpx 0 28rpx; }
.divider-text { color: #ccc; font-size: 24rpx; }

/* 合盘类型切换 */
.type-toggle { display: flex; gap: 16rpx; }
.type-opt { flex: 1; text-align: center; padding: 22rpx 0; border-radius: 16rpx; background: #f5f0f8; font-size: 26rpx; color: #888; }
.type-opt.on { background: linear-gradient(90deg, #ffd36b, #ff9a76); color: #5a2a00; font-weight: 700; }
.type-badge { display: block; text-align: center; font-size: 28rpx; color: rgba(255,255,255,0.9); margin-bottom: 16rpx; }

/* 结果 */
.score-ring { width: 220rpx; height: 220rpx; border-radius: 50%; background: radial-gradient(circle, #ffe9a8, #ffb86b); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 0 60rpx rgba(255,200,100,0.5); margin: 20rpx auto 32rpx; }
.score-ring.pink { background: radial-gradient(circle, #ffd0dc, #ff8fb0); box-shadow: 0 0 60rpx rgba(255,140,170,0.5); }
.score-num { font-size: 84rpx; font-weight: 800; color: #7a3d1a; line-height: 1; }
.score-label { font-size: 24rpx; color: #a05a2a; margin-top: 6rpx; }

.card { background: rgba(255,255,255,0.95); border-radius: 24rpx; padding: 32rpx; margin-top: 20rpx; }
.card-title { font-size: 28rpx; font-weight: 700; color: #7a3d7a; display: block; margin-bottom: 12rpx; }
.card-highlight { font-size: 36rpx; font-weight: 700; color: #e8782a; display: block; margin-bottom: 8rpx; }
.card-text { font-size: 28rpx; color: #444; line-height: 1.7; display: block; }
.card-text.secondary { color: #888; font-size: 26rpx; }

.row2 { display: flex; margin-top: 16rpx; }
.mini { flex: 1; background: #faf5ff; border-radius: 16rpx; padding: 20rpx; margin: 0 8rpx; display: flex; flex-direction: column; align-items: center; }
.mini-l { font-size: 22rpx; color: #999; }
.mini-v { font-size: 26rpx; color: #7a3d7a; font-weight: 600; margin-top: 8rpx; text-align: center; }

.tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.tag { background: #f0e6f6; color: #7a3d7a; font-size: 24rpx; padding: 8rpx 20rpx; border-radius: 20rpx; }
.tag.warn { background: #fff3e0; color: #e8782a; }

.advice { background: rgba(255,255,255,0.15); border-radius: 20rpx; padding: 24rpx 28rpx; margin-top: 24rpx; }
.adv-text { color: #fff; font-size: 26rpx; line-height: 1.6; }
</style>
