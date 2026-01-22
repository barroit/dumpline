/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

import { writeFileSync } from 'node:fs'

export function png_save_chunk(_1, ck, prefix, ck_idx)
{
	const buf = Buffer.from(ck)
	const name = `${prefix}/${ck_idx}`

	writeFileSync(name, buf)
}

export function png_save_size(id, prefix, ck_cnt, w, most_h, last_h)
{
	const name = `${prefix}/size`
	const buf = Buffer.alloc(8)
	const h = (ck_cnt - 1) * most_h + last_h

	buf.writeUInt32LE(w, 0)
	buf.writeUInt32LE(h, 4)

	writeFileSync(name, buf)
}

export function png_merge_chunk(id, prefix)
{
	console.log(prefix)
}
