<script>
export default {
  onLaunch: function () {
    console.log('App Launch')
  },
  onShow: function () {
    console.log('App Show')
  },
  onHide: function () {
    console.log('App Hide')
  },
}
</script>

<style>
/* ===== 爱在浙里 · 全局设计系统 ===== */
page {
	/* 主色：玫瑰金/珊瑚粉渐变，比纯粉更高级 */
	--rose: #ff6b81;
	--rose-deep: #f24c68;
	--rose-soft: #ffb3c0;
	--gold: #e8b06b;
	--ink: #2b2530;        /* 主文字，带一点暖调深灰而非纯黑 */
	--ink-2: #6b6472;      /* 次级文字 */
	--ink-3: #a8a2b0;      /* 弱化文字 */
	--cream: #fbf7f4;      /* 奶油底 */
	--card: #ffffff;
	--line: #f0eaee;
	--grad-rose: linear-gradient(135deg, #ff8a9b 0%, #ff6b81 50%, #f24c68 100%);
	--grad-warm: linear-gradient(135deg, #ffd9a8, #ffb0a0);
	--shadow-sm: 0 4rpx 16rpx rgba(180, 120, 140, 0.08);
	--shadow-md: 0 12rpx 40rpx rgba(200, 110, 130, 0.12);
	--shadow-lg: 0 20rpx 60rpx rgba(220, 90, 120, 0.18);
	background: var(--cream);
	color: var(--ink);
	font-family: -apple-system, "PingFang SC", "Helvetica Neue", Helvetica, sans-serif;
}

/* 通用工具类（各页面可直接用） */
.lz-card {
	background: var(--card);
	border-radius: 28rpx;
	box-shadow: var(--shadow-md);
}
.lz-btn {
	background: var(--grad-rose);
	color: #fff;
	border-radius: 999rpx;
	border: none;
	font-weight: 600;
	box-shadow: 0 10rpx 26rpx rgba(242, 76, 104, 0.28);
}
.lz-btn::after { border: none; }
.lz-btn-ghost {
	background: #fff;
	color: var(--rose);
	border: 2rpx solid var(--rose-soft);
	border-radius: 999rpx;
}
.lz-btn-ghost::after { border: none; }
.lz-title { font-size: 34rpx; font-weight: 800; color: var(--ink); letter-spacing: 0.5rpx; }
.lz-muted { color: var(--ink-3); font-size: 24rpx; }

/* 给底部自定义导航留出空间的页面容器 */
.lz-page { min-height: 100vh; box-sizing: border-box; }
.lz-with-tabbar { padding-bottom: 140rpx; }
</style>
