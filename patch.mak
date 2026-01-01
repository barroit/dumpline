# SPDX-License-Identifier: GPL-3.0-or-later

panel-prefix := panel

tailwindcss ?= tailwindcss
tailwindcss += --minify

packages := @slimio/wcwidth pngjs tailwindcss

modules-in := $(addprefix $(module-prefix)/,$(packages))
modules-y  := $(addsuffix /package.json,$(modules))

helper-in := $(wildcard $(patch-prefix)/*.js.in)
helper-y  := $(helper-in:%.in=%)

panel-in := $(wildcard $(panel-prefix)/*.html)
panel-y  := $(patch-prefix)/panel.html

stylesheet-y := $(prefix)/panel.css

script-in := $(wildcard $(panel-prefix)/*.js)
script-y  := $(prefix)/panel.js

prebundle := $(modules-y) $(helper-y)

package-in += $(image-prefix)/negi.png
helper-in += $(image-prefix)/negi.svg
panel-in += $(wildcard $(image-prefix)/*.svg)

$(modules-y): $(module-prefix)/%/package.json:
	$(npm) $*
	touch $(package).in

$(panel-y): $(panel-in)
	$(m4) $< >$@

$(helper-y): %: %.in $(panel-y)
	$(m4) $< >$@

prepackage := $(panel-y) $(stylesheet-y)
bundle-y   += $(script-y)

$(script-y)1: $(script-in) $(modules-y) | $(prefix)
	$(esbuild) --sourcemap=inline --outfile=$@ $<

$(stylesheet-y): $(panel-in) | $(prefix)
	$(tailwindcss) --cwd $(panel-prefix) >$@

clean-prebundle := clean-prebundle

clean-prebundle:
	rm -f $(script-y)*
	rm -f $(helper-y)
	rm -f $(prepackage)
