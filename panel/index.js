/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025, 2026 Jiamu Sun <barroit@linux.com>
 */
dnl
include(helper.panel/node.m4)dnl
include(helper.patch/option.m4)dnl

import btn from '../helper.panel/btn.js'
import {
	chunk_init,
	chunk_parse,
	chunk_balence_fast,
	chunk_balence_slow,
} from '../helper.panel/chunk.js'
import { html_resolve_str, html_parse_str } from '../helper.panel/html.js'
import { error, warn, info } from '../helper.panel/mesg.js'
import { style_init_root, style_resolve } from '../helper.panel/style.js'
import {
	tree_canonicalize,
	tree_trim_tail,
	tree_trim_head,
	tree_calc_indent_head,
	tree_calc_indent_body,
	tree_setup_lineno,
	tree_pad_head,
} from '../helper.panel/tree.js'
import { utf16_init } from '../helper.panel/utf16.js'

export const webview = acquireVsCodeApi()
let ctx

export const canvas = document.getElementById('canvas')
const root = document.documentElement

function recv_mesg(event)
{
	ctx = event.data
	ctx.ready = 1

	document.execCommand('paste')
}

function setup_tree(tree, ctx, wgts, delta)
{
	tree_canonicalize(tree)

	let tail_drop
	let head_drop

	if (ctx['trim'] & TRIM_TAIL)
		tail_drop = tree_trim_tail(tree)

	if (tail_drop) {
		ctx.row_end -= tail_drop
		ctx.col_end = 0
		wgts.splice(-tail_drop)
	}

	if (ctx['trim'] & TRIM_HEAD && tree.hasChildNodes())
		head_drop = tree_trim_head(tree, ctx, wgts)

	if (head_drop) {
		ctx.row_begin -= head_drop
		ctx.col_begin = 0
		wgts.splice(0, head_drop)
		delta.wd_base -= head_drop
	}

	if (!tree.hasChildNodes()) {
		warn(webview, 'nothing to be done')
		return 1
	}

	if (!ctx['no-lineno'])
		tree_setup_lineno(tree, ctx)

	let head_indent = tree_calc_indent_head(tree)
	let indent = tree_calc_indent_body(tree)

	if (!ctx['no-pad'])
		head_indent += tree_pad_head(tree, ctx)

	if (ctx['no-indent'])
		indent = 0
	else if (indent > head_indent)
		indent = head_indent

	delta.indent = indent
}

function setup_canvas(ctx)
{
	const line_height_str = style_resolve(ctx.style, '--39-line-height')
	const line_height = parseInt(line_height_str)

	const lines = ctx.row_end - ctx.row_begin + 1
	const canvas_h = line_height * lines

	canvas.style.height = `${canvas_h}px`
}

function on_paste(event)
{
	let err

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
	const [ html, ln_wgts, wbase ] = html_resolve_str(clipboard, ctx)

	const tree = html_parse_str(html)
	const delta = { wbase, indent: 0 }

	err = setup_tree(tree, ctx, ln_wgts, delta)
	if (err)
		return

	const ck_size = ctx.tune.max_chunk_size
	const max_wk = ctx.tune.max_worker

	const ck_node = chunk_init(ck_size, tree, delta.wbase, delta.indent)
	const cks = chunk_parse(ck_node, tree, ck_size)
	let tasks

	if (cks.length <= max_wk)
		tasks = chunk_balence_fast(cks)
	else
		tasks = chunk_balence_slow(cks, ln_wgts, ck_size, max_wk)

	// canvas.append(...cks)
	// setup_canvas(ctx)
}

document.addEventListener('paste', on_paste)
window.addEventListener('message', recv_mesg)

webview.postMessage([ 'ready' ])
