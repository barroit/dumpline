/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import { writeFileSync, mkdirSync, readdirSync } from 'fs'
import { commands, window, workspace, ViewColumn, Uri } from 'vscode'
import layout from './layout.js'

const { executeCommand, registerTextEditorCommand } = commands

const cp = 'editor.action.clipboardCopyWithSyntaxHighlightingAction'

let dumpline
let panel
let config

let root
let tmpdir

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

	webview.html = layout(webview, root)
	webview.onDidReceiveMessage(message_handler,
				    undefined, dumpline.subscriptions)

	return p
}

async function dump_handler()
{
	const editor = window.activeTextEditor

	config = workspace.getConfiguration()

	if (panel)
		panel.reveal(panel.viewColumn, true)
	else
		panel = panel_init()

	await executeCommand(cp)
	panel.webview.postMessage({
		config,
		block: editor.selection,
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
