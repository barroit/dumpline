/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025, 2026 Jiamu Sun <barroit@linux.com>
 */

import btn from './btn.js'
import {
	feat_setup_lineno,
	feat_trim_tail,
	feat_trim_head,
	feat_pad_head,
} from './feature.js'
import { html_resolve_str, html_parse_str, html_canonicalize } from './html.js'
import { error, warn, info } from './mesg.js'
import { style_init_root } from './style.js'

const webview = acquireVsCodeApi()
let current

const canvas = document.getElementById('canvas')
const root = document.documentElement

function recv_mesg(event)
{
	current = event.data
	current.ready = 1

	document.execCommand('paste')
}

function apply_features(box, ctx)
{
	if (ctx['no-lineno'])
		box.dataset['no-lineno'] = ''
	else
		feat_setup_lineno(box, ctx)

	if (ctx['trim'] == 'trailing')
		feat_trim_tail(box)

	if (ctx['trim'] == 'leading')
		feat_trim_head(box)

	if (ctx['trim'] == 'both') {
		feat_trim_tail(box)
		feat_trim_head(box)
	}

	const first = box.firstChild
	let indent = Number(first.dataset.indent)

	if (!ctx['no-pad'])
		indent += feat_pad_head(box, ctx)

	if (box.dataset.indent > indent)
		box.dataset.indent = indent

	if (indent != 0 && ctx['no-indent'])
		box.dataset['no_indent'] = ''
}

function gen_chunk_box()
{
	const ns = 'http://www.w3.org/2000/svg'
	const svg = document.createElementNS(ns, 'svg')
	const foreobj = document.createElementNS(ns, 'foreignObject')

	svg.setAttribute('xmlns', ns)
	svg.setAttribute('width', '100%')
	svg.setAttribute('height', '100%')

	foreobj.setAttribute('width', '100%')
	foreobj.setAttribute('height', '100%')

	svg.appendChild(foreobj)
	return svg
}

function resolve_line_width(container, line)
{
	const clone = line.cloneNode(true)
	const chunk = gen_chunk(container, [ clone ], 1)
	const box = chunk.firstChild.firstChild
	
	chunk.style.visibility = 'hidden'
	canvas.appendChild(chunk)

	const rect = box.getBoundingClientRect()
	const width = rect.width

	canvas.removeChild(chunk)
	return width
}

function gen_chunk(container, lines, cap, line_width, line_height)
{
	const clone = container.cloneNode(true)
	const box = clone.firstChild.firstChild

	const arr = new Array(cap)
	let i

	for (i = 0; i < cap; i++)
		arr[i] = lines[i]

	const height = line_height * arr.length

	clone.setAttribute('width', line_width)
	clone.setAttribute('height', height)

	box.append(...arr)
	return clone
}

function chunk_lines(box, chunk_size, longest)
{
	const lines = box.children
	let len = lines.length
	const ret = []

	const container = gen_chunk_box()
	const box_only = box.cloneNode(false)

	container.firstChild.appendChild(box_only)

	const line_height = parseInt(box_only.style.lineHeight)
	const line_width = resolve_line_width(container, lines[longest])

	while (len != 0) {
		const cap = chunk_size > len ? len : chunk_size
		const chunk = gen_chunk(container, lines, cap,
					line_width, line_height)

		ret.push(chunk)
		len -= cap
	}

	return ret
}

function on_paste(event)
{
	if (!current.ready)
		return

	current.ready = 0

	const style = getComputedStyle(canvas)

	if (!root.dataset.ready) {
		style_init_root(root, style, current)
		root.dataset.ready = ''
	}

	const clipboard = event.clipboardData
	const { html, longest } = html_resolve_str(clipboard, style, current)
	const box = html_parse_str(html)

	html_canonicalize(box)

	apply_features(box, current)

	const chunk_size = current.tune.max_chunk_size
	const chunks = chunk_lines(box, chunk_size, longest)

	canvas.append(...chunks)
	// const chains = group_chunks(chunks, )
}

document.addEventListener('paste', on_paste)
window.addEventListener('message', recv_mesg)
