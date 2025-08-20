/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

const scale = window.devicePixelRatio

const canvas_box = document.getElementById('canvas-box')
const canvas = document.getElementById('canvas')
const buffer = document.getElementById('buffer')

let dumpline
let block

let binary
let blob

async function image_render(event, done)
{
	const img = event.target
	const ctx = buffer.getContext('2d')

	ctx.setTransform(scale, 0, 0, scale, 0, 0)
	ctx.drawImage(img, 0, 0)

	blob = await new Promise(ret => buffer.toBlob(ret))
	binary = await blob.arrayBuffer()

	done()
}

function image_init(event)
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

	return clone
}

async function image_save(event)
{
	const xml = image_init(event)
	const fmter = new XMLSerializer()
	const str = fmter.serializeToString(xml)

	const uri = encodeURIComponent(str)
	const b64 = `data:image/svg+xml;charset=utf-8,${ uri }`
	const img = new Image()

	await new Promise(done =>
	{
		img.src = b64
		img.onload = (event) => image_render(event, done)
	})

	dumpline.postMessage({ binary })
}

document.addEventListener('paste', image_save)

window.addEventListener('message', event =>
{
	if (!dumpline)
		dumpline = acquireVsCodeApi()

	block = event.data
	document.execCommand('paste')
})
