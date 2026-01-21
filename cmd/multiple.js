/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */
dnl
include(helper.patch/option.m4)dnl

import { mkdirSync } from 'node:fs'
import { platform } from 'node:process'

import { error, warn, info } from '../helper/mesg.js'
import { vsc_env, vsc_uri } from '../helper/vsc.js'

import { opt_ensure_valid } from '../helper.patch/option.js'
import { panel_init, panel_gen_html } from '../helper.patch/panel.js'
import { png_render, png_save, png_merge } from '../helper.patch/png.js'

import { rt_dir } from '../entry.js'

let panel
let ext

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

	ctx.rt_dir = rt_dir
}

function transform_ctx(ctx)
{
	const trim_flag = {
		'trailing': TRIM_TAIL,
		'leading': TRIM_HEAD,
		'both': TRIM_TAIL | TRIM_HEAD,
	}

	ctx.trim = trim_flag[ctx.trim]
}

export async function recv_event([ name, data ])
{
	const fn_map = {
		'ready': png_render,
		'dump':  png_save,
		'merge': png_merge,

		'error': error,
		'warn':  warn,
		'info':  info,

		'mkdir': mkdirSync,
		'open':  vsc_env.openExternal,
	}

	const [ ctx, ext, panel ] = this
	const fn = fn_map[name]

	await fn(data, ctx, ext, panel)
	panel.webview.postMessage([ `${name}_done` ])
}

function reset_panel()
{
	panel = undefined
}

export async function exec(editor)
{
	const ext = this
	const config = ext.fetch_config('dumpline')
	const editor_config = ext.fetch_config('editor')

	opt_ensure_valid(config)
	patch_ctx(config, editor, editor_config)
	transform_ctx(config)

	if (panel) {
		panel.reveal(panel.viewColumn, true)
		event_recv.call([ config, ext, panel ], [ 'ready' ])
		return
	}

	panel = panel_init(ext)

	const webview = panel.webview
	const prefix = ext.binary.uri

	webview.html = panel_gen_html(webview, prefix)
	webview.onDidReceiveMessage(recv_event,
				    [ config, ext, panel ], ext.cleanup)

	panel.onDidDispose(reset_panel, undefined, ext.cleanup)
	panel.iconPath = vsc_uri.joinPath(prefix, 'image', 'negi.svg')
}
