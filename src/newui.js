function(){   // fake line, keep_editor_happy

    /********************************* Builtin ui *********************************/

    var default_ui_position = 'bottom_right';
    var default_autohide_main_button = false;
    var default_transparent_main_button = true;
    var default_fat_icons = false;
    var default_font_size = 'normal';
    var default_menu_display_logic = 'auto';
    var default_show_scripts_in_main_menu = true;
    
    // can be used to display stuff in scriptweeder menu from outside scripts.
    var enable_plugin_api = false;

    /********************************* UI Init *********************************/

    var main_ui = null;
    var autohide_main_button;
    var transparent_main_button;
    var fat_icons;
    var font_size;
    var disable_main_button;
    var menu_display_logic;		// auto   delay   click
    var menu_display_timer = null;
    var show_scripts_in_main_menu;
    var ui_position;
    var ui_hpos;
    var ui_vpos;
    
    var menu_request = false;		// external api request while not ready yet (opera button ...)
    var using_opera_button = false;	// seen external api request
    var submenu = null;
    var nsmenu = null;
    
    // called on script startup, no ui available at this stage.
    function register_ui()
    {
	disable_main_button = global_bool_setting('disable_main_button', false);
	
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
	if (init_ui_done || !document_ready || !ui_needed())
            return;
	debug_log("init_ui()");	
	
	ui_position = global_setting('ui_position', default_ui_position);
	ui_vpos = 'top';
	ui_hpos = 'right';
	
	create_iframe();	// calls start_ui() when ready
	init_ui_done = true;
    }
    
    function ui_needed()
    {
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
    
    // called only once when the injected iframe is ready to display stuff.
    function start_ui()
    {
	debug_log("start_ui()");
	autohide_main_button = global_bool_setting('autohide_main_button', default_autohide_main_button);
	transparent_main_button = global_bool_setting('transparent_main_button', default_transparent_main_button);
	fat_icons = global_bool_setting('fat_icons', default_fat_icons);
	font_size = global_setting('font_size', default_font_size);
	menu_display_logic = global_setting('menu_display_logic', default_menu_display_logic);
	show_scripts_in_main_menu = global_bool_setting('show_scripts_in_main_menu', default_show_scripts_in_main_menu);
	
	if (menu_display_logic == 'click')
	    window.addEventListener('click',  function (e) { close_menu(); }, false);
	
	//set_class(idoc.body, ui_hpos);
	//set_class(idoc.body, ui_vpos);
	
	repaint_ui_now();
	
	if (rescue_mode())
	    my_alert("Running in rescue mode, custom style disabled.");
    }
    
    function create_main_ui()
    {
	debug_log("create_main_ui");
	main_ui = new_widget("main");
	return;
	
	main_ui = idoc.createElement('div');
	main_ui.id = 'main';
	main_ui.className = '';
	main_ui.innerText = 'foooo';	
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
	if (!main_ui)
	{
	    menu_request = true;	    
	    init_ui();	// safe to call multiple times
	    return;
	}
	if (nsmenu)
	    close_menu();
	else	    
	    show_hide_menu(true);
    }

    /****************************** widget handlers *****************************/

    function items_container_init(w)
    {
	var i = 0;
	sort_domains();
	foreach_host_node(function(hn, dn)
        {
	    var d = dn.name;
	    var h = hn.name;

	    var item = new_item(hn);
	    w.appendChild(item);
	    i++;
	});
    }

    function item_init(w, hn)
    {
	var s = w.querySelector('.slider');
	slider_init(s, hn);
	if (hn.name == current_host)
	    set_class(w, 'top-level');
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
	set_unset_class(item, 'allowed-once', host_temp_allowed(s.host));	
    }

    function mode_adjusted_host(hn)
    {
	return ((mode == 'relaxed' && hn.helper_host) ||
		(mode == 'filtered' && hn.name == current_host));
    }
    
    function allow_once_or_revoke(e)
    {
	var s = this.parentNode;
	var host = s.host;
	if (allowed_host(host))
	{
	    global_remove_host(host);
	    temp_remove_host(host);
	}
	else
	    temp_allow_host(host);
	allow_once_init(this, host);
	set_slider_class(s);	
	e.stopPropagation();
    }
    
    function slider_onclick(e)
    {
	var host = this.host;

	if (e.ctrlKey || host_blacklisted(host)) // blacklisting
	{
	    if (host_blacklisted(host))
		unblacklist_host(host);
	    else
		blacklist_host(host);
	}
	else // whitelisting
	{
	    if (mode == 'relaxed' && relaxed_mode_helper_host(host) ||
		mode == 'allow_all' || mode == 'block_all')
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