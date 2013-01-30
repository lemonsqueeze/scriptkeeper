function(){   // fake line, keep_editor_happy

    /********************************* Builtin ui *********************************/

    var cornerposition = 4;
    // 1 = top left, 2=top right , 3=bottom left , 4=bottom right etc.

    // can be used to display stuff in jsarmor menu from outside scripts.
    var enable_plugin_api = false;

    /********************************* Globals *********************************/

    var button_image = null;

    /***************************** iframe handling **************************/

    function iframe_icon(hn)
    {
	if (!hn.iframes || !hn.iframes.length)
	    return null;

	var n = hn.iframes.length;
	var icon = new_icon();
	icon.title = n + " iframe" + (n>1 ? "s" : "");
	//icon.title += " See details.";
	set_icon_image(icon, "iframe");
	return icon;
    }

    /****************************** UI primitives *****************************/

    function new_icon(image)
    {
      var icon = idoc.createElement('img');
      if (image)
	  set_icon_image(icon, image);
      return icon;	
    }

    function set_icon_image(icon, image_name)
    {
	icon.className = image_name;
    }
    
    function new_icon_mode(mode)
    {
	var icon = new_icon();
	set_icon_mode(icon, mode);
	return icon;
    }

    function set_icon_mode(icon, mode)
    {
      set_icon_image(icon, mode);
    }
    
    function add_menu_item(nsmenu, text, indent, f, child)
    {
      var item = idoc.createElement('div');
      item.className = 'menu_item';
      if (child)
	  item.appendChild(child);
      if (indent)				// CSSFIXME find a better way
	  item.className += " indent" + indent;
      item.innerHTML += text;
      if (f)
      {
	  item.className += " active";
	  item.onclick = f;
      }
      // make text non selectable
      item.onmousedown = function(){ return false; };
      nsmenu.appendChild(item);
      return item;
    }

    function add_mode_menu_item(nsmenu, title, tmode)
    {
	var handler = function() { set_mode(tmode); };
	var item = add_menu_item(nsmenu, title, 0, handler, new_icon_mode(tmode));
	if (mode == tmode)
	    item.className = " selected";
	return item;
    }

    function to_html(e)
    {
	if (!e)
	    return "";
	if (e.outerHTML)
	    return e.outerHTML;
	
	var d = idoc.createElement('div');
	d.innerText = e;
	return d.innerHTML;
    }

    function add_table_item(table, col1, col2, col3, col4, col5, col6, col7, f, helper_host)
    {
	var tr = idoc.createElement('tr');
	var s = "";
	s += "<td width=1%></td>";
	s += "<td width=1%>" + to_html(col1) + "</td>";
	s += "<td width=1%>" + to_html(col2) + "</td>";
	s += "<td width=1%>" + to_html(col3) + "</td>";
	s += "<td>" + to_html(col4) + "</td>";
	s += "<td width=1%>" + to_html(col5) + "</td>";
	s += "<td width=1%>" + to_html(col6) + "</td>";
	s += "<td width=1%>" + to_html(col7) + "</td>";
	tr.innerHTML = s;
	tr.childNodes[3].className = 'host';
	tr.childNodes[4].className = 'domain';
	if (helper_host)
	    tr.childNodes[4].className += ' helper';
	tr.childNodes[7].className = 'script_count';
	if (f)
	{
	    tr.className = 'active';
	    tr.onclick = f;
	}
	// make text non selectable
	tr.onmousedown = function(){ return false; };
	table.appendChild(tr);
	return tr;
    }

    function add_right_aligned_text(parent, text)
    {
	var d = idoc.createElement('div');
	d.className = 'inline_script_size';
	d.innerText = text;
	parent.appendChild(d);
	return d;
    }

    function checkbox_item_init(li, title, label, state, callback)
    {
	li.innerHTML += label; // hack
	setup_checkbox_item(li, state, callback);
    }
    
    function setup_checkbox_item(widget, current, f)
    {
	var checkbox = widget.getElementsByTagName('input')[0];
	widget.checkbox = checkbox;
	checkbox.checked = current;
	widget.onclick = f;
    }

    function scope_widget_init(widget)
    {	
	setup_radio_buttons(widget, scope, change_scope);
    }

    function setup_radio_buttons(widget, current, f)
    {
	var l = widget.getElementsByTagName('input');

	for (var i = 0; i < l.length; i++)
	{
	    var radio = l[i];
	    radio.checked = (current == i);
	    radio.number = i;
	    radio.onclick = function() { f(this.number); };

	    // take care of label if it's there
	    for (var t = radio.nextSibling; t; t = t.nextSibling)
	    {
		if (element_tag_is(t, 'label'))
		{
		    t.radio = radio;
		    t.onclick = function() { this.radio.checked = true; this.radio.onclick(); }
		    break;
		}
	    }
	}
    }

    function add_link_menu_item(menu, url, label, indent)
    {
	var max_item_length = 60;
	// truncate displayed url if too long
	if (label.length > max_item_length) { label = label.slice(0, max_item_length) + "..."; }       
	var link = '<a href="' + url + '">' + label + '</a>';
	return add_menu_item(menu, link, indent);
    }
    
    function add_menu_separator(menu)
    {
      var div = idoc.createElement('div');
      div.className = 'separator';
      menu.appendChild(div);
    }

    function new_checkbox(checked)
    {
      var c = idoc.createElement('input');
      c.type = 'checkbox';
      c.defaultChecked = checked;
      return c;
    }

    function new_button(text, f)
    {
	var button = idoc.createElement('button');
	button.innerText = text;
	button.onclick = f;
	return button;
    }

    function new_textarea(text)
    {
	var a = idoc.createElement('textarea');
	// how do we add padding to this thing ??
	a.innerText = text;
	return a;
    }

    function icon_not_loaded(hn, allowed)
    {
	var s = hn.scripts;
	var n = 0;
	for (var i = 0; i < s.length; i++)
	    if (!s[i].loaded)
		n++;
	if (!allowed || !n)
	    return null;
	
	var icon = new_icon();
	var image = "not_loaded";
	icon.title = n + " script" + (n>1 ? "s" : "") + " not loaded.";
	if (n == s.length)
	{
	    // FIXME: find a smaller/less invasive icon
	    // image = "blocked";	    
	    icon.title = "None loaded.";
	}
	icon.title += " See details.";
	set_icon_image(icon, image);
	return icon;
    }

    function init_global_icon(icon, host)
    {
	icon.title = "Allowed Globally";
	icon.className = 'img_global';
	if (host_allowed_globally(host))
	    icon.className += ' visible';	
    }

    function toggle_allow_inline(event)
    {
      block_inline_scripts = !block_inline_scripts;
      this.checkbox.checked = block_inline_scripts;
      find_element(nsmenu, "handle_noscript_tags").style.display = (block_inline_scripts ? 'block' : 'none');
      set_bool_setting('inline', block_inline_scripts);
      need_reload = true;
    }

    function toggle_handle_noscript_tags()
    {
      handle_noscript_tags = !handle_noscript_tags;
      this.checkbox.checked = handle_noscript_tags;
      set_bool_setting('nstags', handle_noscript_tags);
      need_reload = true;
    }

    /***************************** Options menu *******************************/

    function edit_css_url()
    {
	var nsmenu = new_menu("css url to use");

	var close_menu = function()
	{
	   td.removeChild(nsmenu);
	   resize_iframe();
	};
	
	var text = new_textarea(global_setting('css'));
	nsmenu.appendChild(text);

	var div = idoc.createElement('div');
	nsmenu.appendChild(div);		
	var button = new_button("Save", function()
				{
				   set_global_setting('css', text.innerText);
				   close_menu();
				});
	div.appendChild(button);
	
	var button = new_button("Cancel", close_menu);
	div.appendChild(button);	
	
	var td = idoc.getElementById('td_nsmenu');
	td.appendChild(nsmenu);
	resize_iframe();
    }

    function edit_style()
    {
	var nsmenu = new_menu("style");

	var close_menu = function()
	{
	   td.removeChild(nsmenu);
	   resize_iframe();
	};

	var style = global_setting('style');
	style = (style == '' ? builtin_style : style);
	var text = new_textarea(style);
	nsmenu.appendChild(text);

	var div = idoc.createElement('div');
	nsmenu.appendChild(div);		
	var button = new_button("Save", function()
				{
				   set_global_setting('style', text.innerText);
				   close_menu();
				});
	div.appendChild(button);
	
	var button = new_button("Cancel", close_menu);
	div.appendChild(button);	
	
	var td = idoc.getElementById('td_nsmenu');
	td.appendChild(nsmenu);
	resize_iframe();
    }
    
    function edit_whitelist()
    {
	var nsmenu = new_menu("Global Whitelist");

	var close_menu = function()
	{
	   td.removeChild(nsmenu);
	   resize_iframe();
	};
	
	var text = new_textarea(raw_list_to_string(global_setting('whitelist')));
	nsmenu.appendChild(text);
	
	var div = idoc.createElement('div');
	nsmenu.appendChild(div);		
	var button = new_button("Save", function()
	    {
	       set_global_setting('whitelist', raw_string_to_list(text.innerText));
	       close_menu();
	    });
	div.appendChild(button);
	
	var button = new_button("Cancel", close_menu);
	div.appendChild(button);
	
	var td = idoc.getElementById('td_nsmenu');
	td.appendChild(nsmenu);
	resize_iframe();
    }

    function options_menu()
    {
	var realmenu = new_menu("Options");
	var menu = find_element(realmenu, "menu_content");	
	menu.id = "options_menu";

	/*
	// FIXME: sane menu logic to handle different menus
	var need_reload = false;
	menu.onmouseout = function(e)
	{
	   if (!mouseout_leaving_menu(e, menu))
	       return;	   
	   td.removeChild(menu);
	   resize_iframe();
	   if (need_reload)
	       reload_page();
	};
	 */
	
	function remove_menu_and(f)
	{ return function()
	  {
	      //td.removeChild(menu);
	      switch_menu(null);
	    f();
	  };
	}
	
	var item = add_menu_item(menu, "Edit whitelist...", 2, remove_menu_and(edit_whitelist));
	
	if (enable_external_css)
	    var item = add_menu_item(menu, "Custom stylesheet...", 2, remove_menu_and(edit_css_url));
	
	var item = add_menu_item(menu, "Edit style...", 2, remove_menu_and(edit_style));	
	
	var item = add_menu_item(menu, "iframe logic", 2);
	var set_iframe_logic = function (n)
	{
	    iframe_logic = n;
	    set_global_setting('iframe', iframe_logic);
	    need_reload = true;
	};
	//add_radio_button(item, " Block all ",   iframe_logic, 0, set_iframe_logic);
	//add_radio_button(item, " Ask parent ",  iframe_logic, 1, set_iframe_logic);
	//add_radio_button(item, " Normal page ", iframe_logic, 2, set_iframe_logic);
	
	// show ui in iframes
	var f = function(event)
	{
	   var new_val = !global_bool_setting("iframe_ui", default_iframe_ui);
	   set_global_bool_setting("iframe_ui", new_val);
	   // update ui
	   this.checkbox.checked = new_val;
	   need_reload = true;
	};	
	var checkbox = new_checkbox(global_bool_setting("iframe_ui", default_iframe_ui));
	var item = add_menu_item(menu, "Show jsarmor interface for each iframe", 0, f, checkbox);
	item.checkbox = item.firstChild;       

	var item = add_menu_item(menu, "Reload method", 2);	
	
	add_menu_separator(menu);	

	var item = add_menu_item(menu, "Help", 0, function() { location.href = help_url; });
	var item = add_menu_item(menu, "Clear all settings", 0, reset_settings);	
	
	// Import Settings
	var form = idoc.createElement('form');
	form.id = "import_form";
	form.innerHTML = "<input type=file id=import_btn autocomplete=off >Import Settings...";
	var item = add_menu_item(menu, "", 0, function() {}, form);
	item.firstChild.firstChild.onchange = load_file;

	var item = add_menu_item(menu, "Export Settings...", 0, export_settings);	
	var item = add_menu_item(menu, "About");		

	switch_menu(realmenu);
    }    
    
    /***************************** Details menu *******************************/

    function script_detail_init(w, h, s)
    {
	var img = w.firstChild;
	var link = img.nextSibling;
	link.innerText = strip_http(s.url);
	link.href = s.url;

	var status = "blocked";
	if (allowed_host(h))
	{
	    status = "allowed";
	    if (!s.loaded)
	    {
		status = "not_loaded";
		w.title = "Script allowed, but not loaded: syntax error, bad url, or something else is blocking it.";
	    }
	}
	w.className = status;       
    }
    
    function show_details()
    {	
	var realmenu = new_menu("Scripts");
	var menu = find_element(realmenu, "menu_content");

	// FIXME show iframes urls somewhere
	foreach_host_node(function(host_node)
	{
	  var h = host_node.name;
	  var s = host_node.scripts;
	  // var item = add_menu_item(menu, h + ":");	  

	  sort_scripts(s);
	  for (var j = 0; j < s.length; j++)
	  {
	      var w = new_script_detail(h, s[j]);	      
	      menu.appendChild(w);
	  }
	});
	
//	var td = idoc.getElementById('td_nsmenu');
//	td.appendChild(menu);

	item = add_menu_item(menu, "Options ...", 0, options_menu);
	
	//show_hide_menu(false);
	switch_menu(realmenu);
    }
    
    function _show_details()
    {	
	var realmenu = new_menu("Scripts");
	var menu = find_element(realmenu, "menu_content");

	// FIXME show iframes urls somewhere
	foreach_host_node(function(host_node)
	{
	  var h = host_node.name;
	  var s = host_node.scripts;
	  // var item = add_menu_item(menu, h + ":");	  

	  sort_scripts(s);
	  for (var j = 0; j < s.length; j++)
	  {
	      var item = add_link_menu_item(menu, s[j].url, strip_http(s[j].url), 2);
	      // script status
	      var icon = new_icon();
	      var image = "blocked";
	      if (allowed_host(h))
	      {
		  image = "allowed";
		  if (!s[j].loaded)
		  {
		      image = "not_loaded";
		      icon.title = "Script allowed, but not loaded: syntax error, bad url, or something else is blocking it.";
		  }
	      }
	      set_icon_image(icon, image);

	      item.insertBefore(icon, item.childNodes[0]);
	  }	  
	});
	
//	var td = idoc.getElementById('td_nsmenu');
//	td.appendChild(menu);

	item = add_menu_item(menu, "Options ...", 0, options_menu);
	
	//show_hide_menu(false);
	switch_menu(realmenu);
    }

    

    
    /****************************** Main menu *********************************/

    function menu_init(menu, title)
    {
	var w = find_element(menu, "menu_title");
	w.innerText = title;
    }

    function menu_onmouseout(e)
    {
	if (!mouseout_leaving_menu(e, nsmenu))
	    return;
	show_hide_menu(false);
	if (need_reload)
	    reload_page();
	switch_menu(null);
    }    

    
    function _new_menu(title)
    {
	var menu = idoc.createElement('div');
	menu.className = 'menu';
	if (title != "")
	{
	    var item = add_menu_item(menu, title);
	    item.className = 'title';
	}	
	return menu;
    }

    var nsmenu = null;			// the main menu
    var need_reload = false;

    function main_menu_onmouseout(e)
    {
	if (!mouseout_leaving_menu(e, nsmenu))
	    return;
	show_hide_menu(false);
	if (need_reload)
	    reload_page();
    }

    
    function switch_menu(menu)
    {
	show_hide_menu(false);
	nsmenu.parentNode.removeChild(nsmenu);
	nsmenu = menu;
	if (menu)
	{
	    parent_menu();
	    show_hide_menu(true);
	}
    }
    
    function create_menu()
    {
	nsmenu = new_widget("main_menu");
    }

    function block_all_settings_init(widget)
    {
	var w = find_element(widget, "block_inline_scripts");
	setup_checkbox_item(w, block_inline_scripts, toggle_allow_inline);	    
	    
	var w = find_element(widget, "right_item");
	w.innerText = " [" + get_size_kb(total_inline_size) + "k]";

	if (!block_inline_scripts)
	{
	    var w = find_element(widget, "handle_noscript_tags");
	    w.style = "display:none;";
	}
    }

    function mode_menu_item_oninit()
    {
	var for_mode = this.className;
	if (for_mode == mode)
	    this.className += " selected";
	else
	    this.onclick = function() { set_mode(for_mode); }
	
	// now add host table	    
	if (mode == 'block_all' ||
	    for_mode != mode)	// is it current mode ?
	    return;
	add_host_table_after(this);
    }
    
    function main_menu_init(menu)
    {
	menu_init(menu, "JSArmor");
	
	if (mode == 'block_all')
	    wakeup_lazy_widgets(menu);
	
	function setup_mode_item_handler(w, mode)
	{
	    w.onclick = function() { set_mode(mode); };
	}
	
	// take care of mode menu items.
	for (var i = 0; i < modes.length; i++)
	{

	}
	
	var w = find_element(menu, "details_item");
	w.onclick = show_details;

	// FIXME put it back
	// plugin api
	// if (enable_plugin_api)
	// for (var prop in plugin_items)
	// if (plugin_items.hasOwnProperty(prop))
	// add_menu_item(nsmenu, plugin_items[prop], 0, null);
    }

    function parent_menu()
    {
	//parent_widget(nsmenu, "main_menu", main_ui);
	var w = find_element(main_ui, "main_menu_sibling");
	w.parentNode.insertBefore(nsmenu, w);
    }

    function show_hide_menu(show, toggle)
    {
      if (!nsmenu)
      {
	  create_menu();
	  parent_menu();
      }
      var d = (show ? 'inline-block' : 'none');
      if (toggle)
	  d = (nsmenu.style.display == 'none' ? 'inline-block' : 'none');
      nsmenu.style.display = d;
      resize_iframe();
    }

    function mouseout_leaving_menu(e, menu)
    {
	var reltg = e.relatedTarget;
	if (reltg)
	{
  	    if (reltg.id == 'jsarmor_button')
		return false; // moving back to button, doesn't count
	    while (reltg != menu && reltg.nodeName != 'HTML')
		reltg = reltg.parentNode;
	    if (reltg == menu)
		return false; // moving out of the div into a child layer
	}
	return true;
    }

    function host_table_row_onclick(event)
    {
	var h = this.host;
	var glob_icon_clicked = (event.target.parentNode.className.indexOf("allowed_globally") != -1);

	if (glob_icon_clicked)
	{
	    remove_host(h);
	    if (host_allowed_globally(h))
		global_remove_host(h);
	    else
		global_allow_host(h);
	}
	else
	{
	    if (allowed_host(h))
		remove_host(h);
	    else
		allow_host(h);
	    global_remove_host(h);	      
	}	 

	if (mode != 'filtered' && mode != 'relaxed')
	    set_mode_no_update('filtered');

	// blocking related/helper host in relaxed mode ? switch to filtered mode.
	// (related/helper hosts are always allowed in relaxed mode)
	if (mode == 'relaxed' && relaxed_mode_helper_host(h))
	    relaxed_mode_to_filtered_mode(h);
	  
	need_reload = true;
	repaint_ui_now();
    };
    
    function add_host_table_after(item)
    {
	var t = new_widget("host_table");
	item.parentNode.insertBefore(t, item.nextSibling);

	sort_domains();
	
	var found_not_loaded = false;
	var tr = null;
	foreach_host_node(function(hn, dn)
	{
	    var d = dn.name;
	    var h = hn.name;
	    var checkbox = new_checkbox(allowed_host(h));
	    var host_part = h.slice(0, h.length - d.length);
	    var not_loaded = icon_not_loaded(hn, checkbox.checked);
	    var count = "[" + hn.scripts.length + "]";
	    var helper = hn.helper_host;
	    var global_icon = idoc.createElement('img');   // globally allowed icon
	    var iframes = iframe_icon(hn);

	    tr = new_widget("host_table_row");
	    tr.host = h;
	    t.appendChild(tr);
	    
	    if (not_loaded)
		tr.childNodes[1].className += " not_loaded";
	    tr.childNodes[2].firstChild.checked = allowed_host(h);
	    tr.childNodes[3].innerText = host_part;
	    tr.childNodes[4].innerText = d;
	    if (helper)
		tr.childNodes[4].className += " helper";
	    if (iframes)
		tr.childNodes[5].className += " iframe";
	    if (host_allowed_globally(h))
		tr.childNodes[6].className += " visible";
	    tr.childNodes[7].innerText = count;

	    if (not_loaded)
		found_not_loaded = true;	    
	});
	
//	if (tr && !found_not_loaded) // indent
//	    tr.childNodes[0].innerHTML = "&nbsp;&nbsp;";	
    }

/*    
    function add_ftable(nsmenu)
    {


	var table = idoc.createElement('table');
	table.id = "jsarmor_ftable";
	nsmenu.appendChild(table);

	sort_domains();
	
	var found_not_loaded = false;
	var item = null;
	foreach_host_node(function(hn, dn)
	{
	    var d = dn.name;
	    var h = hn.name;
	    var checkbox = new_checkbox(allowed_host(h));
	    var host_part = h.slice(0, h.length - d.length);
	    var not_loaded = icon_not_loaded(hn, checkbox.checked);
	    var count = "[" + hn.scripts.length + "]";
	    var helper = hn.helper_host;
	    var icon = idoc.createElement('img');   // globally allowed icon
	    var iframes = iframe_icon(hn);
	    item = add_table_item(table, not_loaded, checkbox, host_part, d, iframes, icon, count, f, helper);
	    
	    icon = item.childNodes[6].firstChild;
	    init_global_icon(icon, h);
	    
	    item.checkbox = item.childNodes[2].firstChild;
	    item.icon = icon;
	    item.host = h;

	    if (not_loaded)
		found_not_loaded = true;
	});
	
	if (item && !found_not_loaded) // indent
	    item.childNodes[0].innerHTML = "&nbsp;&nbsp;";
    }
 */


    /**************************** Plugin API **********************************/

    // plugin api: can be used to display extra stuff in the menu from other scripts.
    // useful for debugging and hacking purposes when console.log() isn't ideal.
    if (enable_plugin_api)
    {
	var plugin_items = new Object();
	
	if (window.noscript)
	    alert("jsarmor.js: window.noscript exists!!!");
	// FIXME: this isn't great for seeing what happens in iframes ...
	window.noscript = new Object();	
	
	// API for plugins to add items to noscript's menu
	window.noscript.add_item = function(name, value)
	{
	    //console.log("noscript: plugin added item: " + name + " : " + text);
            plugin_items[name] = value;
	    if (nsmenu)
		repaint_ui();	
	};
    }
    
    /***************************** Main table *********************************/

    function main_button_tooltip()
    {
        var tooltip = "[Inline scripts] " + total_inline +
	  (block_inline_scripts ? " blocked": "") +
	  " (" + get_size_kb(total_inline_size) + "k), " +
	  "[" + current_host + "] " + blocked_current_host;
	if (blocked_current_host != total_current_host)
	    tooltip += "/" + total_current_host;
	tooltip += " blocked";
	if (loaded_current_host)
	    tooltip += " (" + loaded_current_host + " loaded)";

        tooltip += ", [Other hosts] " + blocked_external;
	if (blocked_external != total_external)
	    tooltip += "/" + total_external; 
	tooltip += " blocked";
	if (loaded_external)
	    tooltip += " (" + loaded_external + " loaded)";
	return tooltip;
    }


    function main_button_init(div)
    {
	var tooltip = main_button_tooltip();
	div.title = tooltip;
	div.className += " " + mode;
    }
    
    function main_button_onmouseover()
    {
	// console.log("button mouseover");
	show_hide_menu(true);    // menu can disappear if we switch these two, strange
	check_changed_settings();
    }
    
    function main_button_onclick()
    {
	// cycle through the modes
	if (mode == 'block_all')      set_mode('filtered');
	else if (mode == 'filtered')  set_mode('relaxed');
	else if (mode == 'relaxed')  set_mode('allow_all');
	else if (mode == 'allow_all') set_mode('block_all');
    }
    
    function main_button_onmouseout()
    {
	if (need_reload)
	    reload_page();
    }
    
    
    var main_ui = null;
    function create_main_ui()
    {
	main_ui = new_widget("main");
    }

    function parent_main_ui()
    {
	idoc.body.appendChild(main_ui);
    }

    /***************************** Repaint logic ******************************/

    var repaint_ui_count = 0;
    var repaint_ui_timer = null;
    function repaint_ui()
    {
	repaint_ui_count++;
	if (repaint_ui_timer)
	    return;
	repaint_ui_timer = window.setTimeout(repaint_ui_now, 500);
    }

    function repaint_ui_now()
    {
	repaint_ui_timer = null;	
	//   debug: (note: can't call plugins' add_item() here (recursion))
	//   plugin_items.repaint_ui = "late events:" + repaint_ui_count;	

	// menu logic slightly more complicated than just calling
	// show_hide_menu() at the end -> no flickering at all this way!!
	var menu_shown = nsmenu && nsmenu.style.display != 'none';	
	create_main_ui();
	if (menu_shown)
	    create_menu();	
	idoc.body.removeChild(idoc.body.lastChild); // remove main_ui
	parent_main_ui();
	if (menu_shown)
	{
	    parent_menu();	
	    show_hide_menu(true);
	}
    }


    

@include "jsarmor_style.js"

@include "jsarmor_widgets.js"

}   // keep_editor_happy