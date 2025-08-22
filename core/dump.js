/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

const scale = window.devicePixelRatio

const canvas_box = document.getElementById('canvas-box')
const canvas = document.getElementById('canvas')
const buffer = document.getElementById('buffer')

let dumpline
let ctx

let binary
let blob

async function image_render(event, done)
{
	const img = event.target
	const d2 = buffer.getContext('2d')

	d2.setTransform(scale, 0, 0, scale, 0, 0)
	d2.drawImage(img, 0, 0)

	blob = await new Promise(ret => buffer.toBlob(ret))
	binary = await blob.arrayBuffer()

	done()
}

function parse_text(text)
{
	const lines = text.split('\n')
	const san = document.createElement('div')
	const out = "<div style='" +
		    'color: var(--vscode-editor-foreground); ' +
		    'background-color: var(--vscode-editor-foreground); ' +
		    'font-family: var(--vscode-editor-font-family); ' +
		    'font-weight: var(--vscode-editor-font-weight); ' +
		    'font-weight: var(--vscode-editor-font-size); ' +
		    'line-height: var(--vscode-repl-line-height); ' +
		    "white-space: pre'>111</div>"

	san.innerHTML = out
	console.log(san)
	document.body.appendChild(san);
	const value = getComputedStyle(san).lineHeight;
	console.log(value); // e.g. "18px"

	// for (const line of lines) {
	// 	san.textContent = line
	// 	san.innerHTML
	// }
}

function image_init(event)
{
	const trans = event.clipboardData
	let data = trans.getData('text/html')

	if (!data) {
		const text = trans.getData('text/plain')

		data = parse_text(text)
	}

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
	if (!ctx.ready) {
		dumpline.postMessage({ error: 'command palette required' })
		return
	}
	ctx.ready = 0

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

	ctx = event.data
	ctx.ready = 1

	document.execCommand('paste')
})
