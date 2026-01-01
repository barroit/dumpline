/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

import wcwidth from 'wcwidth'

import { style_fetch } from './style.js'
import { trace_start, trace_stop } from './trace.js'

import { calc_tabspan } from '../helper.patch/calc.js'

function gen_box_style(style)
{
	const out = []
	const map = [
		[ 'color',            '--vscode-editor-foreground'  ],
		[ 'background-color', '--vscode-editor-background'  ],
		[ 'font-family',      '--vscode-editor-font-family' ],
		[ 'font_weight',      '--vscode-editor-font-weight' ],
		[ 'fone_size',        '--vscode-editor-font-size'   ],
		[ 'line_height',      '--39-line-height'            ],
		[ 'white-space',      '--39-whitespace'             ],
	]

	for (const [ name, key ] of map) {
		const val = style_fetch(style, key)
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

function gen_rich_text(plain, style)
{
	const box_style = gen_box_style(style)
	const tabstop = style_fetch(style, '--39-tabstop')
	const out = []

	const lines = plain.split('\n')
	const sanitizer = document.createElement('div')
	const foreground = style_fetch(style, '--vscode-editor-foreground')

	out.push(`<div style="${box_style}">`)

	for (const line of lines) {
		if (line == '') {
			out.push('<br>')
			continue
		}

		sanitizer.textContent = expand_tabs(line, tabstop)

		out.push('<div>' +
			   `<span style="color: ${foreground}">` +
			      sanitizer.innerHTML +
			   '</span>' +
			 '</div>')
	}

	out.push('</div>')
	return out.join('')
}

export function html_resolve_str(clipboard, style)
{
	const html = clipboard.getData('text/html')

	if (html)
		return html

	const plain = clipboard.getData('text/plain')
	const fake = gen_rich_text(plain, style)

	return fake
}

export function html_parse_str(text)
{
	trace_start('html_parse_str')

	const canvas = document.createElement('template')

	canvas.innerHTML = text

	const box = canvas.content.firstChild

	trace_stop('html_parse_str')
	return box
}

function gen_newline_node()
{
	const div = document.createElement('div')
	const span = document.createElement('span')
	const br = document.createElement('br')

	span.style.visibility = 'hidden'
	span.textContent = '\u200b'

	div.appendChild(span)
	div.appendChild(br)
	div.dataset.empty = ''

	return div
}

function count_indent_width(next)
{
	const span = next.firstChild
	const token = span.textContent
	let cnt = 0

	while (token[cnt] == ' ')
		cnt++

	return cnt
}

export function html_canonicalize(box)
{
	trace_start('html_canonicalize')

	const newline = gen_newline_node()
	let next = box.firstChild
	let indent = -1 >>> 0

	do {
		if (next.tagName == 'BR' || !next.firstChild) {
			const clone = newline.cloneNode(true)

			box.replaceChild(clone, next)
			next = clone

		} else if (indent) {
			const width = count_indent_width(next)

			if (next == box.firstChild)
				next.dataset.indent = width
			else if (indent > width)
				indent = width
		}

	} while (next = next.nextElementSibling)

	if (indent == -1 >>> 0)
		box.dataset.indent = 0
	else
		box.dataset.indent = indent

	trace_stop('html_canonicalize')
}
