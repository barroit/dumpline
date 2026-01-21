/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

import { png_pick_filter } from '../helper.worker/png.js'

const canvas = new OffscreenCanvas(39, 39)

function init_ck(w, h)
{
	const size = h * (1 + w * 4)
	const buf = new Uint8Array(size)

	return buf
}

function fill_ck(ck, rgbas, w)
{
	let src_idx
	let dst_idx
	const sl_size = w * 4

	console.log(ck, rgbas)

	for (src_idx = 0, dst_idx = 0;
	     src_idx < rgbas.length;
	     src_idx += sl_size, dst_idx += src_idx + 1) {

		const filter = png_pick_filter(rgbas, src_idx, sl_size)
	}
}

function on_mesg({ data: bitmap })
{
	const d2 = canvas.getContext('2d')
	const w = bitmap.width
	const h = bitmap.height

	canvas.width = w
	canvas.height = h

	d2.drawImage(bitmap, 0, 0)

	const { data: rgbas } = d2.getImageData(0, 0, w, h)
	const ck = init_ck(w, h)

	fill_ck(ck, rgbas, w)
}

self.onmessage = on_mesg
