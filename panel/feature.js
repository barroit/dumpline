/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

import wcwidth from 'wcwidth'

import { trace_start, trace_stop } from './trace.js'

import { calc_tabspan, calc_digit_width } from '../helper.patch/calc.js'

function gen_pad_map(max)
{
	const empty = Array(max + 1)
	const initial = empty.fill(' ')

	const filled = initial.map((s, i) => s.repeat(i))
	const reversed = filled.reverse()

	return reversed
}

export function feat_setup_lineno(box, ctx)
{
	trace_start('feat_setup_lineno')

	const start = ctx.begin_row + 1
	const end = ctx.end_row + 1

	let next = box.firstChild
	let line = start

	const width = calc_digit_width(end)
	const pad = gen_pad_map(width)

	do {
		const idx = calc_digit_width(line)

		next.dataset.lineno = `${pad[idx]}${line}`
		line++
	} while (next = next.nextElementSibling)

	trace_stop('feat_setup_lineno')
}

export function feat_trim_tail(box)
{
	let next = box.lastElementChild

	do {
		if (next.dataset.empty == undefined)
			break

		box.removeChild(next)
	} while (next = box.lastElementChild)
}

export function feat_trim_head(box)
{
	let next = box.firstElementChild

	do {
		if (next.dataset.empty == undefined)
			break

		box.removeChild(next)
	} while (next = box.firstElementChild)
}

function calc_pad(line, pad_end, tabstop)
{
	let len = 0
	let i

	for (i = 0; pad_end > 0; i++, pad_end--) {
		if (line[i] != '\t')
			len += wcwidth(line[i])
		else
			len += calc_tabspan(len, tabstop)
	}

	return len
}

export function feat_pad_head(box, ctx)
{
	const width = calc_pad(ctx.head_line, ctx.begin_col, ctx.tabstop)
	const div = box.firstChild

	const span = div.firstChild
	const pad = ' '.repeat(width)

	span.textContent = pad + span.textContent
	return width
}
