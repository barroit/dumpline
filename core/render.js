/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

const canvas_box = document.getElementById('canvas-box')
const canvas = canvas_box.firstElementChild
const buffer = document.getElementById('buffer')

let dumpline
let block

function render(event)
{
	const img = event.target
	const ctx = buffer.getContext('2d')

	ctx.drawImage(img, 0, 0)
	buffer.toBlob(blob =>
	{
		const data = blob.arrayBuffer()

		dumpline.postMessage({ data })
	})
}

function dump(event)
{
	const trans = event.clipboardData
	const data = trans.getData('text/html')

	canvas.innerHTML = data

	const fmter = new XMLSerializer()
	const str = fmter.serializeToString(canvas_box)

	const uri = encodeURIComponent(str)
	const b64 = `data:image/svg+xml;charset=utf-8,${ uri }`
	const img = new Image()

	img.src = b64
	img.onload = render
}

document.addEventListener('paste', dump)

window.addEventListener('message', event =>
{
	if (!dumpline)
		dumpline = acquireVsCodeApi()

	block = event.data
	document.execCommand('paste')
})
