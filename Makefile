# SPDX-License-Identifier: GPL-3.0-or-later

srctree := core
name    := dumpline
binary  := $(name).vsix

.PHONY: prepare compile install uninstall

compile:

%/:
	mkdir $@

prepare: build/ build/LICENSES/ build/assets/
	cp LICENSES/* build/LICENSES
	cp assets/* build/assets
	cp .vscodeignore README package.json $(srctree)/* build

compile: prepare
	cd build && \
	npx --prefix .. @vscode/vsce package --skip-license -o $(binary)

install: compile
	cd build && code --install-extension $(binary)

uninstall:
	code --uninstall-extension \
	     $$(code --list-extensions | grep $(name) || printf '39\n')
