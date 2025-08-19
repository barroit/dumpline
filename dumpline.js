/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import { commands, window } from 'vscode'

const { registerTextEditorCommand } = commands

async function dumpline()
{
}

export function activate(ctx)
{
	const exec = registerTextEditorCommand('dumpline.exec', dumpline)

	ctx.subscriptions.push(exec)
}
