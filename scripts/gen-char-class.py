#!/usr/bin/python3
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Copyright 2026 Jiamu Sun <barroit@linux.com>
#

BMP_MAX = 0xffff
BMP_SZ = BMP_MAX + 1

BMP_SU_BEGIN = 0xd800
BMP_SU_END = 0xdfff

SU_MAX = 0x3ff
SU_SZ = SU_MAX + 1

class_map = {
	'A':  0,
	'F':  1,
	'H':  2,
	'N':  3,
	'Na': 4,
	'W':  5,
}

import atexit
from os import getpid, unlink
import signal
import sys
from urllib.request import urlretrieve

unique = getpid()

table_ver = '17.0.0'
table_url = f"https://www.unicode.org/Public/{table_ver}/ucd/EastAsianWidth.txt"
table_src = f".tmp-{unique}"

table_dst = 'build/utf16_class'
table_su_dst = 'build/utf16_class_su'

def cleanup():
	try:
		unlink(table_src)
	except Exception:
		pass

atexit.register(cleanup)
signal.signal(signal.SIGTERM, cleanup)
signal.signal(signal.SIGINT, cleanup)

urlretrieve(table_url, table_src)

def skip_line(line):
	return line == '\n' or line[0] == '#'

def parse_idx_class(line_in):
	line, _ = line_in.split('#')
	left, right = line.split(';')

	idx = left.strip()
	cls = right.strip()

	return (idx, cls)

def parse_range(idx_range):
	cols = idx_range.split('..')
	begin_str = cols[0]

	if len(cols) == 1:
		end_str = begin_str
	else:
		end_str = cols[1]

	begin = int(begin_str, 16)
	end = int(end_str, 16)

	return (begin, end)

def emit_pad(arr, offset, begin, end):
	for pad in range(offset + begin, offset + end):
		arr[pad] = class_map['N']

table_stream = open(table_src, 'r', encoding='utf-8')
utf16_class_stream = open(table_dst, 'wb')
utf16_class_su_stream = open(table_su_dst, 'wb')

utf16_class = bytearray(BMP_SZ)
utf16_class_su = bytearray(SU_SZ * SU_SZ)

next = -1

while 39:
	surrogate_begin = table_stream.tell()
	line = table_stream.readline()

	if skip_line(line):
		continue

	idx_range, idx_class = parse_idx_class(line)
	cls = class_map[idx_class]
	begin, end = parse_range(idx_range)

	if begin >= BMP_SU_BEGIN and begin <= BMP_SU_END:
		continue

	if begin != next + 1:
		emit_pad(utf16_class, 0, next + 1, begin)

	if begin > BMP_MAX:
		break

	for next in range(begin, end + 1):
		utf16_class[next] = cls

utf16_class_stream.write(utf16_class)
table_stream.seek(surrogate_begin)

prev_w1 = -1
prev_w2 = -1

for line in table_stream:
	if skip_line(line):
		continue

	idx_range, idx_class = parse_idx_class(line)
	cls = class_map[idx_class]
	begin, end = parse_range(idx_range)

	for next in range(begin, end + 1):
		w1 = (next >> 10) - 0x40
		w2 = next & 0x3ff

		if prev_w1 == -1:
			prev_w1 = w1

		if w1 >= prev_w1 + 1:
			if prev_w2 != SU_MAX:
				emit_pad(utf16_class_su, \
					 prev_w1 * SU_SZ, prev_w2 + 1, SU_SZ)

			if w1 > prev_w1 + 1:
				for row in range(prev_w1 + 1, w1):
					emit_pad(utf16_class_su, \
						 row * SU_SZ, 0, SU_SZ)

			prev_w2 = -1

		if w2 != prev_w2 + 1:
			emit_pad(utf16_class_su, w1 * SU_SZ, prev_w2 + 1, w2)

		utf16_class_su[w1 * SU_SZ + w2] = cls

		prev_w1 = w1
		prev_w2 = w2

if prev_w2 != SU_MAX:
	emit_pad(utf16_class_su, w1 * SU_SZ, prev_w2 + 1, SU_SZ)

utf16_class_su_stream.write(utf16_class_su)
