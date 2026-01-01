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

	const text = html_resolve_str(event.clipboardData, style)
	const box = html_parse_str(text)

	html_canonicalize(box)

	apply_features(box, current)
}

document.addEventListener('paste', on_paste)
window.addEventListener('message', recv_mesg)
