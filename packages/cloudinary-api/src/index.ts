import { defineEndpoint } from '@directus/extensions-sdk'
import fileUpload from 'express-fileupload'
import { v2 as cloudinary } from 'cloudinary'



export default defineEndpoint({
	id: 'cloudinary',
	handler: (router, { env, exceptions, logger }) => {

		cloudinary.config({
			cloud_name: env['CDN_API_NAME'],
			api_key: env['CDN_API_KEY'],
			api_secret: env['CDN_API_SECRET'],
			secure: true
		})

		router.post('/upload', fileUpload(), async (req, res) => {
			try {
				if (!req.accountability.user) {
					throw new exceptions.ForbiddenException();
				}

				let err;

				const { public_id, } = req.body
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
