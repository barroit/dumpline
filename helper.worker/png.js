/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2026 Jiamu Sun <barroit@linux.com>
 */

function test_bpp(rgbas, begin, size)
{
	const end = begin + size
	let score = 0

	for (; begin < end; begin++) {
		const u8 = rgbas[begin]
		const s8 = (u8 << 24) >> 24

		score += Math.abs(s8)
	}

	return score
}

function test_none(rgbas, begin, end)
{
	return test_bpp(rgbas, begin, end - begin)
}

function test_sub(rgbas, begin, end)
{
	let score = test_bpp(rgbas, begin, 4)
	let left = rgbas[begin]

	begin += 4

	for (; begin < end; begin++, left = rgbas[begin - 4]) {
		const u8 = (rgbas[begin] - left) & 0xff
		const s8 = (u8 << 24) >> 24

		score += Math.abs(s8)
	}

	return score
}

function test_up(rgbas, begin, end, prev_begin)
{
	if (begin == 0)
		return test_bpp(rgbas, begin, end - begin)

	let score = 0

	for (; begin < end; begin++, prev_begin++) {
		const u8 = (rgbas[begin] - rgbas[prev_begin]) & 0xff
		const s8 = (u8 << 24) >> 24

		score += Math.abs(s8)
	}

	return score
}

function test_average_sub_once(rgbas, begin, end)
{
	let score = test_bpp(rgbas, begin, 4)
	let left = rgbas[begin]

	begin += 4

	for (; begin < end; begin++, left = rgbas[begin - 4]) {
		const u8 = (rgbas[begin] - (left >> 1)) & 0xff
		const s8 = (u8 << 24) >> 24

		score += Math.abs(s8)
	}

	return score
}

function test_average_up_once(rgbas, begin, prev_begin)
{
	let score = 0
	const end = begin + 4

	for (; begin < end; begin++, prev_begin++) {
		const up = rgbas[prev_begin]

		const u8 = (rgbas[begin] - (up >> 1)) & 0xff
		const s8 = (u8 << 24) >> 24

		score += Math.abs(s8)
        }

	return score
}

function test_average(rgbas, begin, end, prev_begin)
{
	if (begin == 0)
		return test_average_sub_once(rgbas, begin, end)

	let score = test_average_up_once(rgbas, begin, prev_begin)

	begin += 4
	prev_begin += 4

	for (; begin < end; begin++, prev_begin++) {
		const left = rgbas[begin - 4]
		const up = rgbas[prev_begin]

		const u8 = (rgbas[begin] - ((left + up) >> 1)) & 0xff
		const s8 = (u8 << 24) >> 24

		score += Math.abs(s8)
	}

	return score
}

function test_paeth(rgbas, begin, end, prev_begin)
{
	if (begin == 0)
		return test_sub(rgbas, begin, end)

	let score = test_up(rgbas, begin, begin + 4, prev_begin)

	begin += 4
	prev_begin += 4

	for (; begin < end; begin++, prev_begin++) {
		const left = rgbas[begin - 4]
		const up = rgbas[prev_begin]
		const up_left = rgbas[prev_begin - 4]

		const p  = left + up - up_left
		const pa = Math.abs(p - left)
		const pb = Math.abs(p - up)
		const pc = Math.abs(p - up_left)

		let pred = up_left

		if (pa <= pb && pa <= pc)
			pred = left
		else if (pb <= pc)
			pred = up

		const u8 = (rgbas[begin] - pred) & 0xff
		const s8 = (u8 << 24) >> 24

		score += Math.abs(s8)
	}

	return score
}

export function png_pick_filter(rgbas, begin, sl_size)
{
	const tests = [
		[ 0x00, test_none    ],
		[ 0x01, test_sub     ],
		[ 0x02, test_up      ],
		[ 0x03, test_average ],
		[ 0x04, test_paeth   ],
	]
	const best = [ -1 >>> 0, 0x39 ]

	const end = begin + sl_size
	const prev_begin = begin - sl_size

	for (const [ filter, test ] of tests) {
		const score = test(rgbas, begin, end, prev_begin)

		if (best[0] > score) {
			best[0] = score
			best[1] = filter
		}
	}

	return best[1]
}
