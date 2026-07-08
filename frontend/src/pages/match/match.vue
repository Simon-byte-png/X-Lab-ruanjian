<template>
	<view class="page">
		<!-- 未绑定 -->
		<view class="notice" v-if="me.status && me.status !== 'couple'">
			<text class="n-emoji">💑</text>
			<text class="n-title">双人测试需要先绑定另一半</text>
			<text class="n-sub">去「我的」和 TA 组成情侣，再一起来测默契</text>
			<button class="prim" @click="goMine">去绑定</button>
		</view>

		<template v-else-if="me.status === 'couple'">
			<!-- 结果 -->
			<view class="result" v-if="stage === 'result' && result">
				<view class="score-ring">
					<text class="score-num">{{ result.score }}</text>
					<text class="score-label">默契值</text>
				</view>
				<text class="pair">{{ result.meName }} & {{ result.taName }}</text>
				<text class="matched">{{ result.total }} 题中有 {{ result.matched }} 题想法一致</text>
				<view class="block">
					<text class="b-text">{{ result.summary }}</text>
				</view>
				<view class="hl" v-if="result.highlights && result.highlights.length">
					<view class="hl-item" v-for="(h, i) in result.highlights" :key="i">
						<text class="hl-dot">💗</text><text class="hl-txt">{{ h }}</text>
					</view>
				</view>
				<view class="advice"><text class="adv-txt">💡 {{ result.suggestion }}</text></view>
				<button class="ghost" @click="retake">重新测一次</button>
			</view>

			<!-- 等待对方 -->
			<view class="notice" v-else-if="stage === 'waiting'">
				<text class="n-emoji">⏳</text>
				<text class="n-title">你已答完，等 TA 完成</text>
				<text class="n-sub">催 TA 打开「爱在浙大」也做一遍这套题吧</text>
				<button class="prim" :loading="polling" @click="checkResult">刷新看看</button>
				<button class="ghost" @click="retake">重新作答</button>
			</view>

			<!-- 答题 -->
			<view class="quiz" v-else-if="stage === 'answer' && quiz">
				<view class="q-head">
					<text class="q-title">{{ quiz.title }}</text>
					<text class="q-desc">{{ quiz.desc }}</text>
					<text class="q-progress">已选 {{ answeredCount }}/{{ quiz.questions.length }}</text>
				</view>
				<view class="q-item" v-for="(q, qi) in quiz.questions" :key="qi">
					<text class="q-q">{{ qi + 1 }}. {{ q.q }}</text>
					<view
						v-for="(opt, oi) in q.options" :key="oi"
						:class="['opt', answers[qi] === oi ? 'sel' : '']"
						@click="answers[qi] = oi">
						<text class="opt-txt">{{ opt }}</text>
					</view>
				</view>
				<button class="prim submit" :loading="submitting" @click="submit">提交我的答案</button>
			</view>

			<view class="loading" v-else>
				<text>加载中…</text>
			</view>
		</template>
	</view>
</template>

<script>
import { api, getToken } from '@/utils/request.js'

const QUIZ_ID = 'tacit'

export default {
	data() {
		return {
			me: {},
			quiz: null,
			answers: [],
			stage: 'loading', // loading | answer | waiting | result
			result: null,
			submitting: false,
			polling: false
		}
	},
	computed: {
		answeredCount() {
			return this.answers.filter(a => a !== null && a !== undefined).length
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
			try {
				const meRes = await api.me()
				this.me = meRes.user || {}
				if (this.me.status !== 'couple') return
				await this.checkResult(true)
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			}
		},
		async checkResult(silent) {
			if (!silent) this.polling = true
			try {
				const r = await api.quizResult(QUIZ_ID)
				if (r.ready) {
					this.result = r
					this.stage = 'result'
				} else if (r.youDone) {
					this.stage = 'waiting'
				} else {
					await this.loadQuiz()
					this.stage = 'answer'
				}
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.polling = false
			}
		},
		async loadQuiz() {
			if (this.quiz) return
			this.quiz = await api.quiz(QUIZ_ID)
			this.answers = new Array(this.quiz.questions.length).fill(null)
		},
		async submit() {
			if (this.answeredCount < this.quiz.questions.length) {
				return uni.showToast({ title: '还有题没选哦', icon: 'none' })
			}
			this.submitting = true
			try {
				const r = await api.quizAnswer(QUIZ_ID, { answers: this.answers })
				if (r.bothDone) {
					uni.showToast({ title: '生成结果中…' })
					await this.checkResult(true)
				} else {
					this.stage = 'waiting'
				}
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.submitting = false
			}
		},
		async retake() {
			this.result = null
			this.quiz = null
			await this.loadQuiz()
			this.stage = 'answer'
		},
		goMine() { uni.reLaunch({ url: '/pages/mine/mine' }) }
	}
}
</script>

<style>
.page { min-height: 100vh; padding: 28rpx; }
.notice { display: flex; flex-direction: column; align-items: center; padding-top: 140rpx; }
.n-emoji { font-size: 96rpx; width: 190rpx; height: 190rpx; line-height: 190rpx; text-align: center; border-radius: 50%; background: linear-gradient(135deg, #fff0f2, #ffe0e6); box-shadow: 0 14rpx 44rpx rgba(242,76,104,0.13); }
.n-title { font-size: 32rpx; font-weight: 700; color: #333; margin-top: 24rpx; }
.n-sub { font-size: 26rpx; color: #999; margin-top: 12rpx; text-align: center; padding: 0 40rpx; }
.prim { margin-top: 40rpx; background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff; font-size: 30rpx; border-radius: 44rpx; border: none; padding: 0 80rpx; }
.prim::after { border: none; }
.ghost { margin-top: 24rpx; background: transparent; color: #ff6b81; font-size: 28rpx; border: 2rpx solid #ffb3c0; border-radius: 44rpx; padding: 0 60rpx; }
.ghost::after { border: none; }

.q-head { background: linear-gradient(135deg, #ff8a9b, #f24c68); border-radius: 24rpx; padding: 36rpx; margin-bottom: 24rpx; }
.q-title { font-size: 36rpx; font-weight: 800; color: #fff; }
.q-desc { display: block; font-size: 26rpx; color: rgba(255,255,255,0.9); margin-top: 10rpx; }
.q-progress { display: block; font-size: 24rpx; color: #fff; margin-top: 16rpx; }
.q-item { background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 20rpx; box-shadow: 0 6rpx 20rpx rgba(200,110,130,0.08); }
.q-q { font-size: 30rpx; color: #333; font-weight: 600; }
.opt { margin-top: 18rpx; background: #f7f7f9; border-radius: 16rpx; padding: 24rpx 28rpx; border: 3rpx solid transparent; }
.opt.sel { background: #fff0f2; border-color: #ff6b81; }
.opt-txt { font-size: 28rpx; color: #555; }
.opt.sel .opt-txt { color: #ff5470; font-weight: 600; }
.submit { display: block; width: 60%; margin: 20rpx auto 60rpx; }

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
