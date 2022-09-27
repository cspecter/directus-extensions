import { createClient } from '@supabase/supabase-js'
import { defineEndpoint } from '@directus/extensions-sdk'
import fileUpload from 'express-fileupload'

export default defineEndpoint({
	id: 'supabase',
	handler: (router, { env, exceptions, logger }) => {
		const BUCKET = env['SUPABASE_BUCKET']
		const supabase = createClient(env['SUPABASE_URL'], env['SUPABASE_SECRET'])

		console.log(supabase)

		router.post('/file', (req, res) => {
			if (!req.accountability.user) {
				throw new exceptions.ForbiddenException();
			}

			const body = req.body
			const { name = '' } = body

			const { publicURL, error } = supabase
				.storage
				.from(BUCKET)
				.getPublicUrl(name)
			if (error) res.status(400).json(error)
			if (publicURL) res.status(200).json({ url: publicURL })
		})
		router.post('/list', async (req, res) => {
			if (!req.accountability.user) {
				throw new exceptions.ForbiddenException();
			}
			const body = req.body
			const { folder, limit = 100, offset = 0 } = body

			const { data, error } = await supabase
				.storage
				.from(BUCKET)
				.list(folder, {
					limit,
					offset
				})

			if (error) res.status(400).json(error)
			if (data) res.status(200).json(data)

		})
		router.post('/file', async (req, res) => {
			if (!req.accountability.user) {
				throw new exceptions.ForbiddenException();
			}
			const body = req.body
			const { name = '' } = body

			const { data, error } = await supabase
				.storage
				.from(BUCKET)
				.download(name)
			if (error) res.status(400).json(error)
			if (data) res.status(200).json(data)
		})
		router.post('/upload', fileUpload(), async (req, res) => {
			try {
				if (!req.accountability.user) {
					throw new exceptions.ForbiddenException();
				}

				let err;

				const { folder = '' } = req.body
				const { files } = req

				const promises: Promise<{ data: { Key: string } | null; error: Error | null }>[] = []

				Object.keys(files as object).forEach((key) => {
					const file: fileUpload.UploadedFile = files[key]
					promises.push(supabase
						.storage
						.from(BUCKET)
						.upload(`${folder}${file.name}`, file.data, {
							cacheControl: '3600',
							upsert: true
						}))
				})

				const results = await Promise.all(promises)

				const names: (string | undefined)[] = []

				results.forEach((result) => {
					const { data, error } = result
					if (error) err = error
					names.push(data?.Key.replace(`${BUCKET}/`, ''))
				})

				const { data, error: err2 } = await supabase
					.from('files')
					.select()
					.in('name', names)

				if (!err && err2) err = err2

				if (err) {
					res.status(400).json(err)
				} else if (data) { res.status(200).json(data) }
			} catch (e) {
				res.status(400).json(e)
			}
		})
		router.patch('/move', async (req, res) => {
			if (!req.accountability.user) {
				throw new exceptions.ForbiddenException();
			}
			const body = req.body
			const { to, from } = body

			if (!to || !from) res.status(400).json({ message: 'This requires both a `to` and `from` field.' })

			const { data, error } = await supabase
				.storage
				.from(BUCKET)
				.move(to, from)
			if (error) res.status(400).json(error)
			if (data) res.status(200).json(data)
		})
		router.delete('/remove', async (req, res) => {
			if (!req.accountability.user) {
				throw new exceptions.ForbiddenException();
			}
			const { name } = req.body

			if (!name) res.status(400).json({ message: 'This requires both a `name` field.' })

			const { data, error } = await supabase
				.storage
				.from(BUCKET)
				.remove([name])
			if (error) res.status(400).json(error)
			if (data) res.status(200).json(data)
		})
	}
});
