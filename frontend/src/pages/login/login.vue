<template>
	<view class="page">
		<view class="hero">
			<image class="logo" src="/static/logo.png" mode="aspectFit"></image>
			<text class="app-name">爱在浙大</text>
			<text class="slogan">浙大情侣专属 · 把心动好好收藏</text>
		</view>

		<view class="card">
			<view class="tabs">
				<text :class="['tab', mode === 'login' ? 'active' : '']" @click="mode = 'login'">登录</text>
				<text :class="['tab', mode === 'register' ? 'active' : '']" @click="mode = 'register'">注册</text>
			</view>

			<view class="field">
				<text class="label">账号</text>
				<input class="input" v-model="username" placeholder="用户名(字母/数字)" placeholder-class="ph" />
			</view>
			<view class="field" v-if="mode === 'register'">
				<text class="label">昵称</text>
				<input class="input" v-model="nickname" placeholder="怎么称呼你" placeholder-class="ph" />
			</view>
			<view class="field">
				<text class="label">密码</text>
				<input class="input" v-model="password" password placeholder="至少 6 位" placeholder-class="ph" />
			</view>

			<button class="btn" :loading="loading" @click="submit">
				{{ mode === 'login' ? '登录' : '注册并登录' }}
			</button>
			<text class="hint">注册后可在「我的」里绑定另一半 💑</text>
		</view>
	</view>
</template>

<script>
import { api, setToken, getToken } from '@/utils/request.js'

export default {
	data() {
		return {
			mode: 'login',
			username: '',
			nickname: '',
			password: '',
			loading: false
		}
	},
	onShow() {
		// 已登录直接进首页
		if (getToken()) {
			uni.reLaunch({ url: '/pages/home/home' })
		}
	},
	methods: {
		async submit() {
			const username = (this.username || '').trim()
			const password = this.password || ''
			if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
				return uni.showToast({ title: '账号需3-20位字母/数字', icon: 'none' })
			}
			if (password.length < 6) {
				return uni.showToast({ title: '密码至少6位', icon: 'none' })
			}
			this.loading = true
			try {
				const payload = this.mode === 'register'
					? { username, password, nickname: (this.nickname || '').trim() }
					: { username, password }
				const res = this.mode === 'register'
					? await api.register(payload)
					: await api.login(payload)
				setToken(res.token)
				uni.reLaunch({ url: '/pages/home/home' })
			} catch (e) {
				uni.showToast({ title: e.message || '操作失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		}
	}
}
</script>

<style>
.page {
	min-height: 100vh;
	background: linear-gradient(160deg, #ff9aa8 0%, #ff6b81 45%, #ff5470 100%);
	padding: 0 48rpx;
	box-sizing: border-box;
}
.hero {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 180rpx;
	padding-bottom: 60rpx;
}
.logo {
	width: 148rpx;
	height: 148rpx;
	border-radius: 36rpx;
	box-shadow: 0 18rpx 46rpx rgba(17, 72, 127, 0.22);
}
.app-name {
	font-size: 56rpx;
	color: #fff;
	font-weight: 700;
	margin-top: 12rpx;
	letter-spacing: 4rpx;
}
.slogan {
	font-size: 26rpx;
	color: rgba(255, 255, 255, 0.9);
	margin-top: 16rpx;
}
.card {
	background: #fff;
	border-radius: 32rpx;
	padding: 48rpx 40rpx 56rpx;
	box-shadow: 0 20rpx 60rpx rgba(255, 84, 112, 0.25);
}
.tabs {
	display: flex;
	margin-bottom: 40rpx;
}
.tab {
	flex: 1;
	text-align: center;
	font-size: 34rpx;
	color: #999;
	padding-bottom: 16rpx;
	border-bottom: 4rpx solid transparent;
}
.tab.active {
	color: #ff5470;
	font-weight: 700;
	border-bottom-color: #ff5470;
}
.field { margin-bottom: 32rpx; }
.label { font-size: 26rpx; color: #888; }
.input {
	margin-top: 12rpx;
	height: 88rpx;
	background: #f7f7f9;
	border-radius: 16rpx;
	padding: 0 28rpx;
	font-size: 30rpx;
}
.ph { color: #bbb; }
.btn {
	margin-top: 16rpx;
	background: linear-gradient(135deg, #ff8a9b, #f24c68);
	color: #fff;
	font-size: 32rpx;
	border-radius: 44rpx;
	border: none;
}
.btn::after { border: none; }
.hint {
	display: block;
	text-align: center;
	font-size: 24rpx;
	color: #bbb;
	margin-top: 28rpx;
}
</style>
