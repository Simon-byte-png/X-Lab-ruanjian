// 小屋：主题、可购置的装饰物（emoji），按区域分类
export const THEMES = [
	{ id: 'warm', name: '暖阳米白', bg: 'linear-gradient(180deg,#fff3e0,#ffe9d6)' },
	{ id: 'sky', name: '晴空蓝', bg: 'linear-gradient(180deg,#e3f2fd,#d6ecff)' },
	{ id: 'sakura', name: '樱粉', bg: 'linear-gradient(180deg,#ffe4ee,#ffd6e6)' },
	{ id: 'night', name: '静谧夜', bg: 'linear-gradient(180deg,#e8e6ff,#dcd6ff)' },
	{ id: 'forest', name: '森系绿', bg: 'linear-gradient(180deg,#e5f5e0,#d6f0d6)' }
]

// zone: wall(墙面) / floor(地面) / desk(桌面)
export const SHOP = [
	{ id: 'sofa', name: '双人沙发', emoji: '🛋️', zone: 'floor', price: 30 },
	{ id: 'bed', name: '小床', emoji: '🛏️', zone: 'floor', price: 40 },
	{ id: 'plant', name: '绿植', emoji: '🪴', zone: 'floor', price: 15 },
	{ id: 'lamp', name: '落地灯', emoji: '🪔', zone: 'floor', price: 20 },
	{ id: 'tv', name: '电视', emoji: '📺', zone: 'floor', price: 35 },
	{ id: 'rug', name: '地毯', emoji: '🧶', zone: 'floor', price: 18 },
	{ id: 'clock', name: '挂钟', emoji: '🕰️', zone: 'wall', price: 15 },
	{ id: 'photo', name: '合照墙', emoji: '🖼️', zone: 'wall', price: 25 },
	{ id: 'window', name: '窗户', emoji: '🪟', zone: 'wall', price: 22 },
	{ id: 'balloon', name: '气球', emoji: '🎈', zone: 'wall', price: 12 },
	{ id: 'cake', name: '蛋糕', emoji: '🍰', zone: 'desk', price: 16 },
	{ id: 'coffee', name: '咖啡', emoji: '☕', zone: 'desk', price: 10 },
	{ id: 'books', name: '书本', emoji: '📚', zone: 'desk', price: 14 },
	{ id: 'flower', name: '鲜花', emoji: '💐', zone: 'desk', price: 20 },
	{ id: 'teddy', name: '玩偶熊', emoji: '🧸', zone: 'desk', price: 24 },
	{ id: 'cat', name: '猫咪', emoji: '🐈', zone: 'floor', price: 50 },
	{ id: 'gamepad', name: '游戏机', emoji: '🎮', zone: 'desk', price: 28 },
	{ id: 'guitar', name: '吉他', emoji: '🎸', zone: 'floor', price: 32 }
]

export function getItem(id) {
	return SHOP.find(i => i.id === id) || null
}
