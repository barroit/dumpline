/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

const scale = window.devicePixelRatio

const canvas_box = document.getElementById('canvas-box')
const canvas = canvas_box.firstElementChild
const buffer = document.getElementById('buffer')

let dumpline
let block

function render(event)
{
	const img = event.target
	const ctx = buffer.getContext('2d')

	ctx.setTransform(scale, 0, 0, scale, 0, 0)
	ctx.drawImage(img, 0, 0)

	buffer.toBlob(async blob =>
	{
		const data = await blob.arrayBuffer()

		dumpline.postMessage({ data })
	})
}

function dump(event)
{
	const trans = event.clipboardData
	const data = trans.getData('text/html')

	canvas.innerHTML = data

	const clone = canvas_box.cloneNode(true)
	const child = canvas.firstChild

	const w = child.offsetWidth
	const h = child.offsetHeight

	clone.setAttribute('width', w)
	clone.setAttribute('height', h)

	buffer.width = w * scale
	buffer.height = h * scale

	const fmter = new XMLSerializer()
	const str = fmter.serializeToString(clone)

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
