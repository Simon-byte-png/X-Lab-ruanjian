// 统一请求封装
// H5(网页/预览)：接口地址相对当前页面推导，兼容 /preview/<会话>/<端口>/ 子路径，避免硬编码
// 小程序/App：需指向已部署的后端域名(上线后填写)
function normalizeApiBase(base) {
	const value = (base || '').trim()
	if (!value) {
		console.warn('VITE_API_BASE_URL 未配置，小程序/App 端请求地址为空')
		return ''
	}
	return value.endsWith('/') ? value : value + '/'
}

function apiBase() {
	// #ifdef H5
	// 优先使用环境变量；否则使用相对路径 /api/，由 Vite proxy 转发到后端
	const envBase = import.meta.env?.VITE_API_BASE_URL
	if (envBase) return normalizeApiBase(envBase)
	return '/api/'
	// #endif
	// #ifndef H5
	// 小程序/App 正式包请通过 VITE_API_BASE_URL 注入已备案的 https 后端地址。
	return normalizeApiBase(import.meta.env.VITE_API_BASE_URL)
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

export function request(path, { method = 'GET', data, timeout = 60000 } = {}) {
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
			timeout,
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
			fail: (err) => {
				const msg = err.errMsg || '网络错误'
				// 常见超时/连接失败给出更友好的中文提示
				if (/timeout/i.test(msg)) {
					reject(new Error('连接后端超时，请确认后端已启动且能访问网络'))
				} else if (/fail/i.test(msg)) {
					reject(new Error('无法连接后端服务，请检查后端是否在运行'))
				} else {
					reject(new Error(msg))
				}
			}
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
	// AI 算命（生辰八字）
	fortunePersonal: (data) => request('ai/fortune/personal', { method: 'POST', data }),
	fortuneInvite: (data) => request('ai/fortune/invite', { method: 'POST', data }),
	fortuneAccept: (data) => request('ai/fortune/accept', { method: 'POST', data }),
	fortuneSession: (code) => request('ai/fortune/session/' + code),
	// 匹配度测试
	quizList: () => request('quiz/list'),
	quiz: (id) => request('quiz/' + id),
	quizAnswer: (id, data) => request('quiz/' + id + '/answer', { method: 'POST', data }),
	quizResult: (id) => request('quiz/' + id + '/result'),
	// 匹配度测试·分享版（无需绑定）
	quizShareCreate: (id, data) => request('quiz/' + id + '/share', { method: 'POST', data }),
	quizShareGet: (code) => request('quiz/share/' + code),
	quizShareAnswer: (code, data) => request('quiz/share/' + code + '/answer', { method: 'POST', data }),
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
