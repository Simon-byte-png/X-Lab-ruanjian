<template>
	<view class="page">
		<!-- 加载 -->
		<view class="center" v-if="loading"><text class="muted">加载中…</text></view>

		<!-- 设置角色 -->
		<scroll-view scroll-y class="setup" v-else-if="!companion">
			<view class="setup-hero">
				<text class="s-emoji">💗</text>
				<text class="s-title">找一个专属于你的 TA</text>
				<text class="s-sub">选一个喜欢的性格，或自己捏一个，TA 会一直陪着你聊天</text>
			</view>

			<view v-if="!showCustom">
				<view class="preset" v-for="p in presets" :key="p.id" @click="pickPreset(p)">
					<text class="p-emoji">{{ p.emoji }}</text>
					<view class="p-body">
						<text class="p-name">{{ p.name }} <text class="p-gender">{{ p.gender }}</text></text>
						<text class="p-persona">{{ p.persona }}</text>
					</view>
				</view>
				<button class="custom-btn" @click="showCustom = true">✨ 自己捏一个 TA</button>
			</view>

			<!-- 自定义 -->
			<view class="custom" v-else>
				<view class="c-row">
					<text class="c-label">头像</text>
					<view class="emoji-pick">
						<text v-for="e in emojiOptions" :key="e" :class="['emo', form.emoji === e ? 'on' : '']" @click="form.emoji = e">{{ e }}</text>
					</view>
				</view>
				<view class="c-field"><text class="c-label">名字</text><input class="c-input" v-model="form.name" placeholder="给 TA 起个名字" placeholder-class="ph" /></view>
				<view class="c-field"><text class="c-label">TA 怎么称呼你</text><input class="c-input" v-model="form.address" placeholder="如：你 / 宝 / 你的名字" placeholder-class="ph" /></view>
				<view class="c-field">
					<text class="c-label">性格设定</text>
					<textarea class="c-textarea" v-model="form.persona" placeholder="描述 TA 的性格、说话风格，如：温柔体贴、爱撒娇、毒舌但关心你…" placeholder-class="ph" />
				</view>
				<view class="c-btns">
					<button class="c-cancel" @click="showCustom = false">返回选择</button>
					<button class="c-create" :loading="creating" @click="createCustom">创建 TA</button>
				</view>
			</view>
		</scroll-view>

		<!-- 聊天 -->
		<view class="chat" v-else>
			<view class="chat-head">
				<text class="ch-emoji">{{ companion.emoji }}</text>
				<view class="ch-info">
					<text class="ch-name">{{ companion.name }}</text>
					<view class="ch-lv">
						<text class="lv-name">Lv.{{ companion.level }} {{ levelName }}</text>
						<view class="lv-bar"><view class="lv-fill" :style="{ width: companion.progress + '%' }"></view></view>
					</view>
				</view>
				<text class="ch-menu" @click="showMenu = true">⋯</text>
			</view>

			<view class="modes">
				<text v-for="m in modes" :key="m.key" :class="['mode', mode === m.key ? 'on' : '']" @click="mode = m.key">{{ m.emoji }} {{ m.name }}</text>
			</view>

			<scroll-view scroll-y class="msgs" :scroll-into-view="scrollInto" :scroll-with-animation="true">
				<view class="msg-wrap">
					<view v-for="(m, i) in messages" :key="i" :id="'m' + i" :class="['msg', m.role === 'user' ? 'me' : 'ta']">
						<text v-if="m.role !== 'user'" class="bubble-emoji">{{ companion.emoji }}</text>
						<view :class="['bubble', m.role === 'user' ? 'b-me' : 'b-ta']">
							<text class="b-text">{{ m.content }}</text>
						</view>
					</view>
					<view class="msg ta" v-if="sending">
						<text class="bubble-emoji">{{ companion.emoji }}</text>
						<view class="bubble b-ta"><text class="b-text typing">正在输入…</text></view>
					</view>
					<view id="bottom" style="height: 8rpx;"></view>
				</view>
			</scroll-view>

			<view class="input-bar">
				<input class="chat-input" v-model="input" :placeholder="'和 ' + companion.name + ' 说点什么…'" placeholder-class="ph" confirm-type="send" @confirm="send" />
				<button class="send" :disabled="sending" @click="send">发送</button>
			</view>
		</view>

		<!-- 菜单 -->
		<view class="mask" v-if="showMenu" @click="showMenu = false"></view>
		<view class="menu" v-if="showMenu">
			<view class="menu-item" @click="clearChat">🧹 清空聊天记录</view>
			<view class="menu-item danger" @click="changeTa">💔 换一个 TA</view>
			<view class="menu-item" @click="showMenu = false">取消</view>
		</view>
	</view>
</template>

<script>
import { api, getToken } from '@/utils/request.js'

export default {
	data() {
		return {
			loading: true,
			companion: null,
			messages: [],
			presets: [],
			modes: [],
			mode: 'chat',
			input: '',
			sending: false,
			showCustom: false,
			creating: false,
			showMenu: false,
			scrollInto: '',
			levelName: '',
			form: { name: '', emoji: '🌸', persona: '', address: '你' },
			emojiOptions: ['🌸', '☀️', '📚', '🐱', '🌙', '🦊', '🐰', '🍓', '⭐', '🎀']
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
				const res = await api.companion()
				if (res.companion) {
					this.companion = res.companion
					this.levelName = res.companion.levelName || ''
					this.messages = (res.messages || []).map(m => ({ role: m.role, content: m.content }))
					this.$nextTick(() => this.scrollBottom())
				} else {
					const p = await api.companionPresets()
					this.presets = p.presets || []
					this.modes = p.modes || []
				}
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async pickPreset(p) {
			await this.doCreate({ presetId: p.id })
		},
		async createCustom() {
			if (!this.form.name.trim()) return uni.showToast({ title: '给 TA 起个名字', icon: 'none' })
			if (!this.form.persona.trim()) return uni.showToast({ title: '描述下 TA 的性格', icon: 'none' })
			this.creating = true
			try {
				await this.doCreate({ name: this.form.name.trim(), emoji: this.form.emoji, persona: this.form.persona.trim(), address: this.form.address.trim() || '你' })
			} finally {
				this.creating = false
			}
		},
		async doCreate(payload) {
			try {
				const res = await api.createCompanion(payload)
				this.companion = res.companion
				this.messages = res.greeting ? [{ role: 'assistant', content: res.greeting }] : []
				if (!this.modes.length) {
					const p = await api.companionPresets(); this.modes = p.modes || []
				}
				this.$nextTick(() => this.scrollBottom())
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			}
		},
		async send() {
			const text = (this.input || '').trim()
			if (!text || this.sending) return
			this.input = ''
			this.messages.push({ role: 'user', content: text })
			this.sending = true
			this.$nextTick(() => this.scrollBottom())
			try {
				const res = await api.companionChat({ message: text, mode: this.mode })
				this.messages.push({ role: 'assistant', content: res.reply })
				if (this.companion) {
					this.companion.level = res.level
					this.companion.progress = res.progress
					this.levelName = res.levelName
				}
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.sending = false
				this.$nextTick(() => this.scrollBottom())
			}
		},
		scrollBottom() {
			this.scrollInto = ''
			this.$nextTick(() => { this.scrollInto = 'bottom' })
		},
		clearChat() {
			this.showMenu = false
			uni.showModal({
				title: '清空聊天', content: '只清空聊天记录，保留 TA 和亲密度', success: async (r) => {
					if (!r.confirm) return
					await api.resetCompanion({})
					this.messages = []
				}
			})
		},
		changeTa() {
			this.showMenu = false
			uni.showModal({
				title: '换一个 TA', content: '会删除当前的 TA、聊天记录和亲密度，确定吗？', success: async (r) => {
					if (!r.confirm) return
					await api.resetCompanion({ deleteAll: true })
					this.companion = null
					this.messages = []
					this.showCustom = false
					this.init()
				}
			})
		}
	}
}
</script>

<style>
.page { height: 100vh; box-sizing: border-box; }
.center { display: flex; height: 60vh; align-items: center; justify-content: center; }
.muted { color: #999; font-size: 28rpx; }

/* 设置 */
.setup { height: 100vh; box-sizing: border-box; padding: 28rpx; background: linear-gradient(180deg, #fff5f6, #fbeef3); }
.setup-hero { display: flex; flex-direction: column; align-items: center; padding: 30rpx 0 40rpx; }
.s-emoji { font-size: 100rpx; }
.s-title { font-size: 36rpx; font-weight: 800; color: #333; margin-top: 16rpx; }
.s-sub { font-size: 25rpx; color: #999; margin-top: 12rpx; text-align: center; padding: 0 30rpx; line-height: 1.6; }
.preset { display: flex; align-items: center; background: #fff; border-radius: 24rpx; padding: 30rpx; margin-bottom: 20rpx; box-shadow: 0 6rpx 20rpx rgba(200,110,130,0.09); }
.p-emoji { font-size: 66rpx; margin-right: 24rpx; }
.p-body { flex: 1; }
.p-name { font-size: 32rpx; font-weight: 700; color: #333; }
.p-gender { font-size: 22rpx; color: #ff9aa8; background: #fff0f2; padding: 2rpx 12rpx; border-radius: 12rpx; margin-left: 10rpx; }
.p-persona { display: block; font-size: 25rpx; color: #888; margin-top: 10rpx; line-height: 1.6; }
.custom-btn { margin-top: 10rpx; background: #fff; color: #ff6b81; border: 2rpx dashed #ffb3c0; border-radius: 24rpx; font-size: 30rpx; }
.custom-btn::after { border: none; }

.custom { background: #fff; border-radius: 24rpx; padding: 32rpx; }
.c-row { margin-bottom: 24rpx; }
.c-field { margin-bottom: 24rpx; }
.c-label { font-size: 26rpx; color: #666; }
.emoji-pick { display: flex; flex-wrap: wrap; margin-top: 14rpx; }
.emo { font-size: 46rpx; padding: 10rpx; margin: 6rpx; border-radius: 14rpx; }
.emo.on { background: #fff0f2; }
.c-input { margin-top: 12rpx; height: 84rpx; background: #f7f7f9; border-radius: 14rpx; padding: 0 26rpx; font-size: 29rpx; }
.c-textarea { margin-top: 12rpx; width: 100%; height: 180rpx; background: #f7f7f9; border-radius: 14rpx; padding: 20rpx 26rpx; font-size: 28rpx; box-sizing: border-box; }
.ph { color: #bbb; }
.c-btns { display: flex; margin-top: 10rpx; }
.c-cancel { flex: 1; background: #f2f2f2; color: #666; border-radius: 44rpx; margin-right: 18rpx; border: none; }
.c-create { flex: 1; background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff; border-radius: 44rpx; border: none; }
.c-cancel::after, .c-create::after { border: none; }

/* 聊天 */
.chat { height: 100vh; display: flex; flex-direction: column; background: #f6f6f8; }
.chat-head { display: flex; align-items: center; padding: 20rpx 28rpx; background: #fff; box-shadow: 0 2rpx 12rpx rgba(200,110,130,0.08); }
.ch-emoji { font-size: 60rpx; margin-right: 20rpx; }
.ch-info { flex: 1; }
.ch-name { font-size: 32rpx; font-weight: 700; color: #333; }
.ch-lv { display: flex; align-items: center; margin-top: 8rpx; }
.lv-name { font-size: 22rpx; color: #ff6b81; margin-right: 14rpx; white-space: nowrap; }
.lv-bar { flex: 1; height: 10rpx; background: #f0e0e4; border-radius: 6rpx; overflow: hidden; max-width: 240rpx; }
.lv-fill { height: 100%; background: linear-gradient(90deg, #ff9aa8, #ff5470); }
.ch-menu { font-size: 44rpx; color: #999; padding: 0 10rpx; }

.modes { display: flex; padding: 16rpx 20rpx; background: #fff; overflow-x: auto; white-space: nowrap; border-top: 2rpx solid #f5f5f5; }
.mode { display: inline-block; font-size: 24rpx; color: #888; background: #f2f2f4; border-radius: 30rpx; padding: 10rpx 22rpx; margin-right: 14rpx; }
.mode.on { background: #ffe3e9; color: #ff5470; font-weight: 600; }

.msgs { flex: 1; padding: 24rpx; box-sizing: border-box; }
.msg-wrap { display: flex; flex-direction: column; }
.msg { display: flex; margin-bottom: 24rpx; align-items: flex-start; }
.msg.me { justify-content: flex-end; }
.bubble-emoji { font-size: 48rpx; margin-right: 14rpx; }
.bubble { max-width: 72%; padding: 22rpx 26rpx; border-radius: 24rpx; }
.b-ta { background: #fff; border-top-left-radius: 6rpx; }
.b-me { background: linear-gradient(135deg, #ff8a9b, #f24c68); border-top-right-radius: 6rpx; }
.b-text { font-size: 29rpx; line-height: 1.55; color: #333; }
.b-me .b-text { color: #fff; }
.typing { color: #bbb; }

.input-bar { display: flex; align-items: center; padding: 16rpx 20rpx; background: #fff; box-shadow: 0 -2rpx 12rpx rgba(200,110,130,0.08); }
.chat-input { flex: 1; height: 76rpx; background: #f2f2f4; border-radius: 38rpx; padding: 0 30rpx; font-size: 29rpx; }
.send { margin-left: 16rpx; background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff; font-size: 28rpx; border-radius: 38rpx; border: none; padding: 0 36rpx; line-height: 2.7; }
.send::after { border: none; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 10; }
.menu { position: fixed; left: 40rpx; right: 40rpx; bottom: 60rpx; z-index: 11; background: #fff; border-radius: 24rpx; overflow: hidden; }
.menu-item { text-align: center; font-size: 30rpx; color: #333; padding: 32rpx; border-bottom: 2rpx solid #f5f5f5; }
.menu-item.danger { color: #ff5470; }
</style>
