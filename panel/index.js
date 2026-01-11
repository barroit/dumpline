/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025, 2026 Jiamu Sun <barroit@linux.com>
 */
dnl
include(helper.panel/node.m4)dnl
include(helper.patch/option.m4)dnl

import btn from '../helper.panel/btn.js'
import {
	chunk_parse,
	chunk_merge,
	chunk_balence,
	chunk_list_init,
} from '../helper.panel/chunk.js'
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

	if (!ctx['no-pad'])
		html_pad_head(tree, ctx)

	if (ctx['no-indent'])
		delete tree.dataset.indent
	else
		html_fixup_indent(tree, ctx)

	const chunks = chunk_parse(tree, ctx.tune.max_chunk_size)
	const weights = chunk_merge(ln_weights, ctx.tune.max_chunk_size)
	const tasks = chunk_balence(chunks, weights, ctx.tune.max_worker)

	console.log(tasks)
}

document.addEventListener('paste', on_paste)
window.addEventListener('message', recv_mesg)

webview.postMessage([ 'ready' ])
