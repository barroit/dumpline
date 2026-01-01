/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

export function calc_tabspan(len, tabstop)
{
	return -len & (tabstop - 1) || tabstop
}

export function calc_digit_width(n)
{
	return (Math.log10(n) >>> 0) + 1
}
