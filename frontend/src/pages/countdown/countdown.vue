<template>
	<view class="page lz-with-tabbar">
		<view class="add-bar">
			<button class="add-btn" @click="showAdd = true">+ 新增日子</button>
		</view>

		<view class="list" v-if="list.length">
			<view class="item" v-for="c in sorted" :key="c.id">
				<view class="item-main">
					<text class="title">{{ c.title }}</text>
					<text class="date">{{ c.target_date }} · {{ c.shared ? '两人共享' : '仅自己' }}</text>
				</view>
				<view class="num-box">
					<text class="num">{{ Math.abs(c.days) }}</text>
					<text class="unit">{{ c.days > 0 ? '天后' : (c.days < 0 ? '已过' + '天' : '今天') }}</text>
				</view>
				<text class="del" @click="remove(c)">删除</text>
			</view>
		</view>
		<view class="empty" v-else>
			<text class="e1">🗓️</text>
			<text class="e2">还没有记录任何日子</text>
			<text class="e3">纪念日、生日、考试倒计时都可以记在这里</text>
		</view>

		<!-- 新增弹层 -->
		<view class="mask" v-if="showAdd" @click="showAdd = false"></view>
		<view class="sheet" v-if="showAdd">
			<text class="sheet-title">新增日子</text>
			<view class="row">
				<text class="rlabel">名称</text>
				<input class="rinput" v-model="form.title" placeholder="如：恋爱纪念日" placeholder-class="ph" />
			</view>
			<view class="row">
				<text class="rlabel">日期</text>
				<picker mode="date" :value="form.date" @change="onDate">
					<view class="picker-val">{{ form.date || '点击选择日期' }}</view>
				</picker>
			</view>
			<view class="row" v-if="me.status === 'couple'">
				<text class="rlabel">共享给 TA</text>
				<switch :checked="form.shared" color="#ff6b81" @change="e => form.shared = e.detail.value" />
			</view>
			<view class="sheet-btns">
				<button class="cancel" @click="showAdd = false">取消</button>
				<button class="save" :loading="saving" @click="save">保存</button>
			</view>
		</view>

		<TabBar :current="1" />
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
			list: [],
			showAdd: false,
			saving: false,
			form: { title: '', date: '', shared: true }
		}
	},
	computed: {
		sorted() {
			return [...this.list].sort((a, b) => Math.abs(a.days) - Math.abs(b.days))
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
				const meRes = await api.me()
				this.me = meRes.user || {}
				const res = await api.countdowns()
				this.list = res.list || []
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			}
		},
		onDate(e) { this.form.date = e.detail.value },
		async save() {
			if (!this.form.title.trim()) return uni.showToast({ title: '请填名称', icon: 'none' })
			if (!this.form.date) return uni.showToast({ title: '请选日期', icon: 'none' })
			this.saving = true
			try {
				await api.addCountdown({
					title: this.form.title.trim(),
					target_date: this.form.date,
					shared: this.me.status === 'couple' ? this.form.shared : false
				})
				this.showAdd = false
				this.form = { title: '', date: '', shared: true }
				this.load()
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.saving = false
			}
		},
		remove(c) {
			uni.showModal({
				title: '删除', content: '确定删除「' + c.title + '」？',
				success: async (r) => {
					if (!r.confirm) return
					try {
						await api.delCountdown(c.id)
						this.load()
					} catch (e) {
						uni.showToast({ title: e.message, icon: 'none' })
					}
				}
			})
		}
	}
}
</script>

<style>
.page { padding: 24rpx 28rpx 60rpx; min-height: 100vh; }
.add-bar { padding: 8rpx 0 20rpx; }
.add-btn {
	background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff;
	font-size: 30rpx; border-radius: 44rpx; border: none;
}
.add-btn::after { border: none; }

.item {
	background: #fff; border-radius: 20rpx; padding: 28rpx 28rpx;
	display: flex; align-items: center; margin-bottom: 16rpx;
	box-shadow: 0 6rpx 20rpx rgba(200,110,130,0.08);
}
.item-main { flex: 1; }
.title { font-size: 30rpx; font-weight: 600; color: #333; }
.date { display: block; font-size: 24rpx; color: #aaa; margin-top: 8rpx; }
.num-box { display: flex; flex-direction: column; align-items: center; margin-right: 24rpx; }
.num { font-size: 44rpx; font-weight: 800; color: #ff6b81; line-height: 1; }
.unit { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.del { font-size: 24rpx; color: #ccc; }

.empty { display: flex; flex-direction: column; align-items: center; padding-top: 160rpx; }
.e1 { font-size: 100rpx; }
.e2 { font-size: 30rpx; color: #666; margin-top: 20rpx; }
.e3 { font-size: 24rpx; color: #bbb; margin-top: 12rpx; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 10; }
.sheet {
	position: fixed; left: 0; right: 0; bottom: 0; z-index: 11;
	background: #fff; border-radius: 28rpx 28rpx 0 0; padding: 40rpx 40rpx 60rpx;
}
.sheet-title { font-size: 34rpx; font-weight: 700; color: #333; text-align: center; display: block; }
.row { display: flex; align-items: center; margin-top: 36rpx; }
.rlabel { width: 160rpx; font-size: 28rpx; color: #666; }
.rinput { flex: 1; height: 80rpx; background: #f7f7f9; border-radius: 14rpx; padding: 0 24rpx; font-size: 28rpx; }
.picker-val { flex: 1; height: 80rpx; line-height: 80rpx; background: #f7f7f9; border-radius: 14rpx; padding: 0 24rpx; font-size: 28rpx; color: #333; }
.ph { color: #bbb; }
.sheet-btns { display: flex; margin-top: 48rpx; }
.cancel { flex: 1; background: #f2f2f2; color: #666; border-radius: 44rpx; margin-right: 20rpx; border: none; }
.save { flex: 1; background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff; border-radius: 44rpx; border: none; }
.cancel::after, .save::after { border: none; }
</style>
