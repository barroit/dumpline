/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

export function cfg_read(head, ...args)
{
	for (let i = 0; head != undefined && i < args.length; i++)
		head = head[args[i]]

	return head
}

export function cfg_write(head, ...args)
{
	for (let i = 0; i < args.length - 2; i++)
		head = head[args[i]]

	head[args[args.length - 2]] = args[args.length - 1]
}

function object(val)
{
	return val !== null && typeof val == 'object' && !Array.isArray(val)
}

export function cfg_write_p(head, ...args)
{
	for (let i = 0; i < args.length - 2; i++) {
		if (!object(head[args[i]]))
			head[args[i]] = {}
		head = head[args[i]]
	}

	head[args[args.length - 2]] = args[args.length - 1]
}
