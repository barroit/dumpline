/* SPDX-License-Identifier: GPL-3.0-or-later AND Apache-2.0 */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 * Google icon's under Apache-2.0
 */

import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { Uri } from 'vscode'

export default function panel_html(webview, root, tmp)
{
	const rand = crypto.randomBytes(16)
	const nonce = rand.toString('base64')

	const script = Uri.joinPath(root, 'dump.js')
	const script_uri = webview.asWebviewUri(script)

	const panel_css = Uri.joinPath(root, 'panel.css')
	const panel_css_uri = webview.asWebviewUri(panel_css)

	const line_css = Uri.joinPath(root, 'line.css')
	const line_css_uri = webview.asWebviewUri(line_css)

	const tmp_uri = pathToFileURL(tmp)

return `
<!DOCTYPE html>
<html lang='en'>

<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <meta http-equiv='Content-Security-Policy'
	content="default-src 'none';
		 img-src data:;
		 style-src ${ webview.cspSource } 'unsafe-inline';
		 script-src 'nonce-${ nonce }'">
  <link rel='stylesheet' href='${ line_css_uri }'>
  <link rel='stylesheet' href='${ panel_css_uri }'>
  <title>Dump</title>
</head>

<body>
  <header id='banner'>
    <div id='heading'>
      <p role='heading' aria-level='1'>Dumped to directory: </p>
      <button id='button'>
	<svg xmlns='http://www.w3.org/2000/svg' fill='currentColor'
	     viewBox='0 -960 960 960' height='24px' width='24px' >
	  <title>Copy image</title>
	  <path d='M760-200H320q-33 0-56.5-23.5T240-280v-560q0-33
		   23.5-56.5T320-920h280l240 240v400q0 33-23.5
		   56.5T760-200ZM560-640v-200H320v560h440v-360H560ZM160-40q-33
		   0-56.5-23.5T80-120v-560h80v560h440v80H160Zm160-800v200-200
		   560-560Z'/>
	</svg>
      </button>
    </div>
    <div id='link-box'>
      <a id='link' href='${ tmp_uri }'>${ tmp_uri }</a>
    </div>
    <div></div>
  </header>
  <main>
    <svg xmlns='http://www.w3.org/2000/svg'
	 id='canvas-box' width='100%' height='100%'>
      <foreignObject id='canvas' width='100%' height='100%'></foreignObject>
    </svg>
    <canvas id='buffer'></canvas>
  </main>
  <script nonce='${ nonce }' src='${ script_uri }'></script>
</body>

</html>
` /* return */
}
