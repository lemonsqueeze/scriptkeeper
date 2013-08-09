function(){   // fake line, keep_editor_happy
    
    /**************************** Extension messaging ***************************/

    var extension_button;
    function update_extension_button(force)
    {
	if (!bgproc)
	    return;
	
	var needed = something_to_display();	
	var status = (needed ? mode : 'off');
	if (!force && extension_button == status) // already in the right state
	    return;

	bgproc.postMessage({ debug:debug_mode, mode:mode, disabled:!needed});
	debug_log("sent mode to bgproc");
	extension_button = status;
    }

    var bgproc;    
    function extension_message_handler(e, m) 
    {
	debug_log("message from background process: " + m);
	if (!bgproc)
	    bgproc = e.source;
	check_init();
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
    
	update_extension_button(true);
    }

    /**************************** userjs messaging ***************************/

/*    
    var bgproc;
    function ujsfwd_before_message(ujs_event)
    {
	var e = ujs_event.event;
	var m = e.data;

	// if 2nd msg from bgproc,
	// won't even get called, userjs uses beforeEvent.message and will cancel it.
	debug_log("[msg] " + m);
	
	if (m == "scriptkeeper bgproc to injected script:")  // hello from bgproc
	{
	    bgproc = e.source;
	    ujs_event.preventDefault(); // keep this private
	    return;
	}
	
	if (m && m.scriptkeeper) // from userjs, forward to bgproc
	{
	    debug_log("forwarding to bgproc");
	    bgproc.postMessage(m);
	    ujs_event.preventDefault(); // keep this private
	}
	// other msg, leave alone
    }
    
    function forward_to_userjs()
    {
	if (!window.opera.scriptkeeper) // userjs is not running
	    return false;
	
	opera.extension.onmessage = function(){};  // just so we get an event
	// this is enough for userjs beforeEvent to fire,
	// so no need to forward anything in this direction.
	window.opera.addEventListener('BeforeEvent.message', ujsfwd_before_message, false);
	debug_log("userjs detected, handing over and forwarding");
	return true;
    }
 */

    function init_extension_messaging()
    {
	opera.extension.onmessage = function(e){}; // so we get an event, and catch it with beforeEvent
	message_handlers["scriptkeeper background process:"] = extension_message_handler;
    }
    
}   // keep_editor_happy
