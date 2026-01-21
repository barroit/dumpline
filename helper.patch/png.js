/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

import { writeFileSync } from 'node:fs'

import { vsc_exec_cmd } from '../helper/vsc.js'

const cp_rich_cmd = 'editor.action.clipboardCopyWithSyntaxHighlightingAction'

export async function png_render(_1, ctx, _2, panel)
{
	await vsc_exec_cmd(cp_rich_cmd)
	panel.webview.postMessage([ 'render', ctx, ctx ])
}

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
