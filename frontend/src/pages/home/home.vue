<template>
	<view class="lz-page lz-with-tabbar page">
		<!-- 顶部问候 -->
		<view class="header">
			<view>
				<text class="hi">Hi，{{ me.nickname || me.username || '' }}</text>
				<text class="sub">{{ statusText }}</text>
			</view>
			<text class="wave">🌷</text>
		</view>

		<!-- 情侣状态卡 -->
		<view class="love-card" v-if="me.status === 'couple' && partner">
			<view class="love-glow"></view>
			<view class="avatars">
				<text class="ava">{{ me.nickname ? me.nickname[0] : '我' }}</text>
				<text class="heart">💞</text>
				<text class="ava ava2">{{ partner.nickname ? partner.nickname[0] : 'TA' }}</text>
			</view>
			<text class="pair">{{ me.nickname || me.username }} <text class="amp">&</text> {{ partner.nickname || partner.username }}</text>
			<view class="days-box" v-if="together !== null">
				<text class="days-label">我们已相恋</text>
				<text class="big">{{ together }}</text>
				<text class="days-label">天</text>
			</view>
			<text class="set-anni" v-else @click="goCountdown">✨ 去设置恋爱纪念日 →</text>
		</view>

		<view class="love-card single" v-else>
			<view class="love-glow single-glow"></view>
			<text class="ava big-emoji">🌱</text>
			<text class="pair">你好呀，单身的美好时光</text>
			<text class="days single-tip">绑定另一半，解锁双人专属玩法</text>
			<button class="mini-btn" @click="goMine">去绑定 TA</button>
		</view>

		<!-- 倒数日概览 -->
		<view class="section">
			<view class="section-head">
				<text class="section-title">最近的日子</text>
				<text class="more" @click="goCountdown">全部 →</text>
			</view>
			<view class="cd-list" v-if="topCountdowns.length">
				<view class="cd-item" v-for="c in topCountdowns" :key="c.id">
					<view class="cd-left">
						<text class="cd-title">{{ c.title }}</text>
						<text class="cd-date">{{ c.target_date }}</text>
					</view>
					<view class="cd-right">
						<text class="cd-num">{{ Math.abs(c.days) }}</text>
						<text class="cd-unit">{{ c.days > 0 ? '天后' : (c.days < 0 ? '天前' : '今天') }}</text>
					</view>
				</view>
			</view>
			<view class="empty" v-else @click="goCountdown">
				<text class="empty-txt">➕ 还没有倒数日，去添加一个吧</text>
			</view>
		</view>

		<!-- 功能入口 -->
		<view class="section">
			<text class="section-title">恋爱小功能</text>
			<view class="grid">
				<view class="grid-item" v-for="(f, i) in features" :key="f.name" @click="tapFeature(f)">
					<view class="grid-icon" :style="{ background: f.bg }">
						<text class="grid-emoji">{{ f.emoji }}</text>
					</view>
					<text class="grid-name">{{ f.name }}</text>
				</view>
			</view>
		</view>

		<TabBar :current="0" />
	</view>
</template>

<script>
import { api, getToken } from '@/utils/request.js'
import TabBar from '@/components/TabBar.vue'

export default {
	components: { TabBar },
	data() {
		return {
			me: {},
			partner: null,
			together: null,
			countdowns: [],
			features: [
				{ emoji: '🧩', name: '匹配度测试', ready: true, url: '/pages/match/match', bg: 'linear-gradient(135deg,#ffe0e6,#ffc2cf)' },
				{ emoji: '🔮', name: 'AI 算命', ready: true, url: '/pages/fortune/fortune', bg: 'linear-gradient(135deg,#e5ddff,#cdbcff)' },
				{ emoji: '📮', name: '每日任务', ready: true, url: '/pages/tasks/tasks', bg: 'linear-gradient(135deg,#ffe6c7,#ffcfa0)' },
				{ emoji: '🐣', name: '养幼崽', ready: true, url: '/pages/pet/pet', bg: 'linear-gradient(135deg,#fff2c2,#ffe28a)' },
				{ emoji: '💬', name: 'AI 陪伴', ready: true, url: '/pages/companion/companion', bg: 'linear-gradient(135deg,#d6ecff,#b3d9ff)' },
				{ emoji: '🏠', name: '小屋', ready: true, url: '/pages/house/house', bg: 'linear-gradient(135deg,#d9f5e0,#b8ecc6)' }
			]
		}
	},
	computed: {
		statusText() {
			if (this.me.status === 'couple') return '愿你们的每一天都值得纪念'
			return '一个人也要好好生活 ✨'
		},
		topCountdowns() {
			return [...this.countdowns]
				.sort((a, b) => Math.abs(a.days) - Math.abs(b.days))
				.slice(0, 3)
		}
	},
	onShow() {
		if (!getToken()) {
			uni.reLaunch({ url: '/pages/login/login' })
			return
		}
		this.load()
	},
	methods: {
		async load() {
			try {
				const res = await api.me()
				this.me = res.user || {}
				this.partner = res.partner || null
				this.together = res.togetherDays
				const cd = await api.countdowns()
				this.countdowns = cd.list || []
			} catch (e) {
				if (/401/.test(e.message)) {
					uni.reLaunch({ url: '/pages/login/login' })
				}
			}
		},
		goCountdown() { uni.reLaunch({ url: '/pages/countdown/countdown' }) },
		goMine() { uni.reLaunch({ url: '/pages/mine/mine' }) },
		tapFeature(f) {
			if (f.ready && f.url) {
				uni.navigateTo({ url: f.url })
				return
			}
			uni.showToast({ title: f.name + ' 正在开发中', icon: 'none' })
		}
	}
}
</script>

<style>
.page { padding: 20rpx 32rpx 60rpx; }
.header { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 4rpx 12rpx; }
.hi { font-size: 44rpx; font-weight: 800; color: var(--ink); letter-spacing: 0.5rpx; }
.sub { display: block; font-size: 25rpx; color: var(--ink-3); margin-top: 10rpx; }
.wave { font-size: 60rpx; }

.love-card {
	position: relative;
	margin-top: 20rpx;
	background: var(--grad-rose);
	border-radius: 32rpx;
	padding: 48rpx 40rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	overflow: hidden;
	box-shadow: 0 20rpx 50rpx rgba(242, 76, 104, 0.28);
}
.love-card.single { background: linear-gradient(135deg, #ffd9a8, #ff9aa8); box-shadow: 0 20rpx 50rpx rgba(255, 154, 168, 0.3); }
.love-glow { position: absolute; top: -60rpx; right: -60rpx; width: 240rpx; height: 240rpx; background: rgba(255,255,255,0.22); border-radius: 50%; }
.love-glow::after { content: ''; position: absolute; bottom: -160rpx; left: -120rpx; width: 200rpx; height: 200rpx; background: rgba(255,255,255,0.12); border-radius: 50%; }
.avatars { display: flex; align-items: center; z-index: 1; }
.ava {
	width: 88rpx; height: 88rpx; border-radius: 50%;
	background: rgba(255,255,255,0.9); color: var(--rose-deep);
	font-size: 36rpx; font-weight: 800;
	display: flex; align-items: center; justify-content: center;
	box-shadow: 0 6rpx 16rpx rgba(0,0,0,0.12);
}
.ava2 { background: rgba(255,255,255,0.75); }
.big-emoji { width: auto; height: auto; background: transparent; font-size: 80rpx; box-shadow: none; }
.heart { font-size: 40rpx; margin: 0 -12rpx; z-index: 2; }
.pair { color: #fff; font-size: 34rpx; font-weight: 800; margin-top: 22rpx; z-index: 1; }
.amp { opacity: 0.7; margin: 0 6rpx; }
.days-box { display: flex; align-items: baseline; margin-top: 18rpx; z-index: 1; }
.days-label { color: rgba(255,255,255,0.92); font-size: 26rpx; }
.big { font-size: 72rpx; font-weight: 900; color: #fff; margin: 0 14rpx; line-height: 1; text-shadow: 0 4rpx 12rpx rgba(0,0,0,0.15); }
.single-tip { color: rgba(255,255,255,0.95); font-size: 26rpx; margin-top: 12rpx; z-index: 1; }
.set-anni { color: #fff; font-size: 27rpx; margin-top: 18rpx; z-index: 1; }
.mini-btn {
	margin-top: 26rpx; background: #fff; color: #f2884c; z-index: 1;
	font-size: 28rpx; font-weight: 600; border-radius: 999rpx; padding: 8rpx 52rpx; line-height: 2;
	box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.12);
}
.mini-btn::after { border: none; }

.section { margin-top: 44rpx; }
.section-head { display: flex; justify-content: space-between; align-items: center; }
.section-title { font-size: 32rpx; font-weight: 800; color: var(--ink); }
.more { font-size: 25rpx; color: var(--rose); }

.cd-list { margin-top: 22rpx; }
.cd-item {
	background: var(--card); border-radius: 24rpx; padding: 30rpx 34rpx;
	display: flex; justify-content: space-between; align-items: center;
	margin-bottom: 16rpx; box-shadow: var(--shadow-sm);
}
.cd-title { font-size: 30rpx; color: var(--ink); font-weight: 600; }
.cd-date { display: block; font-size: 24rpx; color: var(--ink-3); margin-top: 8rpx; }
.cd-right { display: flex; flex-direction: column; align-items: flex-end; }
.cd-num { font-size: 48rpx; font-weight: 900; color: var(--rose); line-height: 1; }
.cd-unit { font-size: 22rpx; color: var(--ink-3); margin-top: 6rpx; }

.empty { padding: 48rpx; text-align: center; background: var(--card); border-radius: 24rpx; box-shadow: var(--shadow-sm); margin-top: 22rpx; }
.empty-txt { font-size: 26rpx; color: var(--ink-3); }

.grid { display: flex; flex-wrap: wrap; margin-top: 24rpx; }
.grid-item {
	width: 33.33%; box-sizing: border-box; display: flex; flex-direction: column;
	align-items: center; padding: 18rpx 0;
}
.grid-icon {
	width: 116rpx; height: 116rpx; border-radius: 30rpx;
	display: flex; align-items: center; justify-content: center;
	box-shadow: var(--shadow-sm);
}
.grid-emoji { font-size: 58rpx; }
.grid-name { font-size: 25rpx; color: var(--ink-2); margin-top: 14rpx; font-weight: 500; }
</style>
