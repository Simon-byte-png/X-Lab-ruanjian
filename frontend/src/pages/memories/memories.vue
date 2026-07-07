<template>
	<view class="page lz-with-tabbar">
		<view class="notice" v-if="me.status && me.status !== 'couple'">
			<text class="n-emoji">📖</text>
			<text class="n-title">绑定另一半后一起记录回忆</text>
			<text class="n-sub">把你们的每一个心动瞬间收进纪念本</text>
			<button class="prim" @click="goMine">去绑定</button>
		</view>

		<template v-else-if="me.status === 'couple'">
			<view class="add-bar">
				<button class="add-btn" @click="openAdd">+ 记录一段回忆</button>
			</view>

			<view class="timeline" v-if="list.length">
				<view class="mem" v-for="m in list" :key="m.id">
					<view class="dot"></view>
					<view class="card">
						<image v-if="m.photoUrl" class="photo" :src="m.photoUrl" mode="widthFix" @click="preview(m.photoUrl)"></image>
						<view class="card-body">
							<view class="card-head">
								<text class="m-title">{{ m.title }}</text>
								<text class="m-del" @click="remove(m)">删除</text>
							</view>
							<text class="m-date">{{ m.memDate }}</text>
							<text class="m-body" v-if="m.body">{{ m.body }}</text>
						</view>
					</view>
				</view>
			</view>
			<view class="empty" v-else>
				<text class="e1">📷</text>
				<text class="e2">还没有记录任何回忆</text>
				<text class="e3">第一次约会、一起看的电影、旅行…都记下来吧</text>
			</view>
		</template>

		<!-- 发布弹层 -->
		<view class="mask" v-if="showAdd" @click="closeAdd"></view>
		<view class="sheet" v-if="showAdd">
			<text class="sheet-title">记录回忆</text>
			<view class="photo-pick" @click="pickPhoto">
				<image v-if="form.photoUrl" class="pick-img" :src="form.photoUrl" mode="aspectFill"></image>
				<view v-else class="pick-empty">
					<text class="pick-plus" v-if="!uploading">＋</text>
					<text class="pick-txt">{{ uploading ? '上传中…' : '添加照片' }}</text>
				</view>
			</view>
			<input class="s-input" v-model="form.title" placeholder="标题，如：第一次一起看海" placeholder-class="ph" />
			<picker mode="date" :value="form.memDate" @change="e => form.memDate = e.detail.value">
				<view class="s-picker">{{ form.memDate || '选择日期' }}</view>
			</picker>
			<textarea class="s-textarea" v-model="form.body" placeholder="写点什么，记录当时的心情…" placeholder-class="ph" />
			<view class="s-btns">
				<button class="s-cancel" @click="closeAdd">取消</button>
				<button class="s-save" :loading="saving" @click="save">保存</button>
			</view>
		</view>

		<TabBar :current="2" />
	</view>
</template>

<script>
import { api, getToken, uploadFile } from '@/utils/request.js'
import TabBar from '@/components/TabBar.vue'

export default {
	components: { TabBar },
	data() {
		return {
			me: {},
			list: [],
			showAdd: false,
			saving: false,
			uploading: false,
			form: { title: '', body: '', photoUrl: '', memDate: '' }
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
				const res = await api.memories()
				this.list = res.list || []
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			}
		},
		openAdd() {
			this.form = { title: '', body: '', photoUrl: '', memDate: '' }
			this.showAdd = true
		},
		closeAdd() { this.showAdd = false },
		pickPhoto() {
			uni.chooseImage({
				count: 1, sizeType: ['compressed'],
				success: async (r) => {
					const fp = r.tempFilePaths[0]
					this.uploading = true
					try {
						this.form.photoUrl = await uploadFile(fp)
					} catch (e) {
						uni.showToast({ title: e.message, icon: 'none' })
					} finally {
						this.uploading = false
					}
				}
			})
		},
		preview(url) { uni.previewImage({ urls: [url] }) },
		async save() {
			if (!this.form.title.trim()) return uni.showToast({ title: '写个标题吧', icon: 'none' })
			if (!this.form.memDate) return uni.showToast({ title: '选择日期', icon: 'none' })
			this.saving = true
			try {
				await api.addMemory({ title: this.form.title.trim(), body: this.form.body.trim(), photoUrl: this.form.photoUrl, memDate: this.form.memDate })
				this.showAdd = false
				this.init()
			} catch (e) {
				uni.showToast({ title: e.message, icon: 'none' })
			} finally {
				this.saving = false
			}
		},
		remove(m) {
			uni.showModal({
				title: '删除', content: '确定删除「' + m.title + '」？', success: async (r) => {
					if (!r.confirm) return
					await api.delMemory(m.id)
					this.init()
				}
			})
		},
		goMine() { uni.reLaunch({ url: '/pages/mine/mine' }) }
	}
}
</script>

<style>
.page { min-height: 100vh; padding: 24rpx 28rpx 60rpx; }
.notice { display: flex; flex-direction: column; align-items: center; padding-top: 140rpx; }
.n-emoji { font-size: 96rpx; width: 190rpx; height: 190rpx; line-height: 190rpx; text-align: center; border-radius: 50%; background: linear-gradient(135deg, #fff0f2, #ffe0e6); box-shadow: 0 14rpx 44rpx rgba(242,76,104,0.13); }
.n-title { font-size: 32rpx; font-weight: 700; color: #333; margin-top: 24rpx; }
.n-sub { font-size: 26rpx; color: #999; margin-top: 12rpx; text-align: center; }
.prim { margin-top: 40rpx; background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff; font-size: 30rpx; border-radius: 44rpx; border: none; padding: 0 80rpx; }
.prim::after { border: none; }

.add-bar { padding: 8rpx 0 24rpx; }
.add-btn { background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff; font-size: 30rpx; border-radius: 44rpx; border: none; }
.add-btn::after { border: none; }

.timeline { position: relative; padding-left: 30rpx; }
.mem { position: relative; padding-left: 30rpx; padding-bottom: 32rpx; border-left: 3rpx solid #ffd0da; }
.mem:last-child { border-left: 3rpx solid transparent; }
.dot { position: absolute; left: -11rpx; top: 6rpx; width: 20rpx; height: 20rpx; background: #ff6b81; border-radius: 50%; border: 4rpx solid #fff; }
.card { background: #fff; border-radius: 22rpx; overflow: hidden; box-shadow: 0 6rpx 20rpx rgba(200,110,130,0.09); }
.photo { width: 100%; display: block; }
.card-body { padding: 26rpx 28rpx; }
.card-head { display: flex; justify-content: space-between; align-items: center; }
.m-title { font-size: 31rpx; font-weight: 700; color: #333; }
.m-del { font-size: 24rpx; color: #ccc; }
.m-date { display: block; font-size: 24rpx; color: #ff9aa8; margin-top: 8rpx; }
.m-body { display: block; font-size: 27rpx; color: #666; margin-top: 14rpx; line-height: 1.7; }

.empty { display: flex; flex-direction: column; align-items: center; padding-top: 150rpx; }
.e1 { font-size: 100rpx; }
.e2 { font-size: 30rpx; color: #666; margin-top: 20rpx; }
.e3 { font-size: 24rpx; color: #bbb; margin-top: 12rpx; text-align: center; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 10; }
.sheet { position: fixed; left: 0; right: 0; bottom: 0; z-index: 11; background: #fff; border-radius: 28rpx 28rpx 0 0; padding: 36rpx 36rpx 60rpx; }
.sheet-title { font-size: 34rpx; font-weight: 700; color: #333; text-align: center; display: block; margin-bottom: 28rpx; }
.photo-pick { width: 100%; height: 300rpx; background: #f6f6f8; border-radius: 18rpx; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.pick-img { width: 100%; height: 100%; }
.pick-empty { display: flex; flex-direction: column; align-items: center; }
.pick-plus { font-size: 60rpx; color: #ccc; }
.pick-txt { font-size: 26rpx; color: #aaa; margin-top: 6rpx; }
.s-input { height: 84rpx; background: #f7f7f9; border-radius: 14rpx; padding: 0 26rpx; font-size: 29rpx; margin-bottom: 20rpx; }
.s-picker { height: 84rpx; line-height: 84rpx; background: #f7f7f9; border-radius: 14rpx; padding: 0 26rpx; font-size: 29rpx; color: #333; margin-bottom: 20rpx; }
.ph { color: #bbb; }
.s-textarea { width: 100%; height: 160rpx; background: #f7f7f9; border-radius: 14rpx; padding: 20rpx 26rpx; font-size: 28rpx; box-sizing: border-box; }
.s-btns { display: flex; margin-top: 28rpx; }
.s-cancel { flex: 1; background: #f2f2f2; color: #666; border-radius: 44rpx; margin-right: 18rpx; border: none; }
.s-save { flex: 1; background: linear-gradient(135deg, #ff8a9b, #f24c68); color: #fff; border-radius: 44rpx; border: none; }
.s-cancel::after, .s-save::after { border: none; }
</style>
