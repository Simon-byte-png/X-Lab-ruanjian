<template>
	<view class="page">
		<view class="center" v-if="loading"><text class="muted">加载中…</text></view>

		<!-- 未绑定 -->
		<view class="notice" v-else-if="me.status && me.status !== 'couple'">
			<text class="n-emoji">🐣</text>
			<text class="n-title">绑定另一半才能一起养幼崽</text>
			<text class="n-sub">和 TA 组成情侣，共同孵化、养育你们的爱情结晶</text>
			<button class="prim" @click="goMine">去绑定</button>
		</view>

		<!-- 领养 -->
		<view class="adopt" v-else-if="!pet">
			<text class="a-emoji">🥚</text>
			<text class="a-title">领养一只专属幼崽</text>
			<text class="a-sub">给这颗蛋起个名字，你们一起把它养大吧</text>
			<input class="a-input" v-model="adoptName" placeholder="幼崽的名字" placeholder-class="ph" />
			<button class="prim" :loading="adopting" @click="adopt">开始养育</button>
		</view>

		<!-- 养育主界面 -->
		<view class="main" v-else>
			<view class="stage-card">
				<text class="s-name">{{ pet.name }}</text>
				<text class="s-stage">Lv.{{ pet.level }} · {{ pet.stage.name }}</text>
				<view class="pet-box" @click="talk">
					<text class="pet-emoji">{{ pet.stage.emoji }}</text>
					<text class="pet-face">{{ pet.face }}</text>
				</view>
				<view class="bubble" v-if="speech">
					<text class="bubble-txt">{{ speech }}</text>
				</view>
				<text class="tap-hint" v-else>{{ pet.text }}（点它说说话）</text>

				<view class="exp">
					<view class="exp-bar"><view class="exp-fill" :style="{ width: expPct + '%' }"></view></view>
					<text class="exp-txt">成长 {{ pet.expInLevel }}/{{ pet.expPerLevel }}</text>
				</view>
			</view>

			<!-- 状态 -->
			<view class="stats">
				<view class="stat" v-for="s in statList" :key="s.key">
					<text class="stat-label">{{ s.emoji }} {{ s.label }}</text>
					<view class="stat-bar">
						<view class="stat-fill" :class="s.key" :style="{ width: pet[s.key] + '%' }"></view>
					</view>
					<text class="stat-val">{{ pet[s.key] }}</text>
				</view>
			</view>

			<!-- 互动按钮 -->
			<view class="actions">
				<view class="act" v-for="a in pet.actions" :key="a.key" @click="doAction(a.key)">
					<text class="act-emoji">{{ a.emoji }}</text>
					<text class="act-name">{{ a.name }}</text>
				</view>
			</view>

			<text class="foot-hint">幼崽的状态会随时间慢慢下降，记得每天都来看看它 💗</text>
		</view>

		<!-- 进化弹层 -->
		<view class="mask" v-if="evolve" @click="evolve = null"></view>
		<view class="evolve" v-if="evolve">
			<text class="ev-emoji">{{ evolve.emoji }}</text>
			<text class="ev-title">进化啦！</text>
			<text class="ev-name">{{ pet.name }} 成长为「{{ evolve.name }}」</text>
			<text class="ev-desc">{{ evolve.desc }}</text>
			<button class="prim" @click="evolve = null">太棒啦</button>
		</view>
	</view>
</template>

<script>
import { api, getToken } from '@/utils/request.js'

export default {
	data() {
		return {
			loading: true,
			me: {},
			pet: null,
			adoptName: '',
			adopting: false,
			speech: '',
			evolve: null,
			busy: false,
			statList: [
				{ key: 'hunger', label: '饱食', emoji: '🍚' },
				{ key: 'mood', label: '心情', emoji: '😊' },
				{ key: 'clean', label: '清洁', emoji: '🛁' },
				{ key: 'energy', label: '精力', emoji: '⚡' }
			]
		}
	},
	computed: {
		expPct() {
			if (!this.pet) return 0
			return Math.round(100 * this.pet.expInLevel / this.pet.expPerLevel)
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
			this.loading = true
			try {
				const meRes = await api.me()
				this.me = meRes.user || {}
				if (this.me.status !== 'couple') return
				const res = await api.pet()
				this.pet = res.pet
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async adopt() {
			if (!this.adoptName.trim()) return uni.showToast({ title: '给幼崽起个名字', icon: 'none' })
			this.adopting = true
			try {
				const res = await api.adoptPet({ name: this.adoptName.trim() })
				this.pet = res.pet
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.adopting = false
			}
		},
		async doAction(key) {
			if (this.busy) return
			this.busy = true
			try {
				const res = await api.petAction({ action: key })
				this.pet = res.pet
				this.speech = res.line
				setTimeout(() => { if (this.speech === res.line) this.speech = '' }, 3000)
				if (res.leveledUp && res.newStage) {
					this.evolve = res.newStage
				}
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.busy = false
			}
		},
		async talk() {
			if (this.busy) return
			this.busy = true
			try {
				const res = await api.petTalk()
				this.speech = res.line
				if (res.pet) this.pet = res.pet
				setTimeout(() => { if (this.speech === res.line) this.speech = '' }, 5000)
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.busy = false
			}
		},
		goMine() { uni.reLaunch({ url: '/pages/mine/mine' }) }
	}
}
</script>

<style>
.page { min-height: 100vh; background: linear-gradient(180deg, #eaf6ff, #fff5f6); padding: 28rpx; box-sizing: border-box; }
.center { display: flex; height: 60vh; align-items: center; justify-content: center; }
.muted { color: #999; }
.notice, .adopt { display: flex; flex-direction: column; align-items: center; padding-top: 130rpx; }
.n-emoji, .a-emoji { font-size: 96rpx; width: 190rpx; height: 190rpx; line-height: 190rpx; text-align: center; border-radius: 50%; background: linear-gradient(135deg, #fff0f2, #ffe0e6); box-shadow: 0 14rpx 44rpx rgba(242,76,104,0.13); }
.n-title, .a-title { font-size: 32rpx; font-weight: 700; color: #333; margin-top: 24rpx; }
.n-sub, .a-sub { font-size: 26rpx; color: #999; margin-top: 12rpx; text-align: center; padding: 0 40rpx; line-height: 1.6; }
.a-input { margin-top: 40rpx; width: 70%; height: 88rpx; background: #fff; border-radius: 44rpx; padding: 0 40rpx; font-size: 30rpx; text-align: center; box-sizing: border-box; }
.ph { color: #bbb; }
.prim { margin-top: 32rpx; background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff; font-size: 30rpx; border-radius: 44rpx; border: none; padding: 0 70rpx; }
.prim::after { border: none; }

.stage-card { background: #fff; border-radius: 32rpx; padding: 40rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 10rpx 40rpx rgba(255,140,170,0.15); }
.s-name { font-size: 40rpx; font-weight: 800; color: #333; }
.s-stage { font-size: 24rpx; color: #ff9aa8; background: #fff0f2; padding: 4rpx 20rpx; border-radius: 20rpx; margin-top: 12rpx; }
.pet-box { width: 280rpx; height: 280rpx; margin: 30rpx 0 10rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(circle, #fff7e6, #ffe9f0); border-radius: 50%; }
.pet-emoji { font-size: 150rpx; line-height: 1; }
.pet-face { font-size: 30rpx; color: #ff6b81; margin-top: 8rpx; }
.bubble { background: #fff0f2; border-radius: 20rpx; padding: 18rpx 28rpx; margin-top: 8rpx; max-width: 90%; }
.bubble-txt { font-size: 27rpx; color: #ff5470; line-height: 1.5; }
.tap-hint { font-size: 24rpx; color: #bbb; margin-top: 12rpx; }
.exp { width: 100%; margin-top: 28rpx; display: flex; flex-direction: column; align-items: center; }
.exp-bar { width: 100%; height: 14rpx; background: #f0f0f2; border-radius: 8rpx; overflow: hidden; }
.exp-fill { height: 100%; background: linear-gradient(90deg, #ffd36b, #ff9a76); }
.exp-txt { font-size: 22rpx; color: #aaa; margin-top: 10rpx; }

.stats { background: #fff; border-radius: 24rpx; padding: 32rpx; margin-top: 24rpx; }
.stat { display: flex; align-items: center; margin-bottom: 22rpx; }
.stat:last-child { margin-bottom: 0; }
.stat-label { width: 140rpx; font-size: 26rpx; color: #555; }
.stat-bar { flex: 1; height: 18rpx; background: #f0f0f2; border-radius: 10rpx; overflow: hidden; margin: 0 16rpx; }
.stat-fill { height: 100%; border-radius: 10rpx; transition: width 0.3s; }
.stat-fill.hunger { background: linear-gradient(90deg, #ffcf6b, #ff9a3d); }
.stat-fill.mood { background: linear-gradient(90deg, #ff9aa8, #ff5470); }
.stat-fill.clean { background: linear-gradient(90deg, #7ecbff, #4a9eff); }
.stat-fill.energy { background: linear-gradient(90deg, #a6e88a, #5bc236); }
.stat-val { width: 56rpx; text-align: right; font-size: 24rpx; color: #999; }

.actions { display: flex; flex-wrap: wrap; justify-content: space-between; margin-top: 24rpx; }
.act { width: 30.5%; background: #fff; border-radius: 22rpx; margin-bottom: 18rpx; padding: 24rpx 0; display: flex; flex-direction: column; align-items: center; box-shadow: 0 6rpx 16rpx rgba(200,110,130,0.08); transition: transform 0.15s; }
.act:active { transform: scale(0.94); }
.act-emoji { font-size: 50rpx; }
.act-name { font-size: 23rpx; color: #6b6472; margin-top: 10rpx; }
.foot-hint { display: block; text-align: center; font-size: 22rpx; color: #bbb; margin-top: 28rpx; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10; }
.evolve { position: fixed; left: 60rpx; right: 60rpx; top: 30%; z-index: 11; background: #fff; border-radius: 28rpx; padding: 50rpx 40rpx; display: flex; flex-direction: column; align-items: center; }
.ev-emoji { font-size: 130rpx; }
.ev-title { font-size: 40rpx; font-weight: 800; color: #ff5470; margin-top: 10rpx; }
.ev-name { font-size: 30rpx; color: #333; font-weight: 600; margin-top: 16rpx; text-align: center; }
.ev-desc { font-size: 25rpx; color: #999; margin-top: 12rpx; text-align: center; line-height: 1.6; }
</style>
