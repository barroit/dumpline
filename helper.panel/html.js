/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */
dnl
include(helper.panel/node.m4)dnl

import wcwidth from '@slimio/wcwidth'

import { calc_tabspan } from './calc.js'
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

function expand_tabs(str, tabstop)
{
	const cols = str.split('\t')
	const out = []
	let i

	for (i = 0; i < cols.length - 1; i++) {
		const col = cols[i]
		const col_len = wcwidth(col)

		const tab_len = calc_tabspan(col_len, tabstop)
		const pad = ' '.repeat(tab_len)

		out.push(col, pad)
	}

	out.push(cols[i])
	return out.join('')
}

function loop_plain_lines(plain, tabstop, fn_list, fn_args)
{
	const line_list = plain.split('\n')
	let line_idx

	for (line_idx = 0; line_idx < line_list.length; line_idx++) {
		let fn_idx

		for (fn_idx = 0; fn_idx < fn_list.length; fn_idx++) {
			let line = line_list[line_idx]
			const fn = fn_list[fn_idx]
			const args = fn_args[fn_idx]

			if (line != '')
				line = expand_tabs(line, tabstop)

			fn(line, ...args, line_idx, line_list)
		}
	}
}

function find_width_base(line, width_base, line_idx, line_list)
{
	if (line.length > line_list[width_base[0]].length)
		width_base[0] = line_idx
}

function build_weight_list(str, weights)
{
	let weight = 0
	let idx

	for (idx = 0; idx < str.length; idx++) {
		const c1 = str.charCodeAt(idx)
		let c2

		let cls_idx = c1
		let cls_map = utf16_class

		if ((c1 & 0xfc00) == 0xd800) {
			idx++
			c2 = str.charCodeAt(idx)

			cls_idx = (c1 & 0x3ff) * 0x400 + (c2 & 0x3ff)
			cls_map = utf16_class_su
		}

		weight += utf16_width[cls_map[cls_idx]]
	}

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
	loop_plain_lines(plain, ctx.tabstop, fn_list, fn_args)
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

		loop_plain_lines(plain, ctx.tabstop, fn_list, fn_args)
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

function count_indent_width(next)
{
	const token = CHILD_OF(next)
	const str = TEXT_OF(token)
	let cnt = 0

	while (str[cnt] == ' ')
		cnt++

	return cnt
}

export function html_canonicalize(tree,)
{
	trace_start('html_canonicalize')

	let next = CHILD_OF(tree)
	let indent = -1 >>> 0

	do {
		if (next.tagName == 'BR' || !CHILD_OF(next)) {
			const lf = lf_node.cloneNode(true)

			tree.replaceChild(lf, next)
			next = lf

		} else if (indent) {
			const width = count_indent_width(next)

			if (next == CHILD_OF(tree))
				next.dataset.indent = width
			else if (indent > width)
				indent = width
		}

	} while (next = NEXT_CHILD_OF(next))

	if (indent == -1 >>> 0)
		tree.dataset.indent = 0
	else
		tree.dataset.indent = indent

	trace_stop('html_canonicalize')
}
