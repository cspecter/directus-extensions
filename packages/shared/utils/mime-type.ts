import { mimeDB } from './mime-db'

const extensions = Object.create(null)
const types = Object.create(null)

populateMaps()

/**
 * Populate the extensions and types maps.
 * @private
 */

function populateMaps() {
    // source preference (least -> most)
    const preference = ['nginx', 'apache', undefined, 'iana']

    Object.keys(mimeDB).forEach(function forEachMimeType(type) {
        const mime = mimeDB[type]
        const exts = mime?.extensions

        if (!exts || !exts.length) {
            return
        }

        // mime -> extensions
        extensions[type] = exts

        // extension -> mime
        for (let i = 0; i < exts.length; i++) {
            const extension = exts[i]

            if (extension) {
                // if (extension && types[extension]) {
                //     const from = preference.indexOf(mimeDB ? [types[extension]].source)
                //     const to = preference.indexOf(mime.source)

                //     if (types[extension] !== 'application/octet-stream' &&
                //         (from > to || (from === to && types[extension].substr(0, 12) === 'application/'))) {
                //         // skip the remapping
                //         continue
                //     }
                // }

                // set the extension -> mime
                types[extension] = type
            }
        }
    })
}

/**
 * Lookup the MIME type for a file path/extension.
 *
 * @param {string} path
 * @return {boolean|string}
 */

function lookup(path: string): string | undefined {
    if (!path || typeof path !== 'string') {
        return undefined
    }

    const paths = path.split('.')
    const last = paths[paths.length - 1]


    if (!last) return undefined

    // get the extension ("ext" or ".ext" or full path)
    const extension = last
        .toLowerCase()


    if (!extension) {
        return undefined
    }


    return types[extension] || undefined
}

export const mimeType = {
    lookup
}