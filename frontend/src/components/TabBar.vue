<template>
	<view class="tabbar">
		<view class="tabbar-inner">
			<view
				v-for="(t, i) in tabs" :key="t.path"
				:class="['tab', current === i ? 'active' : '']"
				@click="go(i, t)">
				<view class="icon-wrap">
					<text class="icon">{{ current === i ? t.iconActive : t.icon }}</text>
				</view>
				<text class="label">{{ t.text }}</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'TabBar',
	props: {
		current: { type: Number, default: 0 }
	},
	data() {
		return {
			tabs: [
				{ path: '/pages/home/home', text: '首页', icon: '🏠', iconActive: '🏡' },
				{ path: '/pages/countdown/countdown', text: '倒数日', icon: '📅', iconActive: '🗓️' },
				{ path: '/pages/memories/memories', text: '纪念本', icon: '📖', iconActive: '📔' },
				{ path: '/pages/mine/mine', text: '我的', icon: '🙂', iconActive: '😊' }
			]
		}
	},
	methods: {
		go(i, t) {
			if (i === this.current) return
			uni.redirectTo({
				url: t.path,
				fail: () => uni.reLaunch({ url: t.path })
			})
		}
	}
}
</script>

<style scoped>
.tabbar {
	position: fixed;
	left: 0; right: 0; bottom: 0;
	z-index: 100;
	padding: 12rpx 24rpx calc(12rpx + env(safe-area-inset-bottom));
	background: transparent;
	pointer-events: none;
}
.tabbar-inner {
	pointer-events: auto;
	display: flex;
	background: rgba(255, 255, 255, 0.92);
	backdrop-filter: blur(20rpx);
	border-radius: 40rpx;
	padding: 12rpx 8rpx;
	box-shadow: 0 12rpx 40rpx rgba(200, 110, 130, 0.18);
	border: 2rpx solid rgba(255, 179, 192, 0.35);
}
.tab {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 8rpx 0;
	transition: transform 0.2s;
}
.icon-wrap {
	width: 64rpx; height: 64rpx;
	display: flex; align-items: center; justify-content: center;
	border-radius: 50%;
	transition: all 0.25s;
}
.icon { font-size: 40rpx; line-height: 1; }
.label {
	font-size: 20rpx;
	color: #a8a2b0;
	margin-top: 2rpx;
	transition: color 0.2s;
}
.tab.active .icon-wrap {
	background: linear-gradient(135deg, #ffe1e7, #ffd0dc);
	transform: translateY(-4rpx) scale(1.05);
	box-shadow: 0 6rpx 16rpx rgba(242, 76, 104, 0.22);
}
.tab.active .label {
	color: #f24c68;
	font-weight: 700;
}
</style>
