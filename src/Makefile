
NAME	= jsarmor.js
SRC	= main.js core.js settings.js utils.js core_ui.js builtin_ui.js
GEN_SRC	= jsarmor_style.js jsarmor_widgets.js
TMPFILES= jsarmor.xml 
ALLSRC	= $(SRC) $(GEN_SRC)
# where we save output from generate_layout.html
GEN_LAYOUT=/home/opera/downloads/default
TOOLS	= ../tools

all: $(NAME)

clean:
	-rm $(NAME) $(GEN_SRC) $(TMPFILES) *~

jsarmor.js: $(ALLSRC)
	$(TOOLS)/jpp $<  > $@

jsarmor_style.js: jsarmor.css
	@echo generating $@ from $<
	@echo "    var builtin_style = " > $@
	@echo -n '"' >> $@
	@sed -e 's|$$|  \\n\\|' < $< >> $@ 
	@echo '";' >> $@


# layout generation pipeline:
# - we start with the interface description in jsarmor.ui ...
# - then expand the xml macros in there to get jsarmor.xml
# - and turn that into js object with the html for each widget.

jsarmor.xml: jsarmor.ui
	@echo generating $@ from $<
# make it somewhat readable
	@cat $< | tr '\n' ' ' | sed -e 's|>|>\n|g' | sed -e 's|<|\n<|g' |  \
	$(TOOLS)/xml_macros   |  \
	grep -v '^ *$$'  > $@

jsarmor_widgets.js: jsarmor.xml
	@echo generating $@ from $<
	@$(TOOLS)/pack_widgets $<  > $@
