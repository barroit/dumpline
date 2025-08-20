/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import { writeFileSync, mkdirSync, readdirSync } from 'fs'
import { commands, window, ViewColumn } from 'vscode'
import layout from './layout.js'

const { executeCommand, registerTextEditorCommand } = commands

const cp = 'editor.action.clipboardCopyWithSyntaxHighlightingAction'

let dumpline
let panel
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

function panel_init()
{
	const page = window.createWebviewPanel('dumpline', 'Dump', {
		viewColumn: ViewColumn.Beside,
		preserveFocus: true,
	}, {
		enableScripts: true,
		retainContextWhenHidden: true,
	})
	const webview = page.webview

	webview.html = layout(webview, `${ dumpline.extensionPath }/core`)
	webview.onDidReceiveMessage(save_image,
				    undefined, dumpline.subscriptions)

	page.onDidDispose(panel_reset, undefined, dumpline.subscriptions)
	return page
}

async function dump_handler()
{
	const editor = window.activeTextEditor

	if (panel)
		panel.reveal(panel.viewColumn, true)
	else
		panel = panel_init()

	await executeCommand(cp)
	panel.webview.postMessage(editor.selection)
}

export function activate(ctx)
{
	const exec = registerTextEditorCommand('dumpline.exec', dump_handler)

	dumpline = ctx
	tmpdir = dumpline.globalStoragePath

	mkdirSync(tmpdir, { recursive: true })
	dumpline.subscriptions.push(exec)
}
