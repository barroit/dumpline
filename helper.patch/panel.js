/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import crypto from 'node:crypto'
import { pathToFileURL as path_to_url } from 'node:url'

import {
	vsc_webview_init,
	vsc_tab_group,
	vsc_view_column,
	vsc_uri,
} from '../helper/vsc.js'

function gen_panel_html(webview, prefix_in)
{
	const prefix = vsc_uri.joinPath(prefix_in, 'build', 'panel')

	const stylesheet_uri = vsc_uri.joinPath(prefix, 'index.css')
	const stylesheet = webview.asWebviewUri(stylesheet_uri)

	const script_uri = vsc_uri.joinPath(prefix, 'index.js')
	const script = webview.asWebviewUri(script_uri)

	const utf16_class_uri = vsc_uri.joinPath(prefix, 'utf16_class')
	const utf16_class = webview.asWebviewUri(utf16_class_uri)

	const utf16_class_su_uri = vsc_uri.joinPath(prefix, 'utf16_class_su')
	const utf16_class_su = webview.asWebviewUri(utf16_class_su_uri)

	const rand = crypto.randomBytes(16)
	const nonce = rand.toString('base64')

	return `
include(__build__/panel/index.html)dnl
	`
}

export function panel_init(ctx, mesg_cb, mesg_ctx, disp_cb, disp_ctx)
{
	const view_opt = {
		viewColumn: vsc_view_column.Beside,
		preserveFocus: true,
		localResourceRoots: [ ctx.binary.extensionUri ],
	}
	const panel_opt = {
		enableScripts: true,
		retainContextWhenHidden: true,
	}

	const panel = vsc_webview_init(NAME, '39dump', view_opt, panel_opt)
	const webview = panel.webview
	const prefix = ctx.binary.uri

	webview.html = gen_panel_html(webview, prefix)
	webview.onDidReceiveMessage(mesg_cb, mesg_ctx, ctx.cleanup)

	panel.onDidDispose(disp_cb, disp_ctx, ctx.cleanup)
	panel.iconPath = vsc_uri.joinPath(prefix, 'image', 'negi.svg')

	return panel
}
