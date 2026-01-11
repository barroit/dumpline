/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

export class list_head {
	constructor(val) {
		this.val = val
		this.next = this
		this.prev = this
	}
}

function __list_add(node, prev, next)
{
	next.prev = node
	node.next = next
	node.prev = prev
	prev.next = node
}

export function list_add(node, head)
{
	__list_add(node, head, head.next)
}

export function list_add_tail(node, head)
{
	__list_add(node, head.prev, head)
}

export function list_del(node)
{
	const prev = node.prev
	const next = node.next

	next.prev = prev
	prev.next = next

	node.prev = undefined
	node.next = undefined
}
