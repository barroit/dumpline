# SPDX-License-Identifier: GPL-3.0-or-later

npm-packages := pngjs tailwindcss

tailwindcss ?= tailwindcss
tailwindcss += --minify

panel-prefix  := $(prefix)/panel
module-prefix := node_modules

html-in   := $(wildcard panel/*.html)
html-m4-y := $(addprefix $(syth-prefix)/,$(html-in))
html-y    := $(panel-prefix)/index.html

$(html-m4-y): $(syth-prefix)/%: %
	mkdir -p $(@D)
	$(m4) $< >$@

$(html-y): $(prefix)/%: $(html-m4-y)
	mkdir -p $(@D)
	$(m4) $* >$@

packages-y := $(addprefix $(module-prefix)/,$(npm-packages))
packages-y := $(addsuffix /$(package-y),$(packages-y))

$(packages-y): $(module-prefix)/%/$(package-y):
	$(npm) $*
	touch $(package-y).in

panel-in   := panel/index.js $(wildcard helper.panel/*.js)
panel-m4-y := $(addprefix $(syth-prefix)/,$(panel-in))
panel-y    := $(panel-prefix)/index.js

$(panel-y)1: $(panel-m4-y) $(packages-y)
	mkdir -p $(@D)
	$(esbuild) --sourcemap=inline --outfile=$@ $<

css-in := $(wildcard panel/*.html)
css-y  := $(panel-prefix)/index.css

$(css-y): $(css-in) $(packages-y)
	mkdir -p $(@D)
	$(tailwindcss) --cwd panel >$@

utf16-class-y := $(panel-prefix)/utf16_class

$(utf16-class-y): scripts/gen-char-class.py
	$< $@

preclean := preclean

preclean:
	rm -f $(css-y)
	rm -f $(html-m4-y)
	rm -f $(html-y)
	rm -f $(panel-y)*

predistclean := predistclean

predistclean:
	rm -f $(utf16-class-y)*
	find $(module-prefix) -mindepth 1 -maxdepth 1 -exec rm -rf {} \;

m4-in += $(panel-in)
archive-in += $(css-y) $(utf16-class-y)

bundle-y += $(panel-y)
prem4    := $(html-y)
