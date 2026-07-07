<template>
	<view class="page">
		<view class="tabs">
			<text :class="['tab', tab === 'daily' ? 'on' : '']" @click="tab = 'daily'">今日运势</text>
			<text :class="['tab', tab === 'match' ? 'on' : '']" @click="tab = 'match'">姓名缘分</text>
		</view>

		<!-- 今日运势 -->
		<view v-if="tab === 'daily'">
			<view class="star-card" v-if="!daily">
				<text class="star">🔮</text>
				<text class="star-tip">占卜师正在为你观测今日的恋爱星象……</text>
				<button class="cast-btn" :loading="loadingDaily" @click="castDaily">测今日运势</button>
			</view>

			<view class="result" v-else>
				<view class="score-ring">
					<text class="score-num">{{ daily.score }}</text>
					<text class="score-label">恋爱指数</text>
				</view>
				<text class="mood">「{{ daily.mood }}」</text>
				<view class="block">
					<text class="b-title">💗 今日运势</text>
					<text class="b-text">{{ daily.love }}</text>
				</view>
				<view class="row2">
					<view class="mini">
						<text class="mini-l">宜做</text>
						<text class="mini-v">{{ daily.luckyAction }}</text>
					</view>
					<view class="mini">
						<text class="mini-l">幸运地</text>
						<text class="mini-v">{{ daily.luckyPlace }}</text>
					</view>
				</view>
				<view class="advice">
					<text class="adv-text">✨ {{ daily.advice }}</text>
				</view>
				<text class="cached-hint">今日运势每天只测一次哦，明天再来～</text>
			</view>
		</view>

		<!-- 姓名缘分 -->
		<view v-else>
			<view class="match-form">
				<text class="mf-title">💑 测测你俩的缘分</text>
				<input class="mf-input" v-model="nameA" placeholder="你的名字" placeholder-class="ph" />
				<text class="mf-amp">&</text>
				<input class="mf-input" v-model="nameB" placeholder="TA 的名字" placeholder-class="ph" />
				<button class="cast-btn" :loading="loadingMatch" @click="castMatch">开始测算</button>
			</view>

			<view class="result" v-if="match">
				<view class="score-ring pink">
					<text class="score-num">{{ match.score }}</text>
					<text class="score-label">缘分值</text>
				</view>
				<text class="mood">{{ match.title }}</text>
				<view class="block">
					<text class="b-text center">{{ match.analysis }}</text>
				</view>
				<view class="advice">
					<text class="adv-text">💡 {{ match.tip }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { api, getToken } from '@/utils/request.js'

export default {
	data() {
		return {
			tab: 'daily',
			daily: null,
			loadingDaily: false,
			nameA: '', nameB: '', match: null, loadingMatch: false
		}
	},
	onShow() {
		if (!getToken()) uni.reLaunch({ url: '/pages/login/login' })
	},
	methods: {
		async castDaily() {
			this.loadingDaily = true
			try {
				this.daily = await api.fortune({ kind: 'daily' })
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.loadingDaily = false
			}
		},
		async castMatch() {
			if (!this.nameA.trim() || !this.nameB.trim()) return uni.showToast({ title: '两个名字都要填哦', icon: 'none' })
			this.loadingMatch = true
			try {
				this.match = await api.fortune({ kind: 'match', nameA: this.nameA.trim(), nameB: this.nameB.trim() })
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.loadingMatch = false
			}
		}
	}
}
</script>

<style>
.page { min-height: 100vh; background: linear-gradient(180deg, #2b1b4d 0%, #4a2b6b 40%, #7a3d7a 100%); padding: 32rpx 28rpx 80rpx; }
.tabs { display: flex; background: rgba(255,255,255,0.12); border-radius: 44rpx; padding: 8rpx; margin-bottom: 40rpx; }
.tab { flex: 1; text-align: center; padding: 18rpx 0; font-size: 28rpx; color: rgba(255,255,255,0.7); border-radius: 40rpx; }
.tab.on { background: #fff; color: #7a3d7a; font-weight: 700; }

.star-card { display: flex; flex-direction: column; align-items: center; padding: 100rpx 0 60rpx; }
.star { font-size: 130rpx; }
.star-tip { color: rgba(255,255,255,0.85); font-size: 26rpx; margin: 30rpx 0 50rpx; text-align: center; }
.cast-btn { background: linear-gradient(90deg, #ffd36b, #ff9a76); color: #5a2a00; font-size: 30rpx; font-weight: 700; border-radius: 44rpx; border: none; padding: 0 80rpx; }
.cast-btn::after { border: none; }

.result { display: flex; flex-direction: column; align-items: center; }
.score-ring { width: 220rpx; height: 220rpx; border-radius: 50%; background: radial-gradient(circle, #ffe9a8, #ffb86b); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 0 60rpx rgba(255,200,100,0.5); margin-top: 20rpx; }
.score-ring.pink { background: radial-gradient(circle, #ffd0dc, #ff8fb0); box-shadow: 0 0 60rpx rgba(255,140,170,0.5); }
.score-num { font-size: 84rpx; font-weight: 800; color: #7a3d1a; line-height: 1; }
.score-label { font-size: 24rpx; color: #a05a2a; margin-top: 6rpx; }
.mood { color: #fff; font-size: 34rpx; font-weight: 700; margin: 32rpx 0 8rpx; text-align: center; }

.block { background: rgba(255,255,255,0.95); border-radius: 24rpx; padding: 32rpx; width: 100%; box-sizing: border-box; margin-top: 24rpx; }
.b-title { font-size: 28rpx; font-weight: 700; color: #7a3d7a; }
.b-text { display: block; font-size: 28rpx; color: #444; line-height: 1.7; margin-top: 12rpx; }
.b-text.center { text-align: center; margin-top: 0; }
.row2 { display: flex; width: 100%; margin-top: 20rpx; }
.mini { flex: 1; background: rgba(255,255,255,0.95); border-radius: 20rpx; padding: 24rpx; margin: 0 8rpx; display: flex; flex-direction: column; align-items: center; }
.mini-l { font-size: 22rpx; color: #999; }
.mini-v { font-size: 26rpx; color: #7a3d7a; font-weight: 600; margin-top: 8rpx; text-align: center; }
.advice { background: rgba(255,255,255,0.15); border-radius: 20rpx; padding: 24rpx 28rpx; margin-top: 24rpx; width: 100%; box-sizing: border-box; }
.adv-text { color: #fff; font-size: 26rpx; line-height: 1.6; }
.cached-hint { color: rgba(255,255,255,0.6); font-size: 22rpx; margin-top: 28rpx; }

.match-form { background: rgba(255,255,255,0.95); border-radius: 24rpx; padding: 40rpx; display: flex; flex-direction: column; align-items: center; }
.mf-title { font-size: 32rpx; font-weight: 700; color: #7a3d7a; margin-bottom: 32rpx; }
.mf-input { width: 100%; height: 88rpx; background: #f5f0f8; border-radius: 16rpx; padding: 0 28rpx; font-size: 30rpx; box-sizing: border-box; text-align: center; }
.mf-amp { font-size: 40rpx; color: #ff8fb0; margin: 16rpx 0; }
.ph { color: #bbb; }
.match-form .cast-btn { margin-top: 32rpx; }
</style>
