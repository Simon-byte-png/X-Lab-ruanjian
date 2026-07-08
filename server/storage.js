// 对象存储上传（S3 兼容 / 腾讯云 COS）。未配置对象存储时，回退到本地 uploads 目录。
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCAL_UPLOAD_DIR = path.join(__dirname, 'uploads')

function cfg() {
	return {
		endpoint: process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3,
		region: process.env.AWS_REGION || process.env.COS_REGION || 'ap-shanghai',
		bucket: process.env.S3_BUCKET || process.env.COS_BUCKET,
		accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.COS_SECRETID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.COS_SECRETKEY,
		prefix: process.env.S3_KEY_PREFIX || process.env.OBJECT_PREFIX || '',
		publicBase: (process.env.S3_PUBLIC_BASE_URL || '').replace(/\/$/, ''),
		forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
	}
}

export function storageAvailable() {
	const c = cfg()
	return !!(c.endpoint && c.bucket && c.accessKeyId && c.secretAccessKey)
}

let client = null
function getClient(c) {
	if (client) return client
	client = new S3Client({
		endpoint: c.endpoint,
		region: c.region,
		credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
		forcePathStyle: c.forcePathStyle
	})
	return client
}

const EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' }

async function uploadLocal(buffer, contentType) {
	const ext = EXT[contentType] || 'jpg'
	const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`
	await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true })
	await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, filename), buffer)
	return `/uploads/${filename}`
}

export async function uploadImage(buffer, contentType) {
	const c = cfg()
	if (!storageAvailable()) return uploadLocal(buffer, contentType)
	const ext = EXT[contentType] || 'jpg'
	const key = `${c.prefix}love-in-zju/uploads/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`
	await getClient(c).send(new PutObjectCommand({
		Bucket: c.bucket, Key: key, Body: buffer, ContentType: contentType || 'image/jpeg'
	}))
	// 公开访问地址
	if (c.publicBase) return `${c.publicBase}/${key}`
	return `${c.endpoint.replace(/\/$/, '')}/${c.bucket}/${key}`
}
