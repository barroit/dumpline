/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import { platform } from 'node:process'

import { error, warn, info } from '../helper/mesg.js'
import { vsc_range, vsc_env, vsc_exec_cmd } from '../helper/vsc.js'

import { opt_ensure_valid } from '../helper.patch/option.js'
import { panel_init } from '../helper.patch/panel.js'

const cp_rich_cmd = 'editor.action.clipboardCopyWithSyntaxHighlightingAction'

let panel

function patch_ctx(ctx, editor, editor_config)
{
	const select = editor.selection
	const doc = editor.document

	ctx.begin_row = select.start.line
	ctx.begin_col = select.start.character

	ctx.end_row = select.end.line
	ctx.end_col = select.end.character

	const head_line = doc.lineAt(ctx.begin_row)

	ctx.head_line = head_line.text

	ctx.line_height = editor_config.lineHeight
	ctx.line_height_ratio = platform == 'darwin' ? 1.5 : 1.35

	ctx.tabstop = editor.options.tabSize
}

function reset_panel()
{
	panel = undefined
}

function dump_binary()
{
	//
}

async function exec_once()
{
	await vsc_exec_cmd(cp_rich_cmd)
	panel.webview.postMessage(this)
}

function recv_mesg(event)
{
	const [ name, data ] = event
	let fn

	switch (name) {
	case 'ready':
		fn = exec_once
		break

	case 'open':
		fn = vsc_env.openExternal
		break

	case 'dump':
		fn = dump_binary
		break

	case 'error':
		fn = error
		break

	case 'warn':
		fn = warn
		break

	case 'info':
		fn = info
	}

	fn.call(this, data)
}

export async function exec(editor)
{
	if (panel)
		panel.reveal(panel.viewColumn, true)
	else
		panel = panel_init(this, recv_mesg, reset_panel)

	const ctx = this.fetch_config('dumpline')
	const editor_config = this.fetch_config('editor')

	opt_ensure_valid(ctx)
	patch_ctx(ctx, editor, editor_config)
}
