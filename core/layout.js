/* SPDX-License-Identifier: GPL-3.0-or-later */
/*
 * Copyright 2025 Jiamu Sun <barroit@linux.com>
 */

import { Uri } from 'vscode'

export default function layout(webview, root)
{
	const script = Uri.file(`${ root }/render.js`)
	const script_uri = webview.asWebviewUri(script)

	const style = Uri.file(`${ root }/layout.css`)
	const style_uri = webview.asWebviewUri(style)

return `
<!DOCTYPE html>
<html lang='en'>

<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <link rel='stylesheet' href='${ style_uri }'>
  <title>Dump</title>
</head>

<body>
  <main>
    <svg xmlns='http://www.w3.org/2000/svg'
	 id='canvas-box' width='100%' height='100%'>
      <foreignObject id='canvas' width='100%' height='100%'></foreignObject>
    </svg>
    <canvas id='buffer'></canvas>
  </main>
  <script src='${ script_uri }'></script>
</body>

</html>
` /* return */
}
