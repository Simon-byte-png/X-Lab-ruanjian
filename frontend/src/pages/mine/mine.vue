<template>
	<view class="page lz-with-tabbar">
		<!-- 资料卡 -->
		<view class="profile">
			<text class="avatar">{{ me.status === 'couple' ? '💑' : '🙂' }}</text>
			<text class="name">{{ me.nickname || me.username }}</text>
			<text class="uid">@{{ me.username }}</text>
			<text class="badge">{{ me.status === 'couple' ? '恋爱中' : '单身' }}</text>
		</view>

		<!-- 情侣状态 -->
		<view class="block" v-if="me.status === 'couple' && partner">
			<text class="block-title">你的另一半</text>
			<view class="partner">
				<text class="p-emoji">❤️</text>
				<view class="p-info">
					<text class="p-name">{{ partner.nickname || partner.username }}</text>
					<text class="p-uid">@{{ partner.username }}</text>
				</view>
			</view>
			<view class="anni-row">
				<text class="anni-label">恋爱纪念日</text>
				<picker mode="date" :value="anniversary || ''" @change="onAnni">
					<text class="anni-val">{{ anniversary || '点击设置' }}</text>
				</picker>
			</view>
			<text class="together" v-if="together !== null">已经相恋 {{ together }} 天啦 🎉</text>
			<button class="danger" @click="unbind">解除绑定</button>
		</view>

		<!-- 单身：绑定 -->
		<view class="block" v-else>
			<text class="block-title">绑定另一半</text>
			<text class="tip">和 TA 组成情侣，解锁纪念日、每日任务等双人玩法</text>

			<view class="bind-part">
				<text class="part-label">① 生成我的邀请码，发给 TA</text>
				<view class="code-row">
					<text class="code">{{ myCode || '— — — —' }}</text>
					<button class="code-btn" :loading="codeLoading" @click="genCode">生成</button>
				</view>
				<text class="copy" v-if="myCode" @click="copyCode">复制邀请码</text>
			</view>

			<view class="bind-part">
				<text class="part-label">② 或输入 TA 的邀请码绑定</text>
				<view class="code-row">
					<input class="code-input" v-model="inputCode" placeholder="输入 6 位邀请码" placeholder-class="ph" />
					<button class="code-btn" :loading="bindLoading" @click="doBind">绑定</button>
				</view>
			</view>
		</view>

		<!-- 昵称 -->
		<view class="block">
			<text class="block-title">修改昵称</text>
			<view class="code-row">
				<input class="code-input" v-model="editNick" placeholder="新的昵称" placeholder-class="ph" />
				<button class="code-btn" @click="saveNick">保存</button>
			</view>
		</view>

		<button class="logout" @click="logout">退出登录</button>

		<TabBar :current="3" />
	</view>
</template>

<script>
import { api, getToken, clearToken } from '@/utils/request.js'
import TabBar from '@/components/TabBar.vue'

export default {
	components: { TabBar },
	data() {
		return {
			me: {},
			partner: null,
			together: null,
			anniversary: '',
			myCode: '',
			inputCode: '',
			editNick: '',
			codeLoading: false,
			bindLoading: false
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
				this.anniversary = res.anniversary || ''
				this.editNick = this.me.nickname || ''
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			}
		},
		async genCode() {
			this.codeLoading = true
			try {
				const res = await api.invite()
				this.myCode = res.code
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.codeLoading = false
			}
		},
		copyCode() {
			uni.setClipboardData({ data: this.myCode, success: () => uni.showToast({ title: '已复制' }) })
		},
		async doBind() {
			const code = (this.inputCode || '').trim().toUpperCase()
			if (!code) return uni.showToast({ title: '请输入邀请码', icon: 'none' })
			this.bindLoading = true
			try {
				await api.bind({ code })
				uni.showToast({ title: '绑定成功 💗' })
				this.load()
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.bindLoading = false
			}
		},
		onAnni(e) {
			const date = e.detail.value
			api.setAnniversary({ date }).then(() => {
				this.anniversary = date
				this.load()
			}).catch(err => uni.showToast({ title: err.message, icon: 'none' }))
		},
		unbind() {
			uni.showModal({
				title: '解除绑定', content: '确定要解除情侣关系吗？',
				success: async (r) => {
					if (!r.confirm) return
					try {
						await api.unbind()
						uni.showToast({ title: '已解除' })
						this.load()
					} catch (e) {
						uni.showToast({ title: e.message, icon: 'none' })
					}
				}
			})
		},
		async saveNick() {
			const nickname = (this.editNick || '').trim()
			if (!nickname) return uni.showToast({ title: '昵称不能为空', icon: 'none' })
			try {
				await api.updateProfile({ nickname })
				uni.showToast({ title: '已保存' })
				this.load()
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			}
		},
		logout() {
			clearToken()
			uni.reLaunch({ url: '/pages/login/login' })
		}
	}
}
</script>

<style>
.page { padding: 24rpx 28rpx 80rpx; }
.profile { display: flex; flex-direction: column; align-items: center; padding: 40rpx 0 24rpx; }
.avatar { font-size: 96rpx; }
.name { font-size: 38rpx; font-weight: 700; color: #333; margin-top: 12rpx; }
.uid { font-size: 24rpx; color: #aaa; margin-top: 6rpx; }
.badge { font-size: 22rpx; color: #ff6b81; background: #fff0f2; padding: 4rpx 20rpx; border-radius: 20rpx; margin-top: 14rpx; }

.block { background: #fff; border-radius: 24rpx; padding: 32rpx; margin-top: 24rpx; box-shadow: 0 6rpx 20rpx rgba(200,110,130,0.08); }
.block-title { font-size: 30rpx; font-weight: 700; color: #333; }
.tip { display: block; font-size: 24rpx; color: #aaa; margin-top: 12rpx; }

.partner { display: flex; align-items: center; margin-top: 20rpx; }
.p-emoji { font-size: 48rpx; margin-right: 20rpx; }
.p-name { font-size: 32rpx; color: #333; font-weight: 600; }
.p-uid { display: block; font-size: 24rpx; color: #aaa; margin-top: 4rpx; }
.anni-row { display: flex; justify-content: space-between; align-items: center; margin-top: 28rpx; padding-top: 24rpx; border-top: 2rpx solid #f2f2f2; }
.anni-label { font-size: 28rpx; color: #666; }
.anni-val { font-size: 28rpx; color: #ff6b81; }
.together { display: block; font-size: 26rpx; color: #ff6b81; margin-top: 20rpx; text-align: center; }

.bind-part { margin-top: 28rpx; }
.part-label { font-size: 26rpx; color: #666; }
.code-row { display: flex; align-items: center; margin-top: 16rpx; }
.code { flex: 1; font-size: 40rpx; font-weight: 800; letter-spacing: 8rpx; color: #ff6b81; background: #fff0f2; border-radius: 14rpx; padding: 16rpx 24rpx; text-align: center; }
.code-input { flex: 1; height: 80rpx; background: #f7f7f9; border-radius: 14rpx; padding: 0 24rpx; font-size: 30rpx; }
.code-btn { margin-left: 16rpx; background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff; font-size: 26rpx; border-radius: 40rpx; border: none; line-height: 2.6; padding: 0 30rpx; }
.code-btn::after { border: none; }
.copy { display: inline-block; font-size: 24rpx; color: #ff9aa8; margin-top: 14rpx; }
.ph { color: #bbb; }

.danger { margin-top: 32rpx; background: #fff0f2; color: #ff5470; border-radius: 44rpx; border: none; font-size: 28rpx; }
.danger::after { border: none; }
.logout { margin-top: 40rpx; background: #f2f2f2; color: #888; border-radius: 44rpx; border: none; font-size: 28rpx; }
.logout::after { border: none; }
</style>
