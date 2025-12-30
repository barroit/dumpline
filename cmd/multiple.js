/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import { platform } from 'node:process'

import { die } from '../helper/mesg.js'
import { vsc_range, vsc_env, vsc_exec_cmd } from '../helper/vsc.js'

import { opt_ensure_valid } from '../helper.patch/option.js'
import { panel_init } from '../helper.patch/panel.js'

const cp_rich_cmd = 'editor.action.clipboardCopyWithSyntaxHighlightingAction'

let panel

function map_ctx(editor, ctx_in)
{
	const select = editor.selection
	const ctx = {
		...ctx_in,
		platform,

		begin_row: select.start.line,
		begin_col: select.start.character,

		end_row: select.end.line,
		end_col: select.end.character,

		tabstop: editor.options.tabSize,
	}

	return ctx
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

	const opt = this.fetch_config()

	opt_ensure_valid(opt)

	const ctx = map_ctx(editor, opt)

	await vsc_exec_cmd(cp_rich_cmd)
	panel.webview.postMessage(ctx)
}
