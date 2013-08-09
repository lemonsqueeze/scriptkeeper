function(){   // fake line, keep_editor_happy
    
    /**************************** Extension messaging ***************************/
    
    // not super robust, and won't match if there's a \n in the css.
    function get_css_prop(selector, prop, fatal)
    {
	var pat = selector + ".*" + prop + " *: *([^;]*) *;";
	var re = new RegExp(pat, 'g');
	var m = get_style().match(re);
	assert(m || !fatal, "get_css_prop(" + selector + ", " + prop + ") failed");
	if (!m)
	    return null;
	return m[m.length - 1].replace(re, '$1');
    }
    
    function update_extension_button(force)
    {
	if (in_iframe() || !bgproc)
	    return;
	update_extension_button_icon(force);
	update_extension_button_badge(force);
    }

    var extension_button;    
    function update_extension_button_icon(force)
    {	
	var needed = something_to_display();	
	var status = (needed ? mode : 'off');
	if (!force && extension_button == status) // already in the right state
	    return;
	
	bgproc.postMessage({ debug:debug_mode, mode:mode, disabled:!needed, tooltip:main_button_tooltip()});
	debug_log("sent mode to bgproc");
	extension_button = status;
    }
    
    var extension_button_badge;
    function update_extension_button_badge(force)
    {
	if (!something_to_display())
	    return;

	var o = update_badge_object();
	var needed = o.needed;
	var status = '' + o.needed + o.n + o.tooltip;
	if (!force && extension_button_badge == status) // already in the right state
	    return;
	
	var color = (!needed ? '#000' : get_css_prop('.badge_' + o.className, 'background-color', true));
	bgproc.postMessage({
	      tooltip: o.tooltip,
	      badge:
		{
		  display: (needed ? 'block' : 'none'),
		  color: '#ffffff',
		  backgroundColor: color,
		  textContent: o.n
		}
	    });
	debug_log("sending badge: needed="+needed+" n="+o.n);	
	extension_button_badge = status;
    }    

    var bgproc;    
    function extension_message_handler(e) 
    {
	var m = e.data;
	debug_log("message from background process: " + m);
	if (!bgproc)
	    bgproc = e.source;
	check_init();
	if (m == "mode request")
	{
	    update_extension_button(true);
	    return;
	}
	
	if (m == "clear temp list")
	{
	    clear_temp_list();
	    debug_log("temp list cleared");
	    bgproc.postMessage({header:"temp list cleared"});
	    return;
	}

	if (m == "tab switch")
	{
	    clear_prev_settings();
	    return;
	}
    }

    /**************************** userjs messaging ***************************/

    function init_extension_messaging()
    {
	opera.extension.onmessage = extension_message_handler; // regular msg handler fires also	
    }
    
}   // keep_editor_happy
