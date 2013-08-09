
NAME	= scriptkeeper.js
SRC	= main.js core.js sk_filter.js settings.js sk_extension.js utils.js userjs_ui.js sk_ui.js
GEN_SRC	= scriptkeeper_style.js scriptkeeper_widgets.js
TMPFILES= scriptkeeper.xml scriptkeeper.inlined.css custom.style
ALLSRC	= $(SRC) $(GEN_SRC)
TOOLS	= ../tools

all: $(NAME)

clean:
	-rm $(NAME) $(GEN_SRC) $(TMPFILES) *~

scriptkeeper.js: $(ALLSRC)
	$(TOOLS)/jpp $<  > $@

scriptkeeper.inlined.css: scriptkeeper.css
	@echo generating $@ from $<
	@../tools/data_urls < $<  > $@

scriptkeeper_style.js: scriptkeeper.inlined.css
	@echo generating $@ from $<
	@echo "    var builtin_style = " > $@
	@echo -n '"' >> $@
	@sed -e 's|$$|  \\n\\|' < $< >> $@ 
	@echo '";' >> $@


# Layout generation pipeline:
# - we start with the interface description in scriptkeeper.ui ...
# - then expand the xml macros in there to get scriptkeeper.xml
# - and turn that into js object with the html for each widget.

scriptkeeper.xml: scriptkeeper.ui
	@echo generating $@ from $<
	@$(TOOLS)/xml_macros < $<   > $@

scriptkeeper_widgets.js: scriptkeeper.xml
	@echo generating $@ from $<
	@$(TOOLS)/pack_widgets $<  > $@

###################################################################

# using the dev environment to make style patches easily
custom.style : $(NAME)
	@echo generating $@ from $<
	@git diff ../$(NAME) | grep -v '^+++' | grep '^+' |  \
	 sed -e 's/^+//'  | sed -e 's|\\n\\$$||' > $@
