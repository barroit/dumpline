/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */
dnl
include(helper.panel/node.m4)dnl

import wcwidth from '@slimio/wcwidth'

import { calc_tabspan, calc_digit_width } from './calc.js'
import { trace_start, trace_stop } from './trace.js'

function init_pad_map(max)
{
	const empty = Array(max + 1)
	const initial = empty.fill(' ')

	const filled = initial.map((s, i) => s.repeat(i))
	const reversed = filled.reverse()

	return reversed
}

function setup_lineno(tree, ctx)
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

function trim_tail(tree)
{
	let next = LAST_CHILD_OF(tree)

	do {
		if (next.dataset.empty == undefined)
			break

		tree.removeChild(next)
	} while (next = LAST_CHILD_OF(tree))
}

function trim_head(tree)
{
	let wd_base = tree.dataset.wd_base
	let next = CHILD_OF(tree)

	do {
		if (next.dataset.empty == undefined)
			break

		tree.removeChild(next)
		wd_base--
	} while (next = CHILD_OF(tree))

	tree.dataset.wd_base = wd_base
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

function pad_head(tree, ctx, wd_base)
{
	const width = calc_pad(ctx.head_line, ctx.begin_col, ctx.tabstop)
	const pad = ' '.repeat(width)

	const head = CHILD_OF(tree)
	const token = CHILD_OF(head)

	TEXT_OF(token) = pad + TEXT_OF(token)
	return width
}

export function feature_apply_lineno(tree, feature)
{
	if (feature['no-lineno'])
		tree.dataset['no-lineno'] = ''
	else
		setup_lineno(tree, feature)
}

export function feature_apply_trim(tree, feature)
{
	if (feature['trim'] == 'trailing')
		trim_tail(tree)

	if (feature['trim'] == 'leading')
		trim_head(tree)

	if (feature['trim'] == 'both') {
		trim_tail(tree)

		if (tree.hasChildNodes())
			trim_head(tree)
	}
}

export function feature_apply_no_pad(tree, feature)
{
	const head = CHILD_OF(tree)
	const body_indent = Number(tree.dataset.indent)
	let head_indent = Number(head.dataset.indent)

	if (!feature['no-pad'])
		head_indent += pad_head(tree, feature)

	if (body_indent > head_indent)
		tree.dataset.indent = head_indent

	if (!feature['no-indent'] || head_indent == 0)
		delete tree.dataset.indent
}
