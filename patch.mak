# SPDX-License-Identifier: GPL-3.0-or-later

packages  := @slimio/wcwidth pngjs tailwindcss
modules   := $(addprefix $(module-prefix)/,$(packages))
modules-y := $(addsuffix /package.json,$(modules))

helper-in := $(wildcard helper.patch/*.js.in)
helper-y  := $(helper-in:%.in=%)

panel-in := $(wildcard panel/*.html)
panel-y  := $(prefix)/index.html

prebundle := $(modules-y) $(helper-y)

$(modules-y): $(module-prefix)/%/package.json:
	$(npm) $*
	touch $(package).in

$(panel-y): $(panel-in) $(prefix)
	$(m4) $< >$@

$(helper-y): %: %.in $(panel-y)
	$(m4) $< >$@
