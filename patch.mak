# SPDX-License-Identifier: GPL-3.0-or-later

panel-prefix := panel

tailwindcss ?= tailwindcss
tailwindcss += --minify

packages := @slimio/wcwidth pngjs tailwindcss

modules-in := $(addprefix $(module-prefix)/,$(packages))
modules-y  := $(addsuffix /package.json,$(modules-in))

helper-gen-in := $(wildcard $(patch-prefix)/*.js.in)
helper-gen-y  := $(helper-gen-in:%.in=%)

panel-in := $(wildcard $(panel-prefix)/*.html)
panel-y  := $(patch-prefix)/panel.html

stylesheet-y := $(prefix)/panel.css

script-in := $(wildcard $(panel-prefix)/*.js)
script-y  := $(prefix)/panel.js

script-gen-in := $(wildcard $(panel-prefix)/*.js.in)
script-gen-y  := $(script-gen-in:%.in=%)

script-helper-in := $(wildcard $(panel-prefix)/*.m4)

utf16-class-in := utf16_class
utf16-class-y := $(prefix)/$(utf16-class-in)

prebundle := $(modules-y) $(helper-gen-y)

package-in += $(image-prefix)/negi.png
helper-gen-in += $(image-prefix)/negi.svg
panel-in += $(wildcard $(image-prefix)/*.svg)

$(modules-y): $(module-prefix)/%/package.json:
	$(npm) $*
	touch $(package-y).in

$(panel-y): $(panel-in)
	$(m4) $< >$@

$(helper-gen-y): %: %.in $(panel-y)
	$(m4) $< >$@

prepackage := $(panel-y) $(stylesheet-y) $(utf16-class-y)
bundle-y   += $(script-y)

$(script-gen-y): %: %.in $(script-helper-in)
	$(m4) -D__filename__=$(notdir $<) $(script-helper-in) $< >$@
	

$(script-y)1: $(script-in) $(script-gen-y) $(modules-y) | $(prefix)
	$(esbuild) --sourcemap=inline --outfile=$@ $<

$(stylesheet-y): $(panel-in) | $(prefix)
	$(tailwindcss) --cwd $(panel-prefix) >$@

$(utf16-class-y):
	$(script-prefix)/gen-char-class.py $@

clean-prebundle := clean-prebundle

clean-prebundle:
	rm -f $(script-y)*
	rm -f $(helper-gen-y)
	rm -f $(prepackage)

distclean-prebundle := distclean-prebundle

distclean-prebundle:
	rm -f $(utf16-class-y)
