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
	if (!ui_needed())
	    return;
	debug_log("init_ui()");	
	
	ui_position = global_setting('ui_position', default_ui_position);
	ui_vpos = 'top';
	ui_hpos = 'left';
	
	create_iframe();	// calls start_ui() when ready
	init_ui_done = true;
    }
    
    function ui_needed()
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
	main_ui_parented();
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
    
    function main_ui_parented()
    {
	var items = main_ui.getElementsByClassName('item');
	var max_width = 0;	
	foreach(items, function(item)
	{
	    max_width = max(item_host_offset(item), max_width);
	});
	//alert('max width: ' + max_width);

	foreach(items, function(w)
	{
	    var offset = item_host_offset(w);
	    w.querySelector('i').style = 'margin-left:' + (max_width - offset) + 'px;';
	});	    
    }
    
    function items_container_init(w)
    {
	foreach_host_node(function(hn, dn)
        {
	    var d = dn.name;
	    var h = hn.name;
	    var allowed = allowed_host(h);
	    var item = new_item(h, allowed);
	    item.allowed = allowed;
	    if (h == current_host)
		set_class(item, 'top-level');
	    w.appendChild(item);
	});
    }

    function item_init(w, host, allowed)
    {
	var s = w.querySelector('.slider');
	slider_init(s, host);
	if (allowed)
	    set_class(s, 'allowed');
    }

    function item_host_offset(w)
    {
	var i = w.querySelector('i');
	//if (i.innerHTML != '')
	// assert(false, "clientWidth == 0 !");
	var o = i.clientWidth;
	if (w.allowed)
	    o += 35;
	return o;
    }

    function slider_init(w, host)
    {
	var d = get_domain(host);
	var h = host.slice(0, host.length - d.length);
	w.innerHTML = "<i>" + h + "</i>" + d;
    }

    function slider_onmousedown(e)
    {
	this.origx = e.screenX;
	this.origleft = this.offsetLeft;
	unset_class(this, 'slider_animation');
	this.onmousemove = slider_onmousemove;
    }

    function slider_onmouseup(e)
    {
	this.onmousemove = null;
	var offset = e.screenX - this.origx;
	if (offset) 
	    offset = (offset > 0 ? 35 : 0);
	else  // just click ? toggle then
	    offset = (this.origleft ? 0 : 35);

	set_class(this, 'slider_animation');
	this.style.left = offset + 'px';
	//if (offset != this.origleft)
	//  alert("changed!");
    }

    function slider_onmousemove(e)
    {
	var offset = this.origleft + (e.screenX - this.origx);
	offset = min(offset, 35);
	offset = max(offset, 0);
	//this.style = 'left:' + offset + 'px;';
	this.style.left = offset + 'px';
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

@include "scriptweeder_style.js"

@include "scriptweeder_widgets.js"

}   // keep_editor_happy