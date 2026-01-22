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
import { dump_init, dump_free, dump_render } from '../helper.panel/dump.js'
import { utf16_init } from '../helper.panel/utf16.js'

export const webview = acquireVsCodeApi()
let __ctx
const listeners = []

const locks = new Map()
const dumps = new Map()

export const canvas = document.getElementById('canvas')
export const root = document.documentElement

function lock(key)
{
	let resolve
	const promise = new Promise(r => resolve = r)

	locks.set(key, resolve)
	return promise
}

function unlock(key)
{
	const resolve = locks.get(key)

	resolve()
	locks.delete(key)
}

function on_render(_, data)
{
	__ctx = data
	__ctx.ready = 1

	document.execCommand('paste')
}

function on_dump_done(key, [ _1, _2, _3, ck_cnt ])
{
	let prev = dumps.get(key)

	if (!prev)
		prev = 0

	const next = prev + 1

	if (next != ck_cnt) {
		dumps.set(key, next)

	} else {
		unlock(key)
		dumps.delete(key)
		dump_free(key)
	}
}

function recv_mesg(event)
{
	const fn_map = {
		'render': on_render,
		'mkdir_done': unlock,
		'dump_done': on_dump_done,
		'merge_done': unlock,
	}

	const [ name, data, ctx ] = event.data
	const fn = fn_map[name]

	if (fn)
		fn(ctx.id, data)
}

function cleanup_listeners()
{
	let desc

	while (desc = listeners.pop())
		window.removeEventListener(...desc)
}

function setup_tree(ctx, tree, wgts, delta)
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

function setup_canvas(ctx, ck, line_h)
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

function start_rendering(ctx, cks)
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

function dispatch_tasks(ctx, tasks, ck_cnt, prefix, max_wk)
{
	let wk_idx
	let idle
	const heads = Array.from(tasks)

	tasks.forEach((head, idx, arr) => arr[idx] = head.next)

	for (wk_idx = 0, idle = 0; idle < max_wk; wk_idx++, wk_idx %= max_wk) {
		if (tasks[wk_idx] === heads[wk_idx]) {
			idle++
			continue
		}

		const [ ck, ck_idx ] = tasks[wk_idx].val

		dump_render(ctx, ck, wk_idx, prefix, ck_idx, ck_cnt)
		tasks[wk_idx] = tasks[wk_idx].next
	}
}

async function on_paste(event)
{
	const ctx = __ctx

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

	setup_tree(ctx, tree, ln_wgts, delta)

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

	setup_canvas(ctx, ck_node, line_h)

	const render_ctx = render_init_ctx(listeners,
					   line_h, ck_size, cks.length)

	start_rendering(render_ctx, cks)

	const time = resolve_iso_time()
	const prefix = `${ctx.rt_dir}/${time}`
	const dump_ctx = dump_init(ctx.id, max_wk)

	webview.postMessage([ 'mkdir', prefix ])
	await lock(ctx.id)

	dispatch_tasks(dump_ctx, tasks, cks.length, prefix, max_wk)
	await lock(ctx.id)

	webview.postMessage([ 'merge', prefix ])
	await lock(ctx.id)
}

document.addEventListener('paste', on_paste)
window.addEventListener('message', recv_mesg)

webview.postMessage([ 'ready' ])
