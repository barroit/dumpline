/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025, 2026 Jiamu Sun <barroit@linux.com>
 */

import btn from './btn.js'
import { chunk_parse } from './chunk.js'
import { feature_apply } from './feature.js'
import { html_resolve_str, html_parse_str, html_canonicalize } from './html.js'
import { error, warn, info } from './mesg.js'
import { style_init_root } from './style.js'

const webview = acquireVsCodeApi()
let ctx

const canvas = document.getElementById('canvas')
const root = document.documentElement

function recv_mesg(event)
{
	ctx = event.data
	ctx.ready = 1

	document.execCommand('paste')
}

function on_paste(event)
{
	if (!ctx.ready)
		return

	ctx.ready = 0

	const style = getComputedStyle(canvas)

	if (!root.dataset.ready) {
		style_init_root(root, style, ctx)
		root.dataset.ready = ''
	}

	const clipboard = event.clipboardData
	const [ html, width_base ] = html_resolve_str(clipboard, style)
	const tree = html_parse_str(html)

	html_canonicalize(tree)

	feature_apply(tree, ctx)

	const chunk_size = ctx.tune.max_chunk_size
	const chunks = chunk_parse(tree, chunk_size, width_base)

	canvas.append(...chunks)
	// const chains = group_chunks(chunks, )
}

document.addEventListener('paste', on_paste)
window.addEventListener('message', recv_mesg)
