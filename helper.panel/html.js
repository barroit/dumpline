/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */
dnl
include(helper.panel/node.m4)dnl

import { calc_tabspan, calc_digit_width, calc_str_width } from './calc.js'
import { style_resolve } from './style.js'
import { trace_start, trace_stop } from './trace.js'
import { utf16_class, utf16_class_su, utf16_width } from './utf16.js'

const lf_div = document.createElement('div')
const lf_span = document.createElement('span')
const lf_br = document.createElement('br')
const lf_node = lf_div

lf_span.style.visibility = 'hidden'
TEXT_OF(lf_span) = '\u200b'

lf_div.appendChild(lf_span)
lf_div.appendChild(lf_br)
lf_div.dataset.empty = ''

function gen_box_style(style)
{
	const out = []
	const map = [
		[ 'color',            '--vscode-editor-foreground'  ],
		[ 'background-color', '--vscode-editor-background'  ],
		[ 'font-family',      '--vscode-editor-font-family' ],
		[ 'font-weight',      '--vscode-editor-font-weight' ],
		[ 'font-size',        '--vscode-editor-font-size'   ],
		[ 'line-height',      '--39-line-height'            ],
		[ 'white-space',      '--39-whitespace'             ],
	]

	for (const [ name, key ] of map) {
		const val = style_resolve(style, key)
		const line = `${name}: ${val}`

		out.push(line)
	}

	return out.join(';')
}

function expand_tabs(str)
{
	const cols = str.split('\t')
	const out = []
	let idx

	for (idx = 0; idx < cols.length - 1; idx++) {
		const col = cols[idx]
		const col_len = calc_str_width(col)

		const tab_len = calc_tabspan(col_len)
		const pad = ' '.repeat(tab_len)

		out.push(col, pad)
	}

	out.push(cols[idx])
	return out.join('')
}

function loop_plain_lines(plain, fn_list, fn_args)
{
	const ln_list = plain.split('\n')
	let ln_idx

	for (ln_idx = 0; ln_idx < ln_list.length; ln_idx++) {
		let fn_idx

		for (fn_idx = 0; fn_idx < fn_list.length; fn_idx++) {
			const fn = fn_list[fn_idx]
			const args = fn_args[fn_idx]

			if (ln_list[ln_idx] != '')
				ln_list[ln_idx] = expand_tabs(ln_list[ln_idx])

			fn(ln_list[ln_idx], ...args, ln_idx, ln_list)
		}
	}
}

function find_width_base(line, wd_base, line_idx, line_list)
{
	if (line.length > line_list[wd_base[0]].length)
		wd_base[0] = line_idx
}

function build_weight_list(str, weights)
{
	const weight = calc_str_width(str)

	weights.push(weight)
}

function build_fake_block(line, lines, sanitizer, blk_begin, blk_end)
{
	let built

	if (line == '') {
		built = '<br>'

	} else {
		TEXT_OF(sanitizer) = line
		built = blk_begin + sanitizer.innerHTML + blk_end
	}

	lines.push(built)
}

function fake_resolve_str(plain, weights, wd_base, ctx)
{
	const box_style = gen_box_style(ctx.style)
	const lines = []

	const sanitizer = document.createElement('div')
	const foreground = style_resolve(ctx.style,
					 '--vscode-editor-foreground')

	const blk_begin = `<div><span style="color: ${foreground}">`
	const blk_end = '</span></div>'

	const fn_list = [
		find_width_base,
		build_weight_list,
		build_fake_block,
	]
	const fn_args = [
		[ wd_base ],
		[ weights ],
		[ lines, sanitizer, blk_begin, blk_end ],
	]

	lines.push(`<div style="${box_style}">`)
	loop_plain_lines(plain, fn_list, fn_args)
	lines.push('</div>')

	const html = lines.join('')

	return html
}

export function html_resolve_str(clipboard, ctx)
{
	trace_start('html_resolve_str')

	let html = clipboard.getData('text/html')
	const plain = clipboard.getData('text/plain')

	const weights = []
	const wd_base = [ 0 ]

	if (!html) {
		html = fake_resolve_str(plain, weights, wd_base, ctx)

	} else {
		const fn_list = [
			find_width_base,
			build_weight_list,
		]
		const fn_args = [
			[ wd_base ],
			[ weights ],
		]

		loop_plain_lines(plain, fn_list, fn_args)
	}

	trace_stop('html_resolve_str')
	return [ html, weights, wd_base[0] ]
}

export function html_parse_str(text)
{
	trace_start('html_parse_str')

	const canvas = document.createElement('template')

	canvas.innerHTML = text

	const box = CHILD_OF(canvas.content)

	trace_stop('html_parse_str')
	return box
}

export function html_canonicalize(tree)
{
	trace_start('__filename__:html_canonicalize')

	let next = CHILD_OF(tree)

	do {
		if (next.tagName != 'BR' && CHILD_OF(next))
			continue

		const lf = lf_node.cloneNode(true)

		tree.replaceChild(lf, next)
		next = lf

	} while (next = NEXT_CHILD_OF(next))

	trace_stop('__filename__:html_canonicalize')
}

function count_indent_width(next)
{
	const token = CHILD_OF(next)
	const str = TEXT_OF(token)
	let cnt = 0

	while (str[cnt] == ' ')
		cnt++

	return cnt
}

export function html_mark_indent(tree)
{
	trace_start('__filename__:html_setup_indent')

	let next = CHILD_OF(tree)
	let indent = -1 >>> 0

	do {
		if (next.dataset.empty)
			continue

		const width = count_indent_width(next)

		if (next == CHILD_OF(tree))
			next.dataset.indent = width
		else if (indent > width)
			indent = width

	} while (next = NEXT_CHILD_OF(next))

	if (indent == -1 >>> 0)
		tree.dataset.indent = 0
	else
		tree.dataset.indent = indent

	trace_stop('__filename__:html_setup_indent')
}

export function html_trim_tail(tree, ctx, weights)
{
	let drop = 0
	let next = LAST_CHILD_OF(tree)

	do {
		if (next.dataset.empty == undefined)
			break

		tree.removeChild(next)
		drop++

	} while (next = LAST_CHILD_OF(tree))

	if (!drop)
		return

	ctx.end_row -= drop
	ctx.end_col = 0
	weights.splice(-drop)
}

export function html_trim_head(tree, ctx, weights)
{
	let drop = 0
	let next = CHILD_OF(tree)

	do {
		if (next.dataset.empty == undefined)
			break

		tree.removeChild(next)
		drop++
	} while (next = CHILD_OF(tree))

	if (!drop)
		return

	tree.dataset.wd_base -= drop
	ctx.begin_row -= drop
	ctx.begin_col = 0
	weights.splice(0, drop)
}

function init_pad_map(max)
{
	const empty = Array(max + 1)
	const initial = empty.fill(' ')

	const filled = initial.map((s, i) => s.repeat(i))
	const reversed = filled.reverse()

	return reversed
}

export function html_setup_lineno(tree, ctx)
{
	trace_start('__filename__:setup_lineno')

	const start = ctx.begin_row + 1
	const end = ctx.end_row + 1

	let next = CHILD_OF(tree)
	let line = start

	const width = calc_digit_width(end)
	const pad = init_pad_map(width)

	do {
		const idx = calc_digit_width(line)

		next.dataset.lineno = `${pad[idx]}${line}`
		line++
	} while (next = NEXT_CHILD_OF(next))

	trace_stop('__filename__:setup_lineno')
}

function calc_pad(str_in, pad_end)
{
	const str = str_in.slice(0, pad_end)
	const width = calc_str_width(str)

	return width
}

export function html_pad_head(tree, ctx)
{
	const width = calc_pad(ctx.head_line, ctx.begin_col)
	const pad = ' '.repeat(width)

	const head = CHILD_OF(tree)
	const token = CHILD_OF(head)

	TEXT_OF(token) = pad + TEXT_OF(token)
	return width
}
