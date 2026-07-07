// 统一请求封装
// H5(网页/预览)：接口地址相对当前页面推导，兼容 /preview/<会话>/<端口>/ 子路径，避免硬编码
// 小程序/App：需指向已部署的后端域名(上线后填写)
function apiBase() {
	// #ifdef H5
	// 以当前页面地址为基准解析出 .../api/，无论部署在根目录还是子路径都成立
	return new URL('api/', window.location.href).href
	// #endif
	// #ifndef H5
	// 小程序/App 后端地址。当前指向已部署的线上后端(可在微信开发者工具"不校验合法域名"下直接联调看效果)。
	// 正式发布小程序时，请换成你自己的、已备案的 https 域名(见 WECHAT.md)。
	return 'http://3250105888-love-in-zju.apps.zaowuyun.com/api/'
	// #endif
}

const TOKEN_KEY = 'lz_token'

export function getToken() {
	return uni.getStorageSync(TOKEN_KEY) || ''
}
export function setToken(t) {
	if (t) uni.setStorageSync(TOKEN_KEY, t)
}
export function clearToken() {
	uni.removeStorageSync(TOKEN_KEY)
}

export function request(path, { method = 'GET', data } = {}) {
	const url = apiBase() + path.replace(/^\//, '')
	const header = { 'Content-Type': 'application/json' }
	const token = getToken()
	if (token) header['Authorization'] = 'Bearer ' + token
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method,
			data,
			header,
			success: (res) => {
				const body = res.data || {}
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(body)
				} else {
					if (res.statusCode === 401) {
						clearToken()
					}
					reject(new Error(body.error || ('请求失败(' + res.statusCode + ')')))
				}
			},
			fail: (err) => reject(new Error(err.errMsg || '网络错误'))
		})
	})
}

export const api = {
	register: (data) => request('auth/register', { method: 'POST', data }),
	login: (data) => request('auth/login', { method: 'POST', data }),
	me: () => request('me'),
	updateProfile: (data) => request('me', { method: 'PUT', data }),
	invite: () => request('couple/invite', { method: 'POST' }),
	bind: (data) => request('couple/bind', { method: 'POST', data }),
	unbind: () => request('couple/unbind', { method: 'POST' }),
	setAnniversary: (data) => request('couple/anniversary', { method: 'POST', data }),
	countdowns: () => request('countdowns'),
	addCountdown: (data) => request('countdowns', { method: 'POST', data }),
	delCountdown: (id) => request('countdowns/' + id, { method: 'DELETE' }),
	// AI 算命
	fortune: (data) => request('ai/fortune', { method: 'POST', data }),
	// 匹配度测试
	quizList: () => request('quiz/list'),
	quiz: (id) => request('quiz/' + id),
	quizAnswer: (id, data) => request('quiz/' + id + '/answer', { method: 'POST', data }),
	quizResult: (id) => request('quiz/' + id + '/result'),
	// 每日任务
	tasksToday: () => request('tasks/today'),
	toggleTask: (id) => request('tasks/' + id + '/toggle', { method: 'POST' }),
	refreshTasks: () => request('tasks/refresh', { method: 'POST' }),
	// AI 陪伴
	companionPresets: () => request('companion/presets'),
	companion: () => request('companion'),
	createCompanion: (data) => request('companion', { method: 'POST', data }),
	companionChat: (data) => request('companion/chat', { method: 'POST', data }),
	resetCompanion: (data) => request('companion/reset', { method: 'POST', data }),
	// 养幼崽
	pet: () => request('pet'),
	adoptPet: (data) => request('pet', { method: 'POST', data }),
	petAction: (data) => request('pet/action', { method: 'POST', data }),
	petTalk: () => request('pet/talk', { method: 'POST' }),
	// 纪念本
	memories: () => request('memories'),
	addMemory: (data) => request('memories', { method: 'POST', data }),
	delMemory: (id) => request('memories/' + id, { method: 'DELETE' }),
	// 小屋
	house: () => request('house'),
	houseSign: () => request('house/sign', { method: 'POST' }),
	houseBuy: (data) => request('house/buy', { method: 'POST', data }),
	houseTheme: (data) => request('house/theme', { method: 'POST', data })
}

// 上传图片：返回公开 URL。tempFilePath 由 uni.chooseImage 提供。
export function uploadFile(tempFilePath) {
	const url = apiBase() + 'upload'
	const token = getToken()
	return new Promise((resolve, reject) => {
		uni.uploadFile({
			url,
			filePath: tempFilePath,
			name: 'file',
			header: token ? { Authorization: 'Bearer ' + token } : {},
			success: (res) => {
				try {
					const data = JSON.parse(res.data)
					if (res.statusCode >= 200 && res.statusCode < 300 && data.url) resolve(data.url)
					else reject(new Error(data.error || '上传失败'))
				} catch (e) { reject(new Error('上传失败')) }
			},
			fail: (err) => reject(new Error(err.errMsg || '上传失败'))
		})
	})
}
