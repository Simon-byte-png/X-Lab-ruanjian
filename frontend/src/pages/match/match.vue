<template>
	<view class="page">
		<view class="boot" v-if="booting"><text>加载中…</text></view>

		<!-- ============ 通过分享链接进入：加入者作答 ============ -->
		<template v-else-if="joinCode">
			<!-- 加入者答题 -->
			<view class="quiz" v-if="jStage === 'answer' && quizDef">
				<view class="q-head invite">
					<text class="q-title">{{ jInfo.creatorName }} 邀请你测默契</text>
					<text class="q-desc">你们答同一套题，看看想法一不一样～不需要是情侣也能测</text>
					<text class="q-progress">已选 {{ jAnsweredCount }}/{{ quizDef.questions.length }}</text>
				</view>
				<view class="q-item" v-for="(q, qi) in quizDef.questions" :key="qi">
					<text class="q-q">{{ qi + 1 }}. {{ q.q }}</text>
					<view v-for="(opt, oi) in q.options" :key="oi"
						:class="['opt', jAnswers[qi] === oi ? 'sel' : '']"
						@click="jAnswers[qi] = oi">
						<text class="opt-txt">{{ opt }}</text>
					</view>
				</view>
				<button class="prim submit" :loading="jSubmitting" @click="submitJoin">提交并看结果</button>
			</view>

			<!-- 加入者/发起人看结果 -->
			<view class="result" v-else-if="jStage === 'result' && jResult">
				<view class="score-ring">
					<text class="score-num">{{ jResult.score }}</text>
					<text class="score-label">默契值</text>
				</view>
				<text class="pair">{{ jResult.meName }} & {{ jResult.taName }}</text>
				<text class="matched">{{ jResult.total }} 题中有 {{ jResult.matched }} 题想法一致</text>
				<view class="block"><text class="b-text">{{ jResult.summary }}</text></view>
				<view class="hl" v-if="jResult.highlights && jResult.highlights.length">
					<view class="hl-item" v-for="(h, i) in jResult.highlights" :key="i">
						<text class="hl-dot">💗</text><text class="hl-txt">{{ h }}</text>
					</view>
				</view>
				<view class="advice" v-if="jResult.suggestion"><text class="adv-txt">💡 {{ jResult.suggestion }}</text></view>
				<button class="prim" @click="backToNormal">我也发起一个测测别人</button>
			</view>

			<!-- 发起人打开自己的链接：还没人答 -->
			<view class="notice" v-else-if="jStage === 'own'">
				<text class="n-emoji">📨</text>
				<text class="n-title">这是你发起的默契测试</text>
				<text class="n-sub">把链接发给想测的人，等 TA 答完就能看结果啦</text>
				<button class="prim" @click="backToNormal">返回</button>
			</view>

			<!-- 链接失效/已被别人答过 -->
			<view class="notice" v-else-if="jStage === 'used'">
				<text class="n-emoji">🙈</text>
				<text class="n-title">{{ jError || '这个链接不能用啦' }}</text>
				<text class="n-sub">让对方重新发一个，或者你来发起一个新的</text>
				<button class="prim" @click="backToNormal">我来发起</button>
			</view>

			<view class="loading" v-else><text>加载中…</text></view>
		</template>

		<!-- ============ 正常进入：模式切换 ============ -->
		<template v-else>
			<view class="tabs">
				<text :class="['tab', mode === 'share' ? 'on' : '']" @click="mode = 'share'">好友分享测</text>
				<text :class="['tab', mode === 'couple' ? 'on' : '']" @click="mode = 'couple'">情侣默契</text>
			</view>

			<!-- ---------- 好友分享模式（无需绑定） ---------- -->
			<view v-if="mode === 'share'">
				<!-- 介绍 + 开始答题 -->
				<view class="intro" v-if="sStage === 'intro'">
					<text class="intro-emoji">🔗</text>
					<text class="intro-title">发个链接，测测你俩多合拍</text>
					<text class="intro-sub">你先答这套题，生成一条专属链接，发给任何人（朋友、暧昧对象、对象都行）。TA 答完，就能看你们想法一不一样。</text>
					<button class="prim" @click="startShare">我先来答题</button>
				</view>

				<!-- 发起人答题 -->
				<view class="quiz" v-else-if="sStage === 'answer' && quizDef">
					<view class="q-head">
						<text class="q-title">{{ quizDef.title }}</text>
						<text class="q-desc">{{ quizDef.desc }}</text>
						<text class="q-progress">已选 {{ sAnsweredCount }}/{{ quizDef.questions.length }}</text>
					</view>
					<view class="q-item" v-for="(q, qi) in quizDef.questions" :key="qi">
						<text class="q-q">{{ qi + 1 }}. {{ q.q }}</text>
						<view v-for="(opt, oi) in q.options" :key="oi"
							:class="['opt', sAnswers[qi] === oi ? 'sel' : '']"
							@click="sAnswers[qi] = oi">
							<text class="opt-txt">{{ opt }}</text>
						</view>
					</view>
					<button class="prim submit" :loading="sSubmitting" @click="createShare">生成分享链接</button>
				</view>

				<!-- 链接已生成，等待对方作答 -->
				<view class="share-box" v-else-if="sStage === 'created'">
					<text class="sb-emoji">🎉</text>
					<text class="sb-title">链接生成好啦</text>
					<text class="sb-sub">把它发给想测默契的人，TA 答完你回来点「刷新看结果」</text>

					<view class="link-card" v-if="sLink">
						<text class="lc-label">分享链接</text>
						<text class="lc-link" selectable>{{ sLink }}</text>
						<button class="mini-btn" @click="copyLink">复制链接</button>
					</view>

					<view class="code-card">
						<text class="lc-label">或口头告诉 TA 邀请码</text>
						<text class="code-big">{{ sCode }}</text>
						<button class="mini-btn ghost2" @click="copyCode">复制邀请码</button>
					</view>

					<view class="waiting-hint">
						<text class="dot-anim">⏳</text><text>等待对方作答…</text>
					</view>
					<button class="prim" :loading="sPolling" @click="refreshShare">刷新看结果</button>
					<button class="ghost" @click="resetShare">重新出题</button>
				</view>

				<!-- 结果 -->
				<view class="result" v-else-if="sStage === 'result' && sResult">
					<view class="score-ring">
						<text class="score-num">{{ sResult.score }}</text>
						<text class="score-label">默契值</text>
					</view>
					<text class="pair">{{ sResult.meName }} & {{ sResult.taName }}</text>
					<text class="matched">{{ sResult.total }} 题中有 {{ sResult.matched }} 题想法一致</text>
					<view class="block"><text class="b-text">{{ sResult.summary }}</text></view>
					<view class="hl" v-if="sResult.highlights && sResult.highlights.length">
						<view class="hl-item" v-for="(h, i) in sResult.highlights" :key="i">
							<text class="hl-dot">💗</text><text class="hl-txt">{{ h }}</text>
						</view>
					</view>
					<view class="advice" v-if="sResult.suggestion"><text class="adv-txt">💡 {{ sResult.suggestion }}</text></view>
					<button class="ghost" @click="resetShare">再测一个别人</button>
				</view>
			</view>

			<!-- ---------- 情侣默契模式（需绑定，沿用原逻辑） ---------- -->
			<view v-else>
				<view class="notice" v-if="me.status && me.status !== 'couple'">
					<text class="n-emoji">💑</text>
					<text class="n-title">情侣双人测试需要先绑定另一半</text>
					<text class="n-sub">想和没绑定的人测？切到上面的「好友分享测」就行～</text>
					<button class="prim" @click="goMine">去绑定</button>
					<button class="ghost" @click="mode = 'share'">用好友分享测</button>
				</view>

				<template v-else-if="me.status === 'couple'">
					<view class="result" v-if="cStage === 'result' && cResult">
						<view class="score-ring">
							<text class="score-num">{{ cResult.score }}</text>
							<text class="score-label">默契值</text>
						</view>
						<text class="pair">{{ cResult.meName }} & {{ cResult.taName }}</text>
						<text class="matched">{{ cResult.total }} 题中有 {{ cResult.matched }} 题想法一致</text>
						<view class="block"><text class="b-text">{{ cResult.summary }}</text></view>
						<view class="hl" v-if="cResult.highlights && cResult.highlights.length">
							<view class="hl-item" v-for="(h, i) in cResult.highlights" :key="i">
								<text class="hl-dot">💗</text><text class="hl-txt">{{ h }}</text>
							</view>
						</view>
						<view class="advice"><text class="adv-txt">💡 {{ cResult.suggestion }}</text></view>
						<button class="ghost" @click="retakeCouple">重新测一次</button>
					</view>

					<view class="notice" v-else-if="cStage === 'waiting'">
						<text class="n-emoji">⏳</text>
						<text class="n-title">你已答完，等 TA 完成</text>
						<text class="n-sub">催 TA 打开「爱在浙大」也做一遍这套题吧</text>
						<button class="prim" :loading="cPolling" @click="checkCouple">刷新看看</button>
						<button class="ghost" @click="retakeCouple">重新作答</button>
					</view>

					<view class="quiz" v-else-if="cStage === 'answer' && quizDef">
						<view class="q-head">
							<text class="q-title">{{ quizDef.title }}</text>
							<text class="q-desc">{{ quizDef.desc }}</text>
							<text class="q-progress">已选 {{ cAnsweredCount }}/{{ quizDef.questions.length }}</text>
						</view>
						<view class="q-item" v-for="(q, qi) in quizDef.questions" :key="qi">
							<text class="q-q">{{ qi + 1 }}. {{ q.q }}</text>
							<view v-for="(opt, oi) in q.options" :key="oi"
								:class="['opt', cAnswers[qi] === oi ? 'sel' : '']"
								@click="cAnswers[qi] = oi">
								<text class="opt-txt">{{ opt }}</text>
							</view>
						</view>
						<button class="prim submit" :loading="cSubmitting" @click="submitCouple">提交我的答案</button>
					</view>

					<view class="loading" v-else><text>加载中…</text></view>
				</template>
			</view>
		</template>
	</view>
</template>

<script>
import { api, getToken } from '@/utils/request.js'

const QUIZ_ID = 'tacit'

function buildJoinLink(code) {
	// #ifdef H5
	const base = window.location.href.split('#')[0]
	return `${base}#/pages/match/match?join=${code}`
	// #endif
	// #ifndef H5
	return ''
	// #endif
}

export default {
	data() {
		return {
			booting: true,
			me: {},
			mode: 'share', // share | couple
			quizDef: null,
			// 情侣模式
			cAnswers: [],
			cStage: 'loading', // loading|answer|waiting|result
			cResult: null,
			cSubmitting: false,
			cPolling: false,
			// 分享模式（发起人）
			sAnswers: [],
			sStage: 'intro', // intro|answer|created|result
			sCode: '',
			sLink: '',
			sResult: null,
			sSubmitting: false,
			sPolling: false,
			// 加入模式（通过链接）
			joinCode: '',
			jInfo: { creatorName: '朋友' },
			jAnswers: [],
			jStage: 'loading', // loading|answer|result|own|used
			jResult: null,
			jSubmitting: false,
			jError: ''
		}
	},
	computed: {
		cAnsweredCount() { return this.cAnswers.filter(a => a !== null && a !== undefined).length },
		sAnsweredCount() { return this.sAnswers.filter(a => a !== null && a !== undefined).length },
		jAnsweredCount() { return this.jAnswers.filter(a => a !== null && a !== undefined).length }
	},
	onLoad(query) {
		if (query && query.join) {
			const code = String(query.join).trim().toUpperCase()
			this.joinCode = code
			// 未登录时先存住，登录后回到这里继续
			uni.setStorageSync('pendingJoin', { page: 'match', code })
		}
	},
	onShow() {
		if (!getToken()) {
			uni.reLaunch({ url: '/pages/login/login' })
			return
		}
		this.init()
	},
	methods: {
		async init() {
			this.booting = true
			try {
				const meRes = await api.me()
				this.me = meRes.user || {}
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			}
			try {
				if (this.joinCode) {
					uni.removeStorageSync('pendingJoin')
					await this.initJoin()
				} else {
					// 默认停在能用的模式：已绑定就默认情侣，否则好友分享
					this.mode = this.me.status === 'couple' ? 'couple' : 'share'
					await this.loadQuizDef()
					if (this.me.status === 'couple') await this.checkCouple(true)
				}
			} finally {
				this.booting = false
			}
		},
		async loadQuizDef() {
			if (this.quizDef) return
			this.quizDef = await api.quiz(QUIZ_ID)
		},

		// ---------- 加入者（链接进入） ----------
		async initJoin() {
			this.jStage = 'loading'
			try {
				const info = await api.quizShareGet(this.joinCode)
				this.jInfo = info
				if (info.ready && (info.isCreator || info.isPartner)) {
					this.jResult = info
					this.jStage = 'result'
				} else if (info.isCreator) {
					this.jStage = 'own'
				} else if (info.joined) {
					this.jError = '这个链接已经有人答过啦'
					this.jStage = 'used'
				} else {
					await this.loadQuizDef()
					this.jAnswers = new Array(this.quizDef.questions.length).fill(null)
					this.jStage = 'answer'
				}
			} catch (e) {
				this.jError = e.message || '链接无效或已过期'
				this.jStage = 'used'
			}
		},
		async submitJoin() {
			if (this.jAnsweredCount < this.quizDef.questions.length) {
				return uni.showToast({ title: '还有题没选哦', icon: 'none' })
			}
			this.jSubmitting = true
			try {
				const r = await api.quizShareAnswer(this.joinCode, { answers: this.jAnswers })
				this.jResult = r
				this.jStage = 'result'
			} catch (e) {
				this.jError = e.message
				this.jStage = 'used'
			} finally {
				this.jSubmitting = false
			}
		},
		backToNormal() {
			this.joinCode = ''
			this.jResult = null
			this.mode = this.me.status === 'couple' ? 'couple' : 'share'
			this.sStage = 'intro'
			this.loadQuizDef()
			if (this.me.status === 'couple') this.checkCouple(true)
		},

		// ---------- 分享模式（发起人） ----------
		async startShare() {
			await this.loadQuizDef()
			this.sAnswers = new Array(this.quizDef.questions.length).fill(null)
			this.sStage = 'answer'
		},
		async createShare() {
			if (this.sAnsweredCount < this.quizDef.questions.length) {
				return uni.showToast({ title: '还有题没选哦', icon: 'none' })
			}
			this.sSubmitting = true
			try {
				const r = await api.quizShareCreate(QUIZ_ID, { answers: this.sAnswers })
				this.sCode = r.code
				this.sLink = buildJoinLink(r.code)
				this.sStage = 'created'
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.sSubmitting = false
			}
		},
		async refreshShare() {
			this.sPolling = true
			try {
				const r = await api.quizShareGet(this.sCode)
				if (r.ready) {
					this.sResult = r
					this.sStage = 'result'
				} else {
					uni.showToast({ title: '对方还没答完，再等等～', icon: 'none' })
				}
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.sPolling = false
			}
		},
		copyLink() {
			if (!this.sLink) return uni.showToast({ title: '当前环境请用邀请码分享', icon: 'none' })
			uni.setClipboardData({ data: this.sLink, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) })
		},
		copyCode() {
			uni.setClipboardData({ data: this.sCode, success: () => uni.showToast({ title: '邀请码已复制', icon: 'none' }) })
		},
		resetShare() {
			this.sStage = 'intro'
			this.sCode = ''
			this.sLink = ''
			this.sResult = null
			this.sAnswers = []
		},

		// ---------- 情侣模式（原逻辑） ----------
		async checkCouple(silent) {
			if (!silent) this.cPolling = true
			try {
				const r = await api.quizResult(QUIZ_ID)
				if (r.ready) {
					this.cResult = r
					this.cStage = 'result'
				} else if (r.youDone) {
					this.cStage = 'waiting'
				} else {
					await this.loadQuizDef()
					this.cAnswers = new Array(this.quizDef.questions.length).fill(null)
					this.cStage = 'answer'
				}
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.cPolling = false
			}
		},
		async submitCouple() {
			if (this.cAnsweredCount < this.quizDef.questions.length) {
				return uni.showToast({ title: '还有题没选哦', icon: 'none' })
			}
			this.cSubmitting = true
			try {
				const r = await api.quizAnswer(QUIZ_ID, { answers: this.cAnswers })
				if (r.bothDone) {
					uni.showToast({ title: '生成结果中…' })
					await this.checkCouple(true)
				} else {
					this.cStage = 'waiting'
				}
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.cSubmitting = false
			}
		},
		async retakeCouple() {
			this.cResult = null
			await this.loadQuizDef()
			this.cAnswers = new Array(this.quizDef.questions.length).fill(null)
			this.cStage = 'answer'
		},
		goMine() { uni.reLaunch({ url: '/pages/mine/mine' }) }
	}
}
</script>

<style>
.page { min-height: 100vh; padding: 28rpx; }
.boot, .loading { display: flex; justify-content: center; padding-top: 200rpx; color: #999; font-size: 28rpx; }

.tabs { display: flex; background: #fff0f2; border-radius: 44rpx; padding: 8rpx; margin-bottom: 28rpx; }
.tab { flex: 1; text-align: center; padding: 18rpx 0; font-size: 28rpx; color: #c98a97; border-radius: 40rpx; }
.tab.on { background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff; font-weight: 700; }

.notice { display: flex; flex-direction: column; align-items: center; padding-top: 120rpx; }
.n-emoji { font-size: 96rpx; width: 190rpx; height: 190rpx; line-height: 190rpx; text-align: center; border-radius: 50%; background: linear-gradient(135deg, #fff0f2, #ffe0e6); box-shadow: 0 14rpx 44rpx rgba(242,76,104,0.13); }
.n-title { font-size: 32rpx; font-weight: 700; color: #333; margin-top: 24rpx; text-align: center; padding: 0 30rpx; }
.n-sub { font-size: 26rpx; color: #999; margin-top: 12rpx; text-align: center; padding: 0 40rpx; line-height: 1.6; }

.prim { margin-top: 36rpx; background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff; font-size: 30rpx; border-radius: 44rpx; border: none; padding: 0 80rpx; }
.prim::after { border: none; }
.ghost { margin-top: 24rpx; background: transparent; color: #ff6b81; font-size: 28rpx; border: 2rpx solid #ffb3c0; border-radius: 44rpx; padding: 0 60rpx; }
.ghost::after { border: none; }

/* 分享介绍 */
.intro { display: flex; flex-direction: column; align-items: center; padding: 90rpx 20rpx 0; }
.intro-emoji { font-size: 96rpx; }
.intro-title { font-size: 34rpx; font-weight: 800; color: #333; margin-top: 24rpx; }
.intro-sub { font-size: 27rpx; color: #888; margin-top: 16rpx; text-align: center; line-height: 1.7; padding: 0 20rpx; }

/* 答题 */
.q-head { background: linear-gradient(135deg, #ff8a9b, #f24c68); border-radius: 24rpx; padding: 36rpx; margin-bottom: 24rpx; }
.q-head.invite { background: linear-gradient(135deg, #b06ab3, #f24c68); }
.q-title { font-size: 36rpx; font-weight: 800; color: #fff; }
.q-desc { display: block; font-size: 26rpx; color: rgba(255,255,255,0.9); margin-top: 10rpx; line-height: 1.5; }
.q-progress { display: block; font-size: 24rpx; color: #fff; margin-top: 16rpx; }
.q-item { background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 20rpx; box-shadow: 0 6rpx 20rpx rgba(200,110,130,0.08); }
.q-q { font-size: 30rpx; color: #333; font-weight: 600; }
.opt { margin-top: 18rpx; background: #f7f7f9; border-radius: 16rpx; padding: 24rpx 28rpx; border: 3rpx solid transparent; }
.opt.sel { background: #fff0f2; border-color: #ff6b81; }
.opt-txt { font-size: 28rpx; color: #555; }
.opt.sel .opt-txt { color: #ff5470; font-weight: 600; }
.submit { display: block; width: 60%; margin: 20rpx auto 60rpx; }

/* 分享链接卡片 */
.share-box { display: flex; flex-direction: column; align-items: center; padding-top: 40rpx; }
.sb-emoji { font-size: 84rpx; }
.sb-title { font-size: 34rpx; font-weight: 800; color: #333; margin-top: 16rpx; }
.sb-sub { font-size: 26rpx; color: #999; margin-top: 12rpx; text-align: center; padding: 0 40rpx; line-height: 1.6; }
.link-card, .code-card { width: 100%; box-sizing: border-box; background: #fff; border-radius: 20rpx; padding: 28rpx; margin-top: 28rpx; box-shadow: 0 6rpx 20rpx rgba(200,110,130,0.08); display: flex; flex-direction: column; align-items: center; }
.lc-label { font-size: 24rpx; color: #999; align-self: flex-start; }
.lc-link { font-size: 24rpx; color: #ff5470; margin-top: 12rpx; word-break: break-all; line-height: 1.5; width: 100%; }
.code-big { font-size: 60rpx; font-weight: 800; color: #f24c68; letter-spacing: 12rpx; margin: 14rpx 0; }
.mini-btn { margin-top: 16rpx; background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff; font-size: 26rpx; border-radius: 40rpx; border: none; padding: 8rpx 48rpx; }
.mini-btn::after { border: none; }
.mini-btn.ghost2 { background: #fff0f2; color: #f24c68; }
.waiting-hint { display: flex; align-items: center; justify-content: center; gap: 12rpx; margin-top: 30rpx; color: #999; font-size: 26rpx; }
.dot-anim { font-size: 34rpx; }

/* 结果 */
.result { display: flex; flex-direction: column; align-items: center; padding-top: 20rpx; }
.score-ring { width: 220rpx; height: 220rpx; border-radius: 50%; background: radial-gradient(circle, #ffd0dc, #ff8fb0); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 10rpx 40rpx rgba(255,140,170,0.4); }
.score-num { font-size: 84rpx; font-weight: 800; color: #fff; line-height: 1; }
.score-label { font-size: 24rpx; color: #fff; margin-top: 6rpx; }
.pair { font-size: 34rpx; font-weight: 700; color: #333; margin-top: 28rpx; }
.matched { font-size: 26rpx; color: #999; margin-top: 10rpx; }
.block { background: #fff; border-radius: 24rpx; padding: 32rpx; width: 100%; box-sizing: border-box; margin-top: 28rpx; box-shadow: 0 6rpx 20rpx rgba(200,110,130,0.08); }
.b-text { font-size: 28rpx; color: #444; line-height: 1.8; }
.hl { width: 100%; margin-top: 20rpx; }
.hl-item { display: flex; align-items: flex-start; background: #fff; border-radius: 16rpx; padding: 24rpx 28rpx; margin-bottom: 14rpx; }
.hl-dot { font-size: 26rpx; margin-right: 14rpx; }
.hl-txt { flex: 1; font-size: 27rpx; color: #555; line-height: 1.5; }
.advice { background: #fff0f2; border-radius: 20rpx; padding: 26rpx 30rpx; margin-top: 20rpx; width: 100%; box-sizing: border-box; }
.adv-txt { font-size: 27rpx; color: #ff5470; line-height: 1.6; }
</style>
