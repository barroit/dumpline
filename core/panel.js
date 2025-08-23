/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import crypto from "node:crypto"
import { pathToFileURL } from 'node:url'
import { Uri } from 'vscode'

export default function panel_html(webview, root, tmp)
{
	const rand = crypto.randomBytes(16)
	const nonce = rand.toString('base64')

	const script = Uri.joinPath(root, 'dump.js')
	const script_uri = webview.asWebviewUri(script)

	const style = Uri.joinPath(root, 'panel.css')
	const style_uri = webview.asWebviewUri(style)

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
  <link rel='stylesheet' href='${ style_uri }'>
  <title>Dump</title>
</head>

<body>
  <header id='banner'>
    <div>
      <p>image dumped to: </p>
      <div id='link-box'>
	<a id='link' href='${ tmp_uri }'>${ tmp_uri }</a>
      </div>
    </div>
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
