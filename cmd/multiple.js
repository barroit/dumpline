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

	ctx.line_height = editor_config.lineHeight
	ctx.line_height_ratio = platform == 'darwin' ? 1.5 : 1.35
	ctx.tabstop = editor.options.tabSize

	ctx.begin_row = select.start.line
	ctx.begin_col = select.start.character

	ctx.end_row = select.end.line
	ctx.end_col = select.end.character
}

function dump_binary()
{
	//
}

function reset_panel()
{
	panel = undefined
}

function recv_mesg(event)
{
	const [ name, data ] = event

	switch (name) {
	case 'open':
		cb = vsc_env.openExternal
		break
	case 'dump':
		cb = dump_binary
	}

	cb(data)
}

export async function exec(editor)
{
	if (editor.selections.length > 1)
		die("multiple selections aren't supported")

	if (panel)
		panel.reveal(panel.viewColumn, true)
	else
		panel = panel_init(this, recv_mesg, reset_panel)

	const ctx = this.fetch_config('dumpline')
	const editor_config = this.fetch_config('editor')

	opt_ensure_valid(ctx)
	patch_ctx(ctx, editor, editor_config)

	await vsc_exec_cmd(cp_rich_cmd)
	panel.webview.postMessage(ctx)
}
