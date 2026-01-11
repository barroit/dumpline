/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025, 2026 Jiamu Sun <barroit@linux.com>
 */
dnl
include(helper.panel/node.m4)dnl
include(helper.patch/option.m4)dnl

import btn from '../helper.panel/btn.js'
import { chunk_parse, chunk_merge, chunk_group } from '../helper.panel/chunk.js'
import {
	html_resolve_str,
	html_parse_str,
	html_canonicalize,
	html_mark_indent,
	html_trim_tail,
	html_trim_head,
	html_setup_lineno,
	html_pad_head,
} from '../helper.panel/html.js'
import { error, warn, info } from '../helper.panel/mesg.js'
import { style_init_root } from '../helper.panel/style.js'
import { utf16_init } from '../helper.panel/utf16.js'

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

	utf16_init(ctx)

	ctx.ready = 0
	ctx.style = getComputedStyle(canvas)

	if (!root.dataset.ready) {
		style_init_root(root, ctx.style, ctx)
		root.dataset.ready = ''
	}

	const clipboard = event.clipboardData
	const [ html, ln_weights, wd_base ] = html_resolve_str(clipboard, ctx)
	const tree = html_parse_str(html)

	tree.dataset.wd_base = wd_base
	html_canonicalize(tree)

	if (ctx['trim'] & TRIM_TAIL)
		html_trim_tail(tree, ctx, ln_weights)
	if (ctx['trim'] & TRIM_HEAD && tree.hasChildNodes())
		html_trim_head(tree, ctx, ln_weights)

	if (!tree.hasChildNodes()) {
		warn(webview, 'nothing to be done')
		return
	}

	html_mark_indent(tree)

	if (ctx['no-lineno'])
		tree.dataset['no-lineno'] = ''
	else
		html_setup_lineno(tree, ctx)

	const head = CHILD_OF(tree)
	const body_indent = Number(tree.dataset.indent)
	let head_indent = Number(head.dataset.indent)

	if (!ctx['no-pad'])
		head_indent += html_pad_head(tree, ctx)

	if (body_indent > head_indent)
		tree.dataset.indent = head_indent

	if (!ctx['no-indent'] || head_indent == 0)
		delete tree.dataset.indent

	const chunk_size = ctx.tune.max_chunk_size
	const chunks = chunk_parse(tree, chunk_size)
	const weights = chunk_merge(ln_weights, chunk_size)

	console.log(chunks, weights)
	canvas.append(...chunks)
	// const chains = chunk_group(chunks, weights)
}

document.addEventListener('paste', on_paste)
window.addEventListener('message', recv_mesg)

webview.postMessage([ 'ready' ])
