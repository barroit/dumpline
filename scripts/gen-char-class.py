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
	'N':  0,
	'A':  1,
	'F':  2,
	'H':  3,
	'Na': 4,
	'W':  5,
}

import atexit
from os import getpid, unlink
from signal import signal, SIGTERM, SIGINT
from sys import argv
from urllib.request import urlretrieve

unique = getpid()

table_ver = '17.0.0'
table_url = f"https://www.unicode.org/Public/{table_ver}/ucd/EastAsianWidth.txt"
table_src = f".tmp-{unique}"

table_dst = argv[1]
table_su_dst = f"{table_dst}_su"

def cleanup():
	try:
		unlink(table_src)
	except Exception:
		pass

atexit.register(cleanup)
signal(SIGTERM, cleanup)
signal(SIGINT, cleanup)

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

while 39:
	surrogate_begin = table_stream.tell()
	line = table_stream.readline()

	if skip_line(line):
		continue

	idx_range, idx_class = parse_idx_class(line)
	cls = class_map[idx_class]

	if cls == 0:
		continue

	begin, end = parse_range(idx_range)

	if begin >= BMP_SU_BEGIN and begin <= BMP_SU_END:
		continue

	if begin > BMP_MAX:
		break

	for next in range(begin, end + 1):
		utf16_class[next] = cls

utf16_class_stream.write(utf16_class)
table_stream.seek(surrogate_begin)

for line in table_stream:
	if skip_line(line):
		continue

	idx_range, idx_class = parse_idx_class(line)
	cls = class_map[idx_class]

	if cls == 0:
		continue

	begin, end = parse_range(idx_range)

	for next in range(begin, end + 1):
		w1 = (next >> 10) - 0x40
		w2 = next & 0x3ff

		utf16_class_su[w1 * SU_SZ + w2] = cls

utf16_class_su_stream.write(utf16_class_su)
