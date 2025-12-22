# SPDX-License-Identifier: GPL-3.0-or-later

packages  := @slimio/wcwidth pngjs
modules   := $(addprefix $(module-prefix)/,$(packages))
modules-y := $(addsuffix /package.json,$(modules))

prebundle := $(modules-y)

$(modules-y): $(module-prefix)/%/package.json:
	$(npm-install) $*
	touch $(package).in
