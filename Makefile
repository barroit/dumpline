# SPDX-License-Identifier: GPL-3.0-or-later

VPATH := core

pack-y := core/dump.js.in
core-y := $(filter-out $(pack-y),$(wildcard core/*))

pack-y := $(patsubst core/%,build/%,$(pack-y))
core-y := $(patsubst core/%,build/%,$(core-y))

obj-y := .vscodeignore README package.json \
	 $(wildcard LICENSES/*) $(wildcard assets/*)

obj-y := $(patsubst %,build/%,$(obj-y))
obj-y += $(core-y)

.PHONY: dump.js dumpline.vsix install uninstall

install:

build/%: %
	@mkdir -p $(dir $@)
	cp $< $@

dump.js: $(pack-y) $(core-y)
	head -5 $< >build/$@
	esbuild --loader:.in=js --bundle $< >>build/$@

dumpline.vsix: dump.js $(obj-y)
	cd build && npx --prefix .. vsce package --skip-license -o $@

install: dumpline.vsix
	cd build && code --install-extension $<

uninstall:
	code --uninstall-extension \
	     $$(code --list-extensions | grep dumpline || printf '39\n')
