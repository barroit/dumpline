/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { platform } from 'node:process'
import { commands, window, workspace, ViewColumn, Uri } from 'vscode'

import panel_html from './panel.js'

const { executeCommand, registerTextEditorCommand } = commands

const cp = 'editor.action.clipboardCopyWithSyntaxHighlightingAction'

let dumpline
let panel

let root
let tmpdir
let current

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
	else if (event.warn)
		window.showWarningMessage(event.warn)
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
