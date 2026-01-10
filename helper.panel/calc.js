/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

import {
	utf16_class,
	utf16_class_su,
	utf16_width,
	utf16_tabstop,
} from './utf16.js'

export function calc_tabspan(len)
{
	const tabstop = utf16_tabstop()

	return -len & (tabstop - 1) || tabstop
}

export function calc_digit_width(n)
{
	return (Math.log10(n) >>> 0) + 1
}

export function calc_str_width(str)
{
	const tabstop = utf16_tabstop()
	let width = 0
	let idx

	for (idx = 0; idx < str.length; idx++) {
		const c1 = str.charCodeAt(idx)

		if (c1 == 9) {
			width += tabstop

		} else if ((c1 & 0xfc00) != 0xd800) {
			width += utf16_class[utf16_class[c1]]

		} else {
			idx++

			const c2 = str.charCodeAt(idx)
			const cls_idx = (c1 & 0x3ff) * 0x400 + (c2 & 0x3ff)

			width += utf16_class_su[cls_map[cls_idx]]
		} 
	}

	return width
}
