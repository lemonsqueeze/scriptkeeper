function(){   // fake line, keep_editor_happy

    /********************************* Builtin ui *********************************/

    var default_display_blacklisted = false;

    /********************************* UI Init *********************************/

    var main_ui = null;
    var disable_main_button;
    var menu_display_timer = null;
    var ui_hpos;
    var ui_vpos;
    
    var large_font;
    var display_blacklisted;
    
    var menu_request = false;		// external api request while not ready yet (opera button ...)
    var using_opera_button = false;	// seen external api request
    
    // called on script startup, no ui available at this stage.
    function register_ui()
    {
	disable_main_button = false;
	
	// window.opera.scriptweeder.toggle_menu() api for opera buttons etc...
	message_handlers['scriptweeder_toggle_menu'] = api_toggle_menu;
	window.opera.scriptweeder.toggle_menu = function() { window.postMessage('scriptweeder_toggle_menu', '*'); };
    }

    // normal case : called only once after document_ready.
    // however, can also be called from api_toggle_menu(). This could be anytime, do some checking.
    var init_ui_done = false;
    function init_ui()
    {
	update_extension_button();
	if (!init_ui_needed())
            return;
	debug_log("init_ui()");	
	
	ui_vpos = 'top';
	ui_hpos = 'right';
	
	create_iframe();	// calls start_ui() when ready
	init_ui_done = true;
    }
    
    function init_ui_needed()
    {
	if (init_ui_done || !document_ready)
	    return false;
	if (element_tag_is(document.body, 'frameset')) // frames, can't show ui in there !
	    return false;
        if (!there_is_work_todo &&			// no scripts ?
	    !document.querySelector('iframe') &&	// no iframes ?
	    !rescue_mode())				// rescue mode, always show ui
            return false;				// don't show ui.
	
 	var force_page_ui = (window != window.top && topwin_cant_display);
	
	// don't display ui in iframes unless needed
	if (window != window.top)
	    return (show_ui_in_iframes || force_page_ui);
	
	var not_needed = disable_main_button && !menu_request;		
	return (rescue_mode() || force_page_ui || !not_needed);
    }

    function ui_needed()
    {
	return (iframe || init_ui_needed());
    }
    
    // called only once when the injected iframe is ready to display stuff.
    function start_ui()
    {
	debug_log("start_ui()");
	large_font = global_bool_setting('large_font', false);
	display_blacklisted = global_bool_setting('display_blacklisted', default_display_blacklisted);
	stored_handle_noscript_tags = global_bool_setting('nstags', default_handle_noscript_tags);	
	
	window.addEventListener('click',  function (e) { close_menu(); }, false);
	
	//set_class(idoc.body, ui_hpos);
	//set_class(idoc.body, ui_vpos);
	if (large_font)
	    idoc.body.id = 'large-font';
	
	repaint_ui_now();
	
	if (rescue_mode())
	    my_alert("Running in rescue mode, custom style disabled.");
    }
    
    function create_main_ui()
    {
	debug_log("create_main_ui");
	main_ui = new_widget("main");
    }

    function parent_main_ui()
    {
	idoc.body.appendChild(main_ui);
    }    

    /****************************** external api *****************************/

    function api_toggle_menu()
    {
	debug_log("api_toggle_menu");
	using_opera_button = true;
	menu_request = true;	 
	init_ui();
	if (!idoc)  // ui not ready yet
	    return;
	if (main_ui)
	    close_menu();
	else
	    show_hide_menu(true);
    }

    /****************************** widget handlers *****************************/


    function display_blacklisted_init(w)
    {
	set_unset_class(w, 'static', display_blacklisted);
    }
    
    function display_blacklisted_onclick(e)
    {
	display_blacklisted = !display_blacklisted;
	set_global_bool_setting('display_blacklisted', display_blacklisted);
	//repaint_ui_now();    // nono, that'd be too easy ...
	
	display_blacklisted_init(this);
	display_blacklisted_animations();
    }
        
    var items_parent_selector = '#scroller-content';
    function items_container_init(w)
    {
	var parent = w.querySelector(items_parent_selector);
	var i = 0;
	sort_domains();
	foreach_host_node(function(hn, dn)
        {
	    var d = dn.name;
	    var h = hn.name;

	    var item = new_item(hn);
	    if (comp_style(item).display != 'none')
		i++;
	    parent.appendChild(item);
	});
	if (i == 10)	// just exceed max-height by one item, allow it to display without scrolling
	{	        // otherwise gradient won't show up (first and last items have higher z-order)
	    var scroller = w.querySelector('#scroller');
	    scroller.style = 'max-height:inherit';
	}
    }

    function item_init(w, hn)
    {
	w.hn = hn;
	if (!has_class(w, 'block-animation') && !has_class(w, 'block-animation-undo')) // don't interfere with animations
	    set_unset_class(w, 'hidden', !display_blacklisted && host_blacklisted(hn.name));
	var s = w.querySelector('.slider');
	slider_init(s, hn);
	set_unset_class(w, 'top-level', (hn.name == current_host));
    }
    
    function slider_init(w, hn)
    {
	if (!hn)
	    return;
	var host = hn.name;
	w.host = host;
	w.hn = hn;
	set_slider_class(w);
	
	var d = get_domain(host);
	var h = host.slice(0, host.length - d.length);
	var n = hn.scripts.length;
	w.innerHTML = "&lrm;<b></b><i>" + h + "</i>" + d + "<u>(" + n + ")</u>";
	var b = w.querySelector('b');
	allow_once_init(b, host);
    }

    function allow_once_init(b, host)
    {
	// css hides it when not needed
	b.onclick = allow_once_or_revoke;
	b.className = '';	
	b.title = "Allow once";
	if (allowed_host(host))
	{
	    b.title = "Cancel allow once";
	    b.className = 'revoke';
	}
    }

    // hack, also sets item class !
    function set_slider_class(s)
    {
	var allowed = allowed_host(s.host);
	var blacklisted = host_blacklisted(s.host);
	
	if (blacklisted)
	    s.className = 'slider right'; 
	else
	    s.className = 'slider left';
	if (allowed || blacklisted)
	    set_class(s, 'clicked');

	var item = s.parentNode;
	set_unset_class(item, 'mode-adjusted', mode_adjusted_host(s.hn));
	set_unset_class(item, 'temp-allowed', host_temp_allowed(s.host));
	set_unset_class(item, 'whitelisted', host_allowed_globally(s.host));
    }

    function mode_adjusted_host(hn)
    {
	return ((mode == 'relaxed' && hn.helper_host) ||
		(mode == 'filtered' && hn.name == current_host && allow_current_host) ||
	        mode == 'allow_all' || mode == 'block_all');
    }
    
    function allow_once_or_revoke(e)
    {
	var s = this.parentNode;
	var host = s.host;
	save_prev_settings(); // for undo
	if (allowed_host(host))
	{
	    global_remove_host(host);
	    temp_remove_host(host);
	}
	else
	    temp_allow_host(host);
	allow_once_init(this, host);
	set_slider_class(s);
	need_reload = true;
	e.stopPropagation();	
    }
    
    function slider_onclick(e)
    {
	var host = this.host;

	save_prev_settings(); // for undo
	if (e.ctrlKey || host_blacklisted(host)) // blacklisting
	{
	    if (host_blacklisted(host))
		unblacklist_host(host);
	    else
		blacklist_animation(this.parentNode);
	}
	else // whitelisting
	{
	    if (mode_adjusted_host(this.hn))
		return; // FIXME
	    if (allowed_host(host))
	    {
		global_remove_host(host);
		temp_remove_host(host);
	    }
	    else
		global_allow_host(host);
	}
	
	set_slider_class(this);
	allow_once_init(this.querySelector('b'), host);
	need_reload = true;
    }

    // blacklist host + blacklist animation
    function blacklist_animation(item, ui_only)
    {
	var host = item.hn.name;
	if (!ui_only)
	    blacklist_host(host);
	if (display_blacklisted)
	    return;
	set_class(item, 'block-animation');
	iwin.setTimeout(function()
	{
	    set_class(item, 'hidden');
	    unset_class(item, 'block-animation');
	    resize_iframe();	    
	}, 1500);
    }

    function unblacklist_animation(item)
    {
	var host = item.hn.name;
	unblacklist_host(host);
	if (display_blacklisted)
	    return;
	resize_iframe(0, 500);
	unset_class(item, 'hidden');
	// it doesn't work if we try right away...
	iwin.setTimeout(function(){ set_class(item, 'block-animation-undo'); }, 10);
	iwin.setTimeout(function()
	{
	    unset_class(item, 'block-animation-undo');
	    resize_iframe();
	}, 1000);
    }
    
    // unblacklist animation
    function check_blacklist_animations(was_blacklisted)
    {
	foreach(was_blacklisted, function(item)
	{
	    var host = item.hn.name;
	    if (!host_blacklisted(host)) // change from blacklisted -> not blacklisted
		unblacklist_animation(item);
	});
	foreach_item(function(item, host)
	{
	    var was = (was_blacklisted.indexOf(item) != -1);
	    if (host_blacklisted(host) && !was)
		blacklist_animation(item);
	});
    }

    function display_blacklisted_animation(item)
    {
	var host = item.hn.name;
	resize_iframe(0, 500);
	unset_class(item, 'hidden');
	// it doesn't work if we try right away...
	iwin.setTimeout(function(){ set_class(item, 'block-animation-show'); }, 10);
	iwin.setTimeout(function()
	{
	    unset_class(item, 'block-animation-show');
	    resize_iframe();
	}, 1000);
    }
    
    function display_blacklisted_animations()
    {
	foreach_item(function(item, host)
	{
	    if (!host_blacklisted(host))
		return;
	    if (!display_blacklisted)
		blacklist_animation(item, true);
	    else
		display_blacklisted_animation(item);
	});
    }    
    
    function mode_menu_init(w)
    {
	var button = w.querySelector('.button');
	var menu = w.querySelector('.menu');
	set_unset_class(button, 'mode-enable-all', (mode == 'allow_all'));
	set_unset_class(button, 'mode-standard', (mode == 'filtered'));
	set_unset_class(button, 'mode-relaxed', (mode == 'relaxed'));
	set_unset_class(button, 'mode-disable-all', (mode == 'block_all'));
	foreach(menu.children, function(li)
	{
	    li.mode = li.getAttribute('mode');
	    if (li.mode == mode)
	    {
		button.innerText = li.innerText;
		li.className = 'selected';
	    }
	});	
    }

    function mode_menu_clicked(e)
    {
	set_mode(this.mode);
    }

    function disable_toolbar_button(b)
    {
	set_class(b, 'disabled');
	b.onclick = null;
    }

    function enable_toolbar_button(b)
    {
	unset_class(b, 'disabled');
	b.onclick = b.onclickhandler;
    }
    
    function allow_toolbar_init(w)
    {
	var allow_all = w.children[0];
	var temp_allow_all = w.children[1];
	var undo = w.children[2];
	undo.onclickhandler = undo.onclick; // save it
	
	if (mode == 'allow_all')	// can still allow all and undo
	    disable_toolbar_button(temp_allow_all);
	if (mode == 'block_all')	// can just undo (after blacklisting)
	{
	    disable_toolbar_button(allow_all);
	    disable_toolbar_button(temp_allow_all);
	}
	if (!have_prev_settings())
	    disable_toolbar_button(undo);
    }
    
    // for top buttons logic
    function something_to_allow(globally)
    {
	var ret = false;
	var allowed = (globally ? host_allowed_globally : allowed_host);
	foreach_host_node(function(hn, dn)
	{
	    var host = hn.name;
	    if (!allowed(host) && !host_blacklisted(host))
		ret = true;
	});
	return ret;
    }

    function allow_all_clicked(e)
    {
	var allow = (something_to_allow(true) ? true : false);	
	save_prev_settings();  // for undo	
	foreach_host_node(function(hn, dn)
	{
	    var host = hn.name;
	    if (allow && !host_allowed_globally(host) && !host_blacklisted(host))
		global_allow_host(host);
	    if (!allow && host_allowed_globally(host))
		global_remove_host(host);
	});
	update_items();		// update ui
	need_reload = true;
    }


    function temp_allow_all_clicked(e)
    {
	var allow = (something_to_allow() ? true : false);
	save_prev_settings();  // for undo		
	foreach_host_node(function(hn, dn)
	{
	    var host = hn.name;
	    if (allow && !allowed_host(host) && !host_blacklisted(host))
		temp_allow_host(host);
	    if (!allow && host_temp_allowed(host))
		temp_remove_host(host);	   
	});
	update_items();		// update ui
	need_reload = true;
    }

    function undo_clicked(e)
    {
	if (!have_prev_settings())
	    return;
	
	var blacklisted = get_blacklisted_items();
	load_prev_settings();
	check_blacklist_animations(blacklisted);
	update_items();		// update ui	
    }

    function update_items()
    {
	foreach_item(function(item)
	{
	    item_init(item, item.hn);
	});
    }

    function get_blacklisted_items()
    {
	var blacklisted = [];
	foreach_item(function(item, host)
	{
	    if (host_blacklisted(host))
		blacklisted.push(item);
	});
	return blacklisted;
    }

    function foreach_item(f)
    {
	var c = main_ui.querySelector(items_parent_selector);
	foreach(c.children, function(item){ f(item, item.hn.name); });
    }
    
    
    /***************************** Undo api *****************************/    

    function save_prev_settings()
    {
	var settings = { whitelist:whitelist, blacklist:blacklist, templist:templist };
	set_global_setting('prev_settings', window.JSON.stringify(settings));

	var b = main_ui.querySelector('#allow-toolbar .undo');
	enable_toolbar_button(b);		// enable undo button
    }

    function load_prev_settings()
    {
	var settings = 	global_setting('prev_settings');
	save_prev_settings();
	assert(settings != '', 'load_prev_settings() called but no prev settings exists !');
	settings = window.JSON.parse(settings);
	whitelist = settings.whitelist;
	blacklist = settings.blacklist;
	templist = settings.templist;
	set_global_setting('whitelist', serialize_name_hash(whitelist));
	set_global_setting('blacklist', serialize_name_hash(blacklist));
	set_global_setting('templist', serialize_name_hash(templist));
	need_reload = true;
    }

    function clear_prev_settings()
    {
	set_global_setting('prev_settings', '');

	try {
	    var b = main_ui.querySelector('#allow-toolbar .undo');
	    disable_toolbar_button(b);		// disable undo button
	}
	catch(e) {}
    }
    
    function have_prev_settings()
    {
	return (global_setting('prev_settings') != '');
    }

    
    /***************************** Options menu ******************************/
    
    function options_clicked(e, section)
    {
	if (e && main_ui.id == 'options') // dismiss
	{
	    repaint_ui_now();
	    return;
	}
	var w = new_options(section);
        switch_menu(w);	
    }
    
    var options_sections = ["general", "whitelist", "blacklist", "import_export"];
    
    function options_init(w, section)
    {
	if (!section)
	    section = "general";
	var s = new_widget("options_" + section);
	if (s.hasAttribute("extra_height"))
	    w.extra_height = parseInt(s.getAttribute("extra_height"));
	w.insertBefore(s, w.lastChild);

	// set selected menu item
	var button = w.querySelector('.button');	
	var menu_items = w.querySelector('.menu ul').children;
	var i = options_sections.indexOf(section);
	set_class(menu_items[i], 'selected');
	button.innerText = menu_items[i].innerText;	

	var icon = w.querySelector('#options-button');
	set_class(icon, 'static');
    }

    function options_menu_onclick(e)
    {
	// get parent index
	for (var i = 0; i < this.parentNode.children.length; i++)
	    if (this.parentNode.children[i] == this)
		break;
	options_clicked(null, options_sections[i]);
    }

    /***************************** Options general ******************************/

    function toggle_large_font(checked)
    {
	large_font = checked;
	set_global_bool_setting('large_font', large_font);
	need_reload = true;
    }

    // this one is special, value depends on mode ...
    var stored_handle_noscript_tags;
    function toggle_handle_noscript_tags(checked)
    {
	set_global_bool_setting('nstags', checked);
	need_reload = true;
    }

    function select_reload_method_init(w)
    {
	setup_dropdown(w, reload_method, function(value)
        {
	    reload_method = value;
	    set_global_setting('reload_method', reload_method);
        });
    }

    function select_allow_current_host_init(w)
    {
	setup_dropdown(w, (allow_current_host ? 'y' : 'n'), function(value)
        {
	    set_global_bool_setting('allow_current_host', value == 'y');
	    need_reload = true;
        });
    }
    
    function select_iframe_logic_init(w)
    {
	setup_dropdown(w, iframe_logic, function(value)
        {
	    set_global_setting('iframe_logic', value);
	    need_reload = true;
        });
    }
    
    /***************************** Options whitelist ******************************/
    
    function options_whitelist_init(w)
    {
	var l = w.querySelector('ul');
	l.innerHTML = "";  // throw children away if any
	foreach(get_keys(whitelist).sort(), function(host)
	{
	    var li = new_list_item(host);
	    l.appendChild(li);
	});
    }

    // remove selected items
    function options_whitelist_remove(e)
    {
	var l = this.parentNode.querySelector('ul');
	foreach(l.children, function(li)
	{
	    if (!has_class(li, 'clicked'))
		return;
	    global_remove_host(li.host);
	    need_reload = true;
	});
	options_clicked(null, "whitelist"); // refresh ui
    }

    function options_whitelist_add(e)
    {
	var entry = this.previousSibling;
	entry.ignore = false;  // for onchange
	unset_class(entry, 'hide');
	set_class(entry, 'show');
	set_class(this, 'confirm');
	iwin.setTimeout(function(){entry.focus()}, 500);
	this.onclick = options_whitelist_confirm;
	resize_iframe(0, 35); // guys, we need extra height
    }

    function options_whitelist_confirm(e)
    {
	var entry = this.previousSibling;
	if (entry.value != '')
	{
	    global_allow_host(entry.value);
	    need_reload = true;
	}
	// that'd be the easy way...
	// options_clicked(null, 'whitelist');
	// return;

	entry.value = ''; // clear it
	unset_class(entry, 'show');
	set_class(entry, 'hide');
	unset_class(this, 'confirm');
	this.onclick = options_whitelist_add;
	options_whitelist_init(this.parentNode); // update list
	//resize_iframe();
    }

    function list_entry_onchange(e)
    {
	// onchange fires twice with enter key, ignore 2nd one
	if (this.ignore)
	    return;
	this.ignore = true;
	this.nextSibling.onclick(null);
    }

    /***************************** Options blacklist ******************************/
    
    function options_blacklist_init(w)
    {
	var l = w.querySelector('ul');
	l.innerHTML = "";  // throw children away if any
	foreach(get_keys(blacklist).sort(), function(host)
	{
	    var li = new_list_item(host);
	    l.appendChild(li);
	});
    }

    // remove selected items
    function options_blacklist_remove(e)
    {
	var l = this.parentNode.querySelector('ul');
	foreach(l.children, function(li)
	{
	    if (!has_class(li, 'clicked'))
		return;
	    unblacklist_host(li.host);
	    need_reload = true;
	});
	options_clicked(null, "blacklist"); // refresh ui
    }

    function options_blacklist_add(e)
    {
	var entry = this.previousSibling;
	entry.ignore = false;  // for onchange
	unset_class(entry, 'hide');
	set_class(entry, 'show');
	set_class(this, 'confirm');
	iwin.setTimeout(function(){entry.focus()}, 500);
	this.onclick = options_blacklist_confirm;
	resize_iframe(0, 35); // guys, we need extra height
    }

    function options_blacklist_confirm(e)
    {
	var entry = this.previousSibling;
	if (entry.value != '')
	{
	    blacklist_host(entry.value);
	    need_reload = true;
	}
	// that'd be the easy way...
	// options_clicked(null, 'blacklist');
	// return;

	entry.value = ''; // clear it
	unset_class(entry, 'show');
	set_class(entry, 'hide');
	unset_class(this, 'confirm');
	this.onclick = options_blacklist_add;
	options_blacklist_init(this.parentNode); // update list
	//resize_iframe();
    }

    
    /***************************** Options import export ******************************/    

    function export_settings_onclick(e)
    {
        if (e.shiftKey)
            export_settings(null, true);
        else
            export_settings();
    }

    function import_settings_init()
    {   this.onchange = file_loader(parse_settings_file); }    

    
    /***************************** Checkbox items ******************************/
    
    function checkbox_item_init(wrapper, id, title, label, state, callback, klass)
    {
	var div = wrapper.children[0];
	var span = wrapper.children[1];
        div.id = id;
        if (klass)
	    set_class(div, klass);
        span.title = title;
        span.innerHTML = label;
	
        span.div = div;
	set_unset_class(div, 'checked', state);
	div.f = callback;
    }

    function checkbox_item_onclick(e)
    {
	var div = this;
	if (element_tag_is(this, 'span'))
	    div = this.div;
	toggle_class(div, 'checked');
	div.f(has_class(div, 'checked'));
    }

    function disable_checkbox(w)
    {
        w.querySelector('input').disabled = true;
        w.onclick = null;
    }

    /***************************** dropdowns ******************************/

    function setup_dropdown(w, current, callback)
    {
	var button = w.querySelector('.button');
	var menu = w.querySelector('ul');
	foreach(menu.children, function(li)
	{
	    assert(li.hasAttribute("value"), "dropdown content with no value attribute set !");
	    li.val = li.getAttribute("value"); // can't use value
	    li.onclick = function()
	    {
	        callback(this.val);
		setup_dropdown(w, this.val, callback);  // update ui
	    };
	    if (li.val == current)
		button.innerText = li.innerText;
	    set_unset_class(li, 'selected', li.val == current);
	});	
    }
    
    
    /***************************** List items ******************************/
    
    function list_item_init(w, host)
    {
	var d = get_domain(host);
	var h = host.slice(0, host.length - d.length);
	w.host = host;
	w.innerHTML = "<i>" + h + "</i>" + d;
    }

    function list_item_onclick(e)
    {
	toggle_class(this, 'clicked');
    }

    /***************************** Menu logic ******************************/

    var need_reload;
    var need_repaint;
    
    function switch_menu(menu)
    {
	main_ui.parentNode.removeChild(main_ui);
	main_ui = menu;
	idoc.body.appendChild(menu);
	resize_iframe();
    }

    function close_menu()
    {
	show_hide_menu(false);
	main_ui.parentNode.removeChild(main_ui);
	main_ui = null;
	
	if (need_reload)
            reload_page();
        if (need_repaint)
        {
            need_repaint = false;
            repaint_ui_now();
        }	
    }

    function show_hide_menu(show)
    {
	if (!main_ui)
	    repaint_ui_now();
        var d = (show ? 'block' : 'none');
        main_ui.style.display = d;
        resize_iframe();
    }
    
    /***************************** CSS Editor ******************************/
  
    function style_editor()
    {
        var w = new_editor_window("Style Editor",
                                  get_style(),
                                  builtin_style,
                                  function(text)
        {
           set_global_setting('css', text);
           need_reload = true;
           close_menu();
        });
        w.id = 'style_editor';
        switch_menu(w);
    }

    function editor_window_init(w, title, text, default_setting, save_callback)
    {
        w.querySelector('#menu_title').innerText = title;
        var editor = w.querySelector('.editor');
        editor_init(editor, text, default_setting, save_callback);
    }
   
    // setting text works fine the first time but that's about it, so ...   
    function replace_textarea(t, text)
    {
        var n = new_widget("my_textarea");
        n.innerText = text;
        t.parentNode.replaceChild(n, t);
    }

    function editor_init(w, text, default_setting, save_callback)
    {
        function get_textarea() { return w.querySelector('textarea'); }
        
        replace_textarea(get_textarea(), text);
        w.querySelector('button.save').onclick = function()
        {
            // note: textarea.textContent doesn't change after edits !
            save_callback(get_textarea().innerText);
        };
        
        var b = w.querySelector('button.default');
        if (!default_setting)
            b.style = "display:none";
        else
        {
            b.style = "display:auto";       
            b.onclick = function(){  replace_textarea(get_textarea(), default_setting)  };
        }
    }    
    
    
    /***************************** Repaint logic ******************************/

    var repaint_ui_timer = null;
    function repaint_ui()
    {
	if (!main_ui)
	{
	    init_ui();
	    return;
	}	
	if (repaint_ui_timer)
	    return;
	repaint_ui_timer = iwin.setTimeout(repaint_ui_now, 500);
    }

    function repaint_ui_now()
    {
	update_extension_button();
	repaint_ui_timer = null;
	//   debug: (note: can't call plugins' add_item() here (recursion))
	//   plugin_items.repaint_ui = "late events:" + repaint_ui_count;	

	// menu logic slightly more complicated than just calling
	// show_hide_menu() at the end -> no flickering at all this way!!
	menu_request = false;	// external api menu request (opera button ...)

	var old = main_ui;
	create_main_ui();
	if (old)
	    old.parentNode.removeChild(old); // remove main_ui
	parent_main_ui();
	resize_iframe();
    }

@include "scriptkeeper_style.js"

@include "scriptkeeper_widgets.js"

}   // keep_editor_happy