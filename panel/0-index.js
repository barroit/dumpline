/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025, 2026 Jiamu Sun <barroit@linux.com>
 */

import btn from './btn.js'
import { chunk_parse, chunk_group } from './chunk.js'
import {
	feature_apply_lineno,
	feature_apply_trim,
	feature_apply_pad,
} from './feature.js'
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
	ctx.style = getComputedStyle(canvas)

	if (!root.dataset.ready) {
		style_init_root(root, ctx.style, ctx)
		root.dataset.ready = ''
	}

	const clipboard = event.clipboardData
	const [ html, weights, wd_base ] = html_resolve_str(clipboard, ctx)
	const tree = html_parse_str(html)

	tree.dataset.wd_base = wd_base
	html_canonicalize(tree)

	feature_apply_lineno(tree, ctx)

	feature_apply_trim(tree, ctx)

	if (!tree.hasChildNodes()) {
		warn(webview, 'nothing to be done')
		return
	}

	feature_apply_pad(tree, ctx)

	const chunk_size = ctx.tune.max_chunk_size
	const chunks = chunk_parse(tree, chunk_size)

	canvas.append(...chunks)
	// const chains = chunk_group(chunks, weights)
}

document.addEventListener('paste', on_paste)
window.addEventListener('message', recv_mesg)

webview.postMessage([ 'ready' ])
