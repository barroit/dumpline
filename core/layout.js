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
  <script src='${ render }'></script>
  <title>Dump</title>
</head>

<body>
  <main>
    <h1>111</h1>
  </main>
</body>

</html>
` /* return */
}
