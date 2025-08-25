/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { platform } from 'node:process'
import { env, commands, window, workspace, ViewColumn, Uri } from 'vscode'

import { cfg_read, cfg_write, cfg_write_p } from './config.js'
import panel_html from './panel.js'

const { executeCommand, registerTextEditorCommand } = commands

const cp = 'editor.action.clipboardCopyWithSyntaxHighlightingAction'

/*
 * Name property like a builtin. Then enjoy output like:
 *
 *	-       function trimEnd() { [native code] }
 *	+       enabled
 */
const config_table = [
	{
		name: '39dump.lineNumber',
		path: [ '39dump', 'lineNumber' ],
	},
	{
		name: '39dump.trimNewline',
		path: [ '39dump', 'trimNewline' ],
	},
]

let dumpline
let meta
let panel

let root
let tmp
let current

/*
 * Cleanup exists because idiots keep fucking config up.
 */
function sanitize_config(config)
{
	const sample = meta.contributes.configuration.properties
	const fix = {}
	const invalid = []

	for (const { name, path } of config_table) {
		const ours = sample[name]
		const theirs = cfg_read(config, ...path)
		let pass

		if (ours.enum)
			pass = ours.enum.find(val => val === theirs)
		else
			pass = ours.type == typeof theirs

		cfg_write_p(fix, ...path, pass ? theirs : ours.default)

		if (!pass) {
			invalid.push(`@  ${ name }\n` +
				     `\u2212       ${ theirs }\n` +
				     `\u002b       ${ ours.default }`)
		}
	}

	cfg_write(config, '39dump', fix['39dump'])

	if (!invalid.length)
		return

	const heading = 'Bad config, defaulting:\n'
	const detail = invalid.join('\n\n')

	window.showWarningMessage(heading, {
		detail,
		modal: true,
	})
}

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
	const p = window.createWebviewPanel('dumpline', '39dump', {
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

function panel_close()
{
	const groups = window.tabGroups.all
	const group = groups.find(val => val.viewColumn == panel.viewColumn)

	const tabs = group.tabs
	const tab = tabs.find(val => val.label == '39dump')

	window.tabGroups.close(tab)
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
	dumpline = ctx
	meta = dumpline.extension.packageJSON
	root = dumpline.extensionUri

	tmp = tmpdir()
	tmp = mkdtempSync(`${ tmp }/dumpline-`)

	const exec = registerTextEditorCommand('dumpline.exec', dump_handler)

	dumpline.subscriptions.push(exec)
}

export function deactivate()
{
	if (panel)
		panel_close()

	rmSync(tmp, { recursive: true, force: true })
}
