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
import {
	render_init_ctx,
	render_window_once,
	render_window,
} from '../helper.panel/render.js'
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
import { task_init, task_run } from '../helper.panel/task.js'
import { utf16_init } from '../helper.panel/utf16.js'

export const webview = acquireVsCodeApi()
let ctx
const listeners = []

export const canvas = document.getElementById('canvas')
export const root = document.documentElement

function recv_mesg(event)
{
	ctx = event.data
	ctx.ready = 1

	document.execCommand('paste')
}

function cleanup_listeners()
{
	let desc

	while (desc = listeners.pop())
		window.removeEventListener(...desc)
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

	if (!tree.hasChildNodes())
		return

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

function setup_canvas(ck, ctx, line_h)
{
	const lines = ctx.row_end - ctx.row_begin + 1
	const canvas_h = line_h * lines
	const canvas_w = ck.width.baseVal.value

	canvas.style.width = `${canvas_w}px`
	canvas.style.height = `${canvas_h}px`
}

function on_scroll(last_y, on_frame)
{
	if (window.scrollY == last_y[0])
		return

	last_y[0] = window.scrollY
	window.requestAnimationFrame(on_frame)
}

function start_rendering(cks, ctx)
{
	const last_y = [ 0 ]
	const render_window_fn = render_window.bind(undefined, cks, ctx)

	const on_scroll_fn = on_scroll.bind(undefined, last_y, render_window_fn)
	const on_scroll_desc = [ 'scroll' , on_scroll_fn ]

	listeners.push(on_scroll_desc)
	window.addEventListener(...on_scroll_desc, { passive: true })

	render_window_once(cks, ctx)
}

function resolve_iso_time()
{
	const raw_date = new Date()
	const iso_date = raw_date.toISOString()
	const name = iso_date.replace(/[:.]/g, '-')

	return name
}

function dump_chunks(name, tasks, ctx, max_wk)
{
	const heads = Array.from(tasks)

	tasks.forEach((head, idx, arr) => arr[idx] = head.next)

	let idx
	let idle

	for (idx = 0, idle = 0; idle < max_wk; idx++, idx %= max_wk) {
		if (tasks[idx] === heads[idx]) {
			idle++
			continue
		}

		const [ ck, ck_idx ] = tasks[idx].val

		task_run(ctx, ck, idx, info).then(png =>
		{
			webview.postMessage([ 'dump', [ name, ck_idx, png ] ])
		})
		tasks[idx] = tasks[idx].next
	}
}

function on_paste(event)
{
	if (!ctx.ready)
		return
	ctx.ready = 0

	cleanup_listeners()
	utf16_init(ctx)

	ctx.style = getComputedStyle(canvas)

	if (!root.dataset.ready) {
		style_init_root(root, ctx.style, ctx)
		root.dataset.ready = ''
	}

	const clipboard = event.clipboardData
	const [ html, ln_wgts, wbase ] = html_resolve_str(clipboard, ctx)

	const tree = html_parse_str(html)
	const delta = { wbase, indent: 0 }

	setup_tree(tree, ctx, ln_wgts, delta)

	if (!tree.hasChildNodes()) {
		warn(webview, 'nothing to be done')
		return
	}

	const ck_size = ctx.tune.max_chunk_size
	let max_wk = ctx.tune.max_worker

	const ck_node = chunk_init(ck_size, tree, delta.wbase, delta.indent)
	const cks = chunk_parse(ck_node, tree, ck_size)
	let tasks

	if (cks.length > max_wk) {
		tasks = chunk_balence_slow(cks, ln_wgts, ck_size, max_wk)

	} else {
		tasks = chunk_balence_fast(cks)
		max_wk = cks.length
	}

	const line_h_str = style_resolve(ctx.style, '--39-line-height')
	const line_h = parseInt(line_h_str)

	setup_canvas(ck_node, ctx, line_h)

	const render_ctx = render_init_ctx(listeners,
					   line_h, ck_size, cks.length)

	start_rendering(cks, render_ctx)

	const time = resolve_iso_time()
	const name = `${ctx.rt_dir}/${time}`
	const task_ctx = task_init(max_wk)

	webview.postMessage([ 'mkdir', name ])
	dump_chunks(name, tasks, task_ctx, max_wk)
	webview.postMessage([ 'merge', name ])

}

document.addEventListener('paste', on_paste)
window.addEventListener('message', recv_mesg)

webview.postMessage([ 'ready' ])
