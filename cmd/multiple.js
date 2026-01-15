/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */
dnl
include(helper.patch/option.m4)dnl

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

	ctx.row_begin = select.start.line
	ctx.col_begin = select.start.character

	ctx.row_end = select.end.line
	ctx.col_end = select.end.character

	const head_line = doc.lineAt(ctx.row_begin)

	ctx.head_line = head_line.text

	ctx.line_height = editor_config.lineHeight
	ctx.line_height_ratio = platform == 'darwin' ? 1.5 : 1.35

	ctx.tabstop = editor.options.tabSize
	ctx.lang = vsc_env.language
}

function transform_ctx(ctx)
{
	switch (ctx.trim) {
	case 'trailing':
		ctx.trim = TRIM_TAIL
		break

	case 'leading':
		ctx.trim = TRIM_HEAD
		break

	case 'both':
		ctx.trim = TRIM_TAIL | TRIM_HEAD
	}
}

function reset_panel()
{
	panel = undefined
}

import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

let tmp = tmpdir()

tmp = mkdtempSync(`${ tmp }/dumpline-`)

function dump_binary([ png_dirty, idx ])
{
	const buf = Buffer.from(png_dirty)

	writeFileSync(`${tmp}/${idx}.png`, buf)
	console.log(tmp)
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
	const ctx = this.fetch_config('dumpline')
	const editor_config = this.fetch_config('editor')

	opt_ensure_valid(ctx)
	patch_ctx(ctx, editor, editor_config)
	transform_ctx(ctx)

	if (panel) {
		panel.reveal(panel.viewColumn, true)
		exec_once.call(ctx)

	} else {
		panel = panel_init(this, recv_mesg, ctx, reset_panel)
	}
}
