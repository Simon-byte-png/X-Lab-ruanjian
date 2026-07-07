<template>
	<view class="page">
		<!-- 未绑定 -->
		<view class="notice" v-if="me.status && me.status !== 'couple'">
			<text class="n-emoji">📮</text>
			<text class="n-title">绑定另一半解锁每日任务</text>
			<text class="n-sub">每天 AI 会为你们生成有爱的小任务，一起完成、增进感情</text>
			<button class="prim" @click="goMine">去绑定</button>
		</view>

		<template v-else-if="me.status === 'couple'">
			<view class="hero">
				<text class="date">{{ data.day }}</text>
				<text class="h-title">今天的恋爱小任务</text>
				<view class="progress-bar">
					<view class="progress-fill" :style="{ width: pct + '%' }"></view>
				</view>
				<text class="progress-txt">已完成 {{ data.doneCount }}/{{ data.total }}</text>
			</view>

			<view class="loading" v-if="loading">
				<text class="l-emoji">✨</text>
				<text class="l-txt">AI 正在为你们准备今天的小任务…</text>
			</view>

			<view class="tasks" v-else>
				<view
					v-for="t in data.list" :key="t.id"
					:class="['task', t.done ? 'done' : '']"
					@click="toggle(t)">
					<view class="check">
						<text v-if="t.done">✓</text>
					</view>
					<view class="t-body">
						<text class="t-title">{{ t.emoji }} {{ t.title }}</text>
						<text class="t-detail">{{ t.detail }}</text>
					</view>
				</view>

				<view class="all-done" v-if="data.total && data.doneCount === data.total">
					<text class="ad-emoji">🎉</text>
					<text class="ad-txt">今天的任务全部完成，你们真甜！</text>
				</view>

				<button class="refresh" :loading="refreshing" @click="refresh">换一批任务</button>
				<text class="tip">每天 0 点会有新任务；换一批会重新生成今天的任务</text>
			</view>
		</template>
	</view>
</template>

<script>
import { api, getToken } from '@/utils/request.js'

export default {
	data() {
		return {
			me: {},
			data: { day: '', list: [], doneCount: 0, total: 0 },
			loading: false,
			refreshing: false
		}
	},
	computed: {
		pct() {
			if (!this.data.total) return 0
			return Math.round(100 * this.data.doneCount / this.data.total)
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
				this.loading = true
				this.data = await api.tasksToday()
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async toggle(t) {
			try {
				this.data = await api.toggleTask(t.id)
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			}
		},
		async refresh() {
			this.refreshing = true
			try {
				this.data = await api.refreshTasks()
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.refreshing = false
			}
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
.n-sub { font-size: 26rpx; color: #999; margin-top: 12rpx; text-align: center; padding: 0 40rpx; line-height: 1.6; }
.prim { margin-top: 40rpx; background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff; font-size: 30rpx; border-radius: 44rpx; border: none; padding: 0 80rpx; }
.prim::after { border: none; }

.hero { background: linear-gradient(135deg, #ffb26b, #ff7a90); border-radius: 28rpx; padding: 40rpx; color: #fff; }
.date { font-size: 24rpx; opacity: 0.9; }
.h-title { display: block; font-size: 40rpx; font-weight: 800; margin-top: 8rpx; }
.progress-bar { height: 16rpx; background: rgba(255,255,255,0.35); border-radius: 10rpx; margin-top: 28rpx; overflow: hidden; }
.progress-fill { height: 100%; background: #fff; border-radius: 10rpx; transition: width 0.3s; }
.progress-txt { display: block; font-size: 24rpx; margin-top: 14rpx; }

.loading { display: flex; flex-direction: column; align-items: center; padding-top: 120rpx; }
.l-emoji { font-size: 90rpx; }
.l-txt { font-size: 28rpx; color: #999; margin-top: 24rpx; }

.tasks { margin-top: 28rpx; }
.task { display: flex; align-items: flex-start; background: #fff; border-radius: 22rpx; padding: 32rpx 28rpx; margin-bottom: 20rpx; box-shadow: 0 6rpx 20rpx rgba(200,110,130,0.09); }
.task.done { opacity: 0.6; }
.check { width: 52rpx; height: 52rpx; border-radius: 50%; border: 3rpx solid #ffb3c0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 32rpx; flex-shrink: 0; margin-right: 24rpx; }
.task.done .check { background: #ff6b81; border-color: #ff6b81; }
.t-body { flex: 1; }
.t-title { font-size: 31rpx; font-weight: 700; color: #333; }
.task.done .t-title { text-decoration: line-through; }
.t-detail { display: block; font-size: 26rpx; color: #888; margin-top: 12rpx; line-height: 1.6; }

.all-done { display: flex; flex-direction: column; align-items: center; padding: 30rpx 0; }
.ad-emoji { font-size: 70rpx; }
.ad-txt { font-size: 28rpx; color: #ff6b81; font-weight: 600; margin-top: 12rpx; }

.refresh { margin-top: 20rpx; background: #fff; color: #ff6b81; border: 2rpx solid #ffb3c0; border-radius: 44rpx; font-size: 28rpx; }
.refresh::after { border: none; }
.tip { display: block; text-align: center; font-size: 22rpx; color: #bbb; margin-top: 20rpx; }
</style>
