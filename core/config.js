/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

export function cfg_read(head, ...pathspec)
{
	for (const path of pathspec) {
		if (!head[path])
			return undefined

		head = head[path]
	}

	return head
}

export function cfg_write(head, ...args)
{
	for (let i = 0; i < args.length - 2; i++)
		head = head[args[i]]

	head[args[args.length - 2]] = args[args.length - 1]
}

export function cfg_write_p(head, ...args)
{
	for (let i = 0; i < args.length - 2; i++) {
		head[args[i]] ??= {}
		head = head[args[i]]
	}

	head[args[args.length - 2]] = args[args.length - 1]
}
