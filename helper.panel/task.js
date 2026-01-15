/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

import { webview } from '../panel/index.js'

import { list_head, list_add, list_del } from '../helper.panel/list.js'

const xml = new XMLSerializer()
const node_to_xml = xml.serializeToString.bind(xml)

export function task_init(size)
{
	const ctx = {}
	const arr_in = { length: size }

	ctx.lock = Array.from(arr_in, () => new list_head())
	ctx.img = Array.from(arr_in, () => new Image())
	ctx.canvas = Array.from(arr_in, () => new OffscreenCanvas(39, 39))

	return ctx
}

async function lock_wk(head, idx)
{
	const lock = new list_head()
	let resolve
	const promise = new Promise(r => resolve = r)

	lock.val = [ promise, resolve ]
	list_add(lock, head)

	if (lock.next !== head)
		await lock.next.val[0]
}

function unlock_wk(head, idx)
{
	const lock = head.prev
	const resolve = lock.val[1]

	resolve()
	list_del(lock, head)
}

export async function task_run(ctx, ck, ck_idx, wk_idx)
{
	await lock_wk(ctx.lock[wk_idx], wk_idx)

	const ck_str = node_to_xml(ck)
	const ck_uri = encodeURIComponent(ck_str)
	const ck_url = 'data:image/svg+xml;charset=utf-8,' + ck_uri

	const img = ctx.img[wk_idx]
	const canvas = ctx.canvas[wk_idx]
	const canvas_ctx = canvas.getContext('2d')

	img.src = ck_url
	await img.decode()

	canvas.width = img.width
	canvas.height = img.height

	canvas_ctx.drawImage(img, 0, 0)

	const png_blob = await canvas.convertToBlob({ type: 'image/png' })
	const png_buf = await png_blob.arrayBuffer()

	webview.postMessage([ 'dump', [ png_buf, ck_idx ] ])

	unlock_wk(ctx.lock[wk_idx], wk_idx)
}
