<template>
	<view class="page">
		<view class="center" v-if="loading"><text class="muted">加载中…</text></view>

		<view class="notice" v-else-if="me.status && me.status !== 'couple'">
			<text class="n-emoji">🏠</text>
			<text class="n-title">绑定另一半后一起搭小屋</text>
			<text class="n-sub">用爱心币把你们的专属小屋装扮得温馨满满</text>
			<button class="prim" @click="goMine">去绑定</button>
		</view>

		<template v-else-if="house">
			<!-- 顶栏 -->
			<view class="top">
				<view class="coins">💰 <text class="coin-num">{{ house.coins }}</text> 爱心币</view>
				<button class="sign-btn" :disabled="house.signedToday" @click="sign">
					{{ house.signedToday ? '今日已签到' : '签到 +20' }}
				</button>
			</view>

			<!-- 房间 -->
			<view class="room" :style="{ background: themeBg }">
				<view class="zone wall">
					<text class="zi" v-for="it in zoneItems('wall')" :key="it.id">{{ it.emoji }}</text>
					<text class="zone-empty" v-if="!zoneItems('wall').length">墙面空空的~</text>
				</view>
				<view class="zone desk">
					<text class="zi" v-for="it in zoneItems('desk')" :key="it.id">{{ it.emoji }}</text>
				</view>
				<view class="zone floor">
					<text class="zi big" v-for="it in zoneItems('floor')" :key="it.id">{{ it.emoji }}</text>
				</view>
				<view class="room-empty" v-if="!house.owned.length">
					<text>空荡荡的小屋，去下面商店挑点家具吧 🛒</text>
				</view>
			</view>

			<!-- 主题 -->
			<scroll-view scroll-x class="themes">
				<text v-for="t in house.themes" :key="t.id" :class="['theme', house.theme === t.id ? 'on' : '']" @click="setTheme(t.id)">{{ t.name }}</text>
			</scroll-view>

			<!-- 商店 -->
			<view class="shop-title">🛒 装饰商店</view>
			<view class="shop">
				<view class="goods" v-for="g in house.shop" :key="g.id">
					<text class="g-emoji">{{ g.emoji }}</text>
					<text class="g-name">{{ g.name }}</text>
					<button v-if="g.owned" class="g-owned" disabled>已拥有</button>
					<button v-else class="g-buy" @click="buy(g)">💰{{ g.price }}</button>
				</view>
			</view>
			<text class="tip">照顾幼崽 +2、完成每日任务 +5、每日签到 +20 爱心币</text>
		</template>
	</view>
</template>

<script>
import { api, getToken } from '@/utils/request.js'

export default {
	data() {
		return { loading: true, me: {}, house: null }
	},
	computed: {
		themeBg() {
			if (!this.house) return ''
			const t = this.house.themes.find(x => x.id === this.house.theme)
			return t ? t.bg : ''
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
				this.house = await api.house()
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		zoneItems(zone) {
			if (!this.house) return []
			return this.house.shop.filter(g => g.owned && g.zone === zone)
		},
		async sign() {
			try {
				const res = await api.houseSign()
				this.house = res
				uni.showToast({ title: '签到 +20 💰', icon: 'none' })
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			}
		},
		async buy(g) {
			try {
				this.house = await api.houseBuy({ itemId: g.id })
				uni.showToast({ title: g.name + ' 到手！', icon: 'none' })
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			}
		},
		async setTheme(id) {
			try {
				this.house = await api.houseTheme({ theme: id })
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			}
		},
		goMine() { uni.reLaunch({ url: '/pages/mine/mine' }) }
	}
}
</script>

<style>
.page { min-height: 100vh; padding: 24rpx 28rpx 60rpx; }
.center { display: flex; height: 60vh; align-items: center; justify-content: center; }
.muted { color: #999; }
.notice { display: flex; flex-direction: column; align-items: center; padding-top: 140rpx; }
.n-emoji { font-size: 96rpx; width: 190rpx; height: 190rpx; line-height: 190rpx; text-align: center; border-radius: 50%; background: linear-gradient(135deg, #fff0f2, #ffe0e6); box-shadow: 0 14rpx 44rpx rgba(242,76,104,0.13); }
.n-title { font-size: 32rpx; font-weight: 700; color: #333; margin-top: 24rpx; }
.n-sub { font-size: 26rpx; color: #999; margin-top: 12rpx; text-align: center; padding: 0 30rpx; }
.prim { margin-top: 40rpx; background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff; font-size: 30rpx; border-radius: 44rpx; border: none; padding: 0 80rpx; }
.prim::after { border: none; }

.top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.coins { font-size: 30rpx; color: #333; font-weight: 600; }
.coin-num { color: #ff9a3d; font-weight: 800; }
.sign-btn { background: linear-gradient(90deg, #ffd36b, #ff9a3d); color: #fff; font-size: 26rpx; border-radius: 40rpx; border: none; padding: 0 32rpx; line-height: 2.6; }
.sign-btn[disabled] { background: #eee; color: #bbb; }
.sign-btn::after { border: none; }

.room { position: relative; height: 520rpx; border-radius: 26rpx; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; box-shadow: inset 0 0 0 2rpx rgba(0,0,0,0.03); }
.zone { display: flex; flex-wrap: wrap; align-items: flex-end; padding: 20rpx 28rpx; min-height: 90rpx; }
.zone.wall { align-items: flex-start; }
.zone.floor { border-top: 4rpx solid rgba(180,140,100,0.25); background: rgba(255,255,255,0.15); }
.zi { font-size: 56rpx; margin: 6rpx 14rpx; }
.zi.big { font-size: 76rpx; }
.zone-empty { font-size: 22rpx; color: rgba(0,0,0,0.25); }
.room-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: rgba(0,0,0,0.35); text-align: center; padding: 0 40rpx; }

.themes { white-space: nowrap; margin: 22rpx 0; }
.theme { display: inline-block; font-size: 25rpx; color: #888; background: #f2f2f4; border-radius: 30rpx; padding: 12rpx 26rpx; margin-right: 14rpx; }
.theme.on { background: #ffe3e9; color: #ff5470; font-weight: 600; }

.shop-title { font-size: 30rpx; font-weight: 700; color: #333; margin: 10rpx 0 18rpx; }
.shop { display: flex; flex-wrap: wrap; justify-content: space-between; }
.goods { width: 31%; background: #fff; border-radius: 20rpx; padding: 24rpx 0; margin-bottom: 18rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 6rpx 16rpx rgba(200,110,130,0.09); }
.g-emoji { font-size: 56rpx; }
.g-name { font-size: 24rpx; color: #666; margin: 10rpx 0 14rpx; }
.g-buy { background: linear-gradient(90deg, #ffd36b, #ff9a3d); color: #fff; font-size: 24rpx; border-radius: 30rpx; border: none; padding: 0 28rpx; line-height: 2.4; }
.g-buy::after { border: none; }
.g-owned { background: #f2f2f2; color: #bbb; font-size: 22rpx; border-radius: 30rpx; border: none; padding: 0 24rpx; line-height: 2.4; }
.g-owned::after { border: none; }
.tip { display: block; text-align: center; font-size: 22rpx; color: #bbb; margin-top: 20rpx; line-height: 1.6; }
</style>
