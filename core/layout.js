/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import { Uri } from 'vscode'

export default function layout(webview, root)
{
	const render_js = Uri.file(`${ root }/render.js`)
	const render = webview.asWebviewUri(render_js)

return `
<!DOCTYPE html>
<html lang='en'>

<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <title>Dump</title>
  <style>
    html, body, main, #buffer { height: 100% }
    body { padding-right: 8px }
    html { overflow: hidden }
    #canvas { overflow: auto }
    #canvas div { width: min-content }
  </style>
</head>

<body>
  <main>
    <svg xmlns='http://www.w3.org/2000/svg'
	 id='canvas-box' width='100%' height='100%'>
      <foreignObject id='canvas' width='100%' height='100%'></foreignObject>
    </svg>
    <canvas id='buffer'></canvas>
  </main>
  <script src='${ render }'></script>
</body>

</html>
` /* return */
}
