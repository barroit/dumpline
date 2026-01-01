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
		[ 'font-weight',      '--vscode-editor-font-weight' ],
		[ 'fone-size',        '--vscode-editor-font-size'   ],
		[ 'line-height',      '--39-line-height'            ],
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

function find_longest_with(plain, tabstop, cb, ...args)
{
	const lines = plain.split('\n')
	let longest = 0
	let current

	for (current = 0; current < lines.length; current++) {
		if (lines[current] != '')
			lines[current] = expand_tabs(lines[current], tabstop)

		if (lines[current].length > lines[longest].length)
			longest = current

		if (cb)
			cb(lines[current], ...args)
	}

	return longest
}

function gen_fake_block(line, buf, sanitizer, block_begin, block_end)
{
	if (line == '') {
		buf.push('<br>')

	} else {
		sanitizer.textContent = line
		buf.push(block_begin + sanitizer.innerHTML + block_end)
	}
}

function fake_resolve_str(plain, style, tabstop)
{
	const box_style = gen_box_style(style)
	const buf = []

	const sanitizer = document.createElement('div')
	const foreground = style_fetch(style, '--vscode-editor-foreground')
	const block_begin = `<div><span style="color: ${foreground}">`
	const block_end = '</span></div>'

	buf.push(`<div style="${box_style}">`)

	const longest = find_longest_with(plain, tabstop, gen_fake_block, buf,
					  sanitizer, block_begin, block_end)

	buf.push('</div>')

	return {
		html: buf.join(''),
		longest,
	}
}

export function html_resolve_str(clipboard, style)
{
	trace_start('html_resolve_str')

	const html = clipboard.getData('text/html')
	const plain = clipboard.getData('text/plain')
	const tabstop = style_fetch(style, '--39-tabstop')

	if (!html)
		return fake_resolve_str(plain, style, tabstop)

	const longest = find_longest_with(plain, tabstop)

	trace_stop('html_resolve_str')
	return {
		html,
		longest,
	}
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
