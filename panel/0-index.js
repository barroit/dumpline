/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025, 2026 Jiamu Sun <barroit@linux.com>
 */

import btn from './btn.js'

function recv_mesg(event)
{
	//
}

function on_paste(event)
{
	//
}

document.addEventListener('paste', on_paste)
window.addEventListener('message', recv_mesg)
