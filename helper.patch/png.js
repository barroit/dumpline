/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

import { writeFileSync } from 'node:fs'

export function png_save([ prefix, idx, png_dirty ])
{
	const buf = Buffer.from(png_dirty)
	const name = `${prefix}/${idx}.png`

	writeFileSync(name, buf)
}

export function png_merge(prefix)
{
	console.log(prefix)
}
