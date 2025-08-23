/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { platform } from 'node:process'
import { env, commands, window, workspace, ViewColumn, Uri } from 'vscode'

import panel_html from './panel.js'

const { executeCommand, registerTextEditorCommand } = commands

const cp = 'editor.action.clipboardCopyWithSyntaxHighlightingAction'

let dumpline
let panel

let root
let tmp
let current

function save_image(binary)
{
	const buf = Buffer.from(binary)

	writeFileSync(`${ tmp }/tmp.png`, buf)
}

function message_handler(event)
{
	const [ action ] = Object.keys(event)
	let cb

	switch (action) {
	case 'info':
		cb = window.showInformationMessage
		break

	case 'warn':
		cb = window.showWarningMessage
		break

	case 'error':
		cb = window.showErrorMessage
		break

	case 'open':
		cb = env.openExternal
		break

	case 'binary':
		cb = save_image
	}

	cb(event[action])
}

function panel_reset()
{
	panel = undefined
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
	p.iconPath = Uri.joinPath(root, 'assets/negi-only.svg')

	webview.html = panel_html(webview, root, tmp)
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
	root = dumpline.extensionUri

	tmp = tmpdir()
	tmp = mkdtempSync(`${ tmp }/dumpline-`)

	dumpline.subscriptions.push(exec)
}

export function deactivate()
{
	rmSync(tmp, { recursive: true, force: true })
}
