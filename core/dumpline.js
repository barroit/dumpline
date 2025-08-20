/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import { commands, window, ViewColumn, Uri } from 'vscode'
import layout from './layout.js'

const { registerTextEditorCommand } = commands

let ctx
let panel

function panel_reset()
{
	panel = undefined
}

function panel_init()
{
	const dir = `${ ctx.extensionPath }/core`
	const uri = Uri.joinPath(ctx.extensionUri, 'core')

	const p = window.createWebviewPanel('dumpline', 'Dump', {
		viewColumn: ViewColumn.Beside,
		preserveFocus: true,
	}, {
		localResourceRoots: [ uri ],
		enableScripts: true,
	})

	p.webview.html = layout(p.webview, dir)
	p.onDidDispose(panel_reset, null, ctx.subscriptions)

	return p
}

async function dumpline()
{
	if (panel)
		panel.reveal(panel.viewColumn, true)
	else
		panel = panel_init()
}

export function activate(__ctx)
{
	ctx = __ctx

	const exec = registerTextEditorCommand('dumpline.exec', dumpline)

	ctx.subscriptions.push(exec)
}
