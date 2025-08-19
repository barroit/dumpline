# SPDX-License-Identifier: GPL-3.0-or-later

objtree := build
name    := dumpline
binary  := $(objtree)/$(name).vsix

.PHONY: bundle install uninstall

bundle:

$(objtree):
	mkdir $(objtree)

bundle: $(objtree)
	npx @vscode/vsce package --skip-license --no-dependencies -o $(binary)

install: bundle
	code --install-extension $(binary)

uninstall:
	code --uninstall-extension \
	     $$(code --list-extensions | grep $(name) || printf '39\n')
