/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import { writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { platform } from 'node:process'
import { commands, window, workspace, ViewColumn, Uri } from 'vscode'

import { cfg_read, cfg_write_p } from './config.js'
import panel_html from './panel.js'

const { executeCommand, registerTextEditorCommand } = commands

const cp = 'editor.action.clipboardCopyWithSyntaxHighlightingAction'

let dumpline
let panel

let root
let tmpdir
let current

const macos = platform.name == 'darwin'

/*
 * No API? Fine. We just went ahead and built the damn thing ourselves.
 *
 * src/vs/editor/common/config/editorOptions.ts:EDITOR_FONT_DEFAULTS
 * src/vs/editor/common/config/fontInfo.ts:_create()
 */
const FONT_SIZE = macos ? 12 : 14
const LINE_HEIGHT = 0
const LINE_HEIGHT_RATIO = macos ? 1.5 : 1.35
const LINE_HEIGHT_MIN = 8

function line_height_calc(h, scale)
{
	if (h == 0)
		h = LINE_HEIGHT_RATIO * scale
	else if (h < LINE_HEIGHT_MIN)
		h *= scale

	h = Math.round(h)
	return h < LINE_HEIGHT_MIN ? LINE_HEIGHT_MIN : h
}

function sanitize_config(cfg)
{
	let font_size = cfg_read(cfg, 'editor', 'fontSize')
	let line_height = cfg_read(cfg, 'editor', 'lineHeight')

	if (!font_size) {
		font_size = FONT_SIZE
		cfg_write_p(cfg, 'editor', 'fontSize', font_size)
	}

	if (!line_height)
		line_height = LINE_HEIGHT

	line_height = line_height_calc(line_height, font_size)
	cfg_write_p(cfg, 'editor', 'lineHeight', line_height)
}

function save_image({ binary })
{
	const buf = Buffer.from(binary)

	writeFileSync(`${ tmpdir }/tmp.png`, buf)
}

function panel_reset()
{
	panel = undefined
}

function message_handler(event)
{
	if (event.error)
		window.showErrorMessage(event.error)
	else
		save_image(event)
}

function panel_init()
{
	const p = window.createWebviewPanel('dumpline', 'Dump', {
		viewColumn: ViewColumn.Beside,
		preserveFocus: true,
	}, {
		enableScripts: true,
		retainContextWhenHidden: true,
	})
	const webview = p.webview

	p.onDidDispose(panel_reset, undefined, dumpline.subscriptions)
	p.iconPath = Uri.file(`${ root }/assets/negi-only.svg`)

	webview.html = panel_html(webview, root)
	webview.onDidReceiveMessage(message_handler,
				    undefined, dumpline.subscriptions)

	return p
}

async function dump_handler()
{
	current = {
		editor: window.activeTextEditor,
		config: workspace.getConfiguration(),
	}

	current.config = JSON.stringify(current.config)
	current.config = JSON.parse(current.config)

	sanitize_config(current.config)

	if (panel)
		panel.reveal(panel.viewColumn, true)
	else
		panel = panel_init()

	await executeCommand(cp)
	panel.webview.postMessage({
		config: current.config,
		block: current.editor.selection,
		platform,
	})
}

export function activate(ctx)
{
	const exec = registerTextEditorCommand('dumpline.exec', dump_handler)

	dumpline = ctx
	root = dumpline.extensionPath
	tmpdir = dumpline.globalStoragePath

	mkdirSync(tmpdir, { recursive: true })
	dumpline.subscriptions.push(exec)
}
