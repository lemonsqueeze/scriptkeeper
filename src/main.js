// ==UserScript==
// @name ScriptKeeper
// @author laurenbacall, lemonsqueeze https://github.com/lemonsqueeze/scriptweeder
// @description Block unwanted javascript. noscript on steroids for opera !
// @license GNU GPL version 2 or later version.
// @published $Date$
// ==/UserScript==


// This file is put together from the different bits and pieces in the repository.
// Some parts like the ui layout are generated from sources that are much nicer to
// work with. You can edit it directly if you want, but if you're going to be hacking
// this thing i'd suggest cloning the repository and working in there instead.
// Then you can just type 'make' and it'll regenerate the whole thing.

// When running as userjs, document and window.document are the same,
// but when running as an extension they're 2 different things, beware !
(function(document, location, opera, scriptStorage)
{
    var version_number = "1.5.5";
    var version_type = "userjs";
    var version_date = "$Date$";
    var version_full = "scriptkeeper " + version_type + " v" + version_number + ", " + version_date + ".";
    
@include "core.js"
@include "sk_filter.js"
@include "settings.js"
@include "sk_extension.js"
@include "userjs_ui.js"
@include "utils.js"
@include "sk_ui.js"
    
    /********************************* Startup ************************************/    

    // quiet: no page redirect
    function startup_checks(quiet)
    {
	if (in_iframe()) // don't redirect to start page in iframes.
	    return;
	
        // first run setup
        if (global_setting('mode') == '')
        {
            set_global_setting('mode', default_mode);
            set_global_setting('version_number', version_number);
            set_global_setting('version_type', version_type);
	    default_filter_settings();	    
	}
	
	// upgrade from previous version
	if (global_setting('version_number') != version_number)
	{
	    var from = global_setting('version_number');
	    set_global_setting('version_number', version_number);	    
	}
    }

    // to run safely as extension, only thing that should be done here is event registration.
    // see http://my.opera.com/community/forums/topic.dml?id=1621542
    // for userjs doesn't matter, we could init() here no problem.
    function boot()
    {
	// scriptkeeper ui's iframe, don't run in there !
	if (in_iframe() && window.name == 'scriptkeeper_iframe')	// TODO better way of id ?
	    return;
	if (location.hostname == "")	// bad url, opera's error page. 
	    return;
	
	setup_event_handlers();
	window.opera.scriptkeeper = new Object();	// external api
	window.opera.scriptkeeper.version = version_number;
	window.opera.scriptkeeper.version_type = version_type;	
	debug_log("start");	
    }
    
    //if (forward_to_userjs())   // userjs detected, let it takeover and forward messages to it.
    //   return;
    
    boot();

})(window.document, window.location, opera, widget.preferences);
