function(){   // fake line, keep_editor_happy

    /************************* Default Settings *******************************/
    
    var default_globally_allowed_hosts =
    ['maps.google.com',
     'maps.gstatic.com',
//     'ajax.googleapis.com',   // no need, relaxed mode will enable it
     's.ytimg.com',
     'code.jquery.com',
     'z-ecx.images-amazon.com',
     'st.deviantart.net',
     'static.tumblr.com',
     'codysherman.com'
    ];

    // Stuff we don't want to allow in relaxed mode which would otherwise be.
    var helper_blacklist =     // FIXME add ui to edit ?
    { "apis.google.com": 1,    // only used for google plus one
      "widgets.twimg.com": 1,  // twitter
      "static.ak.fbcdn.net": 1 // facebook
    };
    
    
    // default mode for new pages:
    //   block_all, filtered, relaxed or allow_all    
    var default_mode = 'relaxed';

    // block inline scripts by default for block_all mode ?
    var default_block_inline_scripts = true;

    // when inline scripts are blocked, handle <noscript> tags
    // as if javascript was disabled in opera
    var default_handle_noscript_tags = true;

    // 'block_all'   'ask_parent'   'normal_page'
    var default_iframe_logic = 'ask_parent';

    
    /********************************* Globals *********************************/

    /** stuff load_global_settings() takes care of **/
    var current_host;
    var current_domain;    
    var block_inline_scripts = false;
    var handle_noscript_tags = false;

    var iframe_logic;
    var there_is_work_todo = false;    
            
    /************************** Deferred events handling  *****************************/    

    // Sequence of events when loading a page goes:
    // - userjs scripts are run so they have a chance to register events
    // - Page scripts are run:
    //   For each script:
    //     - BeforeExternalScript fires before loading an external script
    //     - BeforeScript fires before executing both inline and external scripts
    //   Scripts which have not been blocked are run, they get a chance to register events.
    // - [...] Page loads, all kinds of stuff can happen: load focus ... 
    // * DOMContentLoaded fires: scripts can start messing with the DOM.
    // - [...] iframes start loading
    //         dynamic content added by scripts gets loaded
    // - document load event fires: document is loaded, browser button stops spinning.
    // - iframes finish loading anytime before or after that.
    
    var async_init_request = false;
    var async_init = false;  // currently only used when running inside iframe
    var sync_init = false;

    function ready()
    {	return (sync_init && async_init);  }
    
    function init()
    {
	// sync_init, async_init both false
	core_init();
	sync_init = true;
	
	if (!async_init_request)
	    async_init_finished();
	if (ready())
	    trigger_deferred_events();
    }

    function async_init_finished()
    {
	// note: unlocking async_init first implies the ordering of events might not be preserved.
	// for example if domcontentloaded fires now, it'll get handled before the queued events.
	// that's fine though, the script handlers take notice something happened even when deferred.
	async_init = true;
	if (sync_init) // ready() then  (can't set async_init yet)
	    trigger_deferred_events();
    }

    var event_queue = [];    
    function trigger_deferred_events()
    {
	// if (event_queue.length) alert("deferred events: " + event_queue.length);
	foreach(event_queue, function(o)
	{
	    o.handler(o.event, true); // deferred call
	});
	event_queue = [];
    }

    function deferred(handler, allow_unhandled_event)
    {
	return function(e)
	{
	    if (ready())
	    {
		handler(e, false); // synchronous call
		return;
	    }
	    
	    // queue it, and block current event if requested
	    event_queue.push({handler: handler, event: e});
	    if (!allow_unhandled_event)
		e.preventDefault();
	};
    }
    
    
    /********************************* Startup ************************************/    
    
    // jsarmor ui's iframe, don't recurse !
    if (window != window.top &&
	window.name == 'jsarmor_iframe')
	return;

    init();
    
    if (global_setting('whitelist') == '')
    {
	// FIXME: need a nice way to edit this.
	alert("Welcome to jsarmor !\n\n" +
	      "jsarmor's button will show up at the bottom right of pages using javascript.\n\n" +
	      "The initial global whitelist is set to:\n\n[" +
	      default_globally_allowed_hosts.join(', ') + "]");
	set_global_setting('whitelist',
			   '. ' + default_globally_allowed_hosts.join(' '));
    }

    /******************************** Normal init *******************************/

    function core_init()
    {
	init_handlers();
	check_script_storage();
	load_global_settings();
    }
	
    function load_global_settings()
    {
	load_global_context(location.hostname);
	init_iframe_logic();
    }
    
    // can be used to check on another page's settings.
    // (normal page settings that is, without iframe logic kicking in)
    // call clear_domain_nodes() afterwards to discard store changes.
    function load_global_context(host)
    {
	current_host = host;
	current_domain = get_domain(host);
	
	init_scope();
	init_mode();
    }

    
    /**************************** Mode and page stuff *************************/
    
    function reload_page()
    {
	// All of these reload from server ...
	//   location.reload(false);
	//   history.go(0);
	//   location.href = location.href;

	// Hack: simulate click on a link to reload from cache !
	var a = document.createElement('a');
	a.href = location.href;
	// a.innerText = 'this page';
	document.body.appendChild(a);
	
	// simulateClick() from
	// https://developer.mozilla.org/samples/domref/dispatchEvent.html
	var evt = document.createEvent("MouseEvents");
	evt.initMouseEvent("click", true, true, window,
			   0, 0, 0, 0, 0, false, false, false, false, 0, null);
	a.dispatchEvent(evt);	
    }

    function check_handle_noscript_tags()
    {
	if (!handle_noscript_tags)
	    return;
	
	// javascript is blocked on this page, 
	// interpret <noscript> tags as if javascript was disabled in opera	    
	
	for (var j = document.getElementsByTagName('noscript'); j[0];
	     j = document.getElementsByTagName('noscript')) 
	{
	    var nstag = document.createElement('wasnoscript');
	    nstag.innerHTML = j[0].innerText;
	    
	    j[0].parentNode.replaceChild(nstag, j[0]);
	    // once reparenting is done, we have to get tags again
	    // otherwise it misses some. weird ...		
	}
    }    
    
    function set_mode_no_update(new_mode)
    {
      if (mode != new_mode)
	  set_setting('mode', new_mode);
      mode = new_mode;
      
      if (new_mode == 'block_all')
      {
	  block_inline_scripts = bool_setting('inline',
					      default_block_inline_scripts);
	  handle_noscript_tags = bool_setting('nstags',
					      default_handle_noscript_tags);
      }
    }

// UIFIXME
    // Set mode, repaint ui, and flag for reload
    function set_mode(new_mode)
    {
	set_mode_no_update(new_mode);
	need_reload = true;
	repaint_ui_now();
    }    

    var mode;				// current_mode
    var modes = [ 'block_all', 'filtered', 'relaxed', 'allow_all' ];
    
    function init_mode()
    {
	mode = setting('mode');
	if (mode == '')
	    mode = default_mode; 
	set_mode_no_update(mode);
    }
    
    /***************************** filtering js in iframes **************************/

    var show_ui_in_iframes;    
    var iframe_message_header;
    
    function init_iframe_logic()
    {
	show_ui_in_iframes = global_bool_setting("iframe_ui", default_iframe_ui);
	iframe_message_header = "jsarmor lost iframe rescue channel:";    
	
	iframe_logic = global_setting('iframe');
	if (iframe_logic != 'block_all' && iframe_logic != 'ask_parent' && iframe_logic != 'normal_page')
	    iframe_logic = default_iframe_logic;

	// handles messages from both parent and iframes.
	if (iframe_logic == 'ask_parent')
	    window.addEventListener('message',	message_handler,	false);	    
	
	if (window == window.top) // not running in iframe ?
	    return;
	
	// switch mode depending on iframe_logic
	// TODO: add way to override with page setting *only*, which should be safe enough
	
	if (iframe_logic != 'ask_parent')
	{
	    if (iframe_logic == 'block_all')
		set_mode_no_update('block_all');
	    // 'normal_page' -> treat as normal page, nothing to do.
	    return;
	}
	
	// 'ask_parent' logic: use parent's settings to decide if we're allowed to run.
	// for that we need our parent's hostname, but because of cross-domain restrictions
	// we can't find out on our own. Ask for help ...
	async_init_request = true;
	window.parent.postMessage(iframe_message_header + location.href, '*');  // who is my parent ? this is my url.
	return;
    }

    function message_handler(e)
    {
	var m = e.data;
	if (typeof(m) != "string" ||
	    !is_prefix(iframe_message_header, m))
	    return;		// i only care about my children/parent.
	e.preventDefault();	// keep this conversation private.

	var content = m.slice(m.indexOf(':') + 1);
	var source = e.source;	// WindowProxy of sender
	// e.origin contains 'http://hostname' of the sender
	if (source === parent.window)
	    message_from_parent(e, content);
	else
	    message_from_iframe(e, content);
    }
    
    function message_from_iframe(e, url)
    {
	// alert("message from iframe: host=" + url_hostname(url));	
	e.source.postMessage(iframe_message_header + current_host, '*'); // little iframe, this is your parent.
	add_iframe(url);						 // add to menu so we can block/allow it.
	if (main_ui) // UIFIXME
	    repaint_ui();	
    }
    
    function message_from_parent(e, parent_host)
    {
	//alert("message from parent: host=" + host);
	
	// now that we know parent window's hostname we can decide what to do.
	// does our parent allow us ?
	load_global_context(parent_host);
	var allowed = allowed_host(location.hostname);
	clear_domain_nodes();	// wipe out hosts nodes this will have created
	load_global_context(location.hostname);
	
	// alert("iframe " + location.hostname + " allowed: " + allowed);
	if (!allowed)
	{
	    // can't set_mode_no_update('block_all'), it would save the setting.
	    mode = 'block_all';
	    block_inline_scripts = true;
	    handle_noscript_tags = true;
	}
	// else: allowed. treat it as a normal page: current mode applies.
	
	async_init_finished(); // happy now =)
    }

    function add_iframe(url)
    {
	var host = url_hostname(url);
	var domain = get_domain(host);
	var i = new_script(url); // iframe really

	var domain_node = get_domain_node(domain, true);
	var host_node = get_host_node(host, domain_node, true);
	host_node.iframes.push(i);
	return i;
    }

    function need_iframe_parent_handling()
    {
	return (iframe_logic == 'ask_parent' &&
		document.querySelector('iframe'));
    }
    
    // TODO show iframe placeholder ?
        
    /***************************** Host filtering *****************************/    
    
    function allow_host(host)
    {
	var l = hosts_setting();
	if (list_contains(l, host))
	    return;
	set_hosts_setting(l + ' ' + host);
    }

    function global_allow_host(host)
    {
	var l = global_setting('whitelist');
	l = (l == '' ? '.' : l);	
	if (list_contains(l, host))
	    return;
	set_global_setting('whitelist', l + ' ' + host);
    }
    
    function remove_host(host)
    {
	var l = hosts_setting();
	l = l.replace(' ' + host, '');
	set_hosts_setting(l);
    }

    function global_remove_host(host)
    {
      var l = global_setting('whitelist');
      l = l.replace(' ' + host, '');
      set_global_setting('whitelist', l);
    }
    
    function host_allowed_globally(host)
    {
	var l = global_setting('whitelist');
	return list_contains(l, host);
    }
    
    function host_allowed_locally(host)
    {
	var l = hosts_setting();
	return list_contains(l, host);
    }
    
    function filtered_mode_allowed_host(host)
    {
	return (
	    host_allowed_globally(host) ||
	    host_allowed_locally(host));
    }

    // cached in host_node.helper_host
    // dn arg optional
    function relaxed_mode_helper_host(host, dn)
    {
	dn = (dn ? dn : get_domain_node(get_domain(host), true));
	return (dn.related ||
		((dn.helper || helper_host(host)) &&
		 !helper_blacklist[host]));
    }
    
    // allow related and helper domains
    function relaxed_mode_allowed_host(host)
    {	
	return (relaxed_mode_helper_host(host) ||
		filtered_mode_allowed_host(host));
    }

    // switch to filtered mode for this site,
    // allow every host allowed in relaxed mode, except host
    function relaxed_mode_to_filtered_mode(host)
    {
	if (scope == 3)  // FIXME: should we handle others ?
	    change_scope(1);
	set_mode('filtered');
	
	foreach_host_node(function(hn)
	{
	  var h = hn.name;
	  if (relaxed_mode_allowed_host(h))
	  {
	      if (h == host)
		  remove_host(h);
	      else
		  allow_host(h);
	  }
	});      
    }
    
    function allowed_host(host)
    {
      if (mode == 'block_all') return false; 
      if (mode == 'filtered')  return filtered_mode_allowed_host(host);
      if (mode == 'relaxed')   return relaxed_mode_allowed_host(host); 
      if (mode == 'allow_all') return true;
      error('mode="' + mode + '", this should not happen!');
    }
    
    /**************************** Scripts store *******************************/
    
    function new_script(url)
    {
	var o = new Object();
	o.url = url;
	return o;
    }

    function sort_scripts(s)
    {
	s.sort(function(s1,s2){ return (s1.url < s2.url ? -1 : 1); });
    }
    
    // External scripts are stored in a 3 level tree (domain/host/script)
    // Ex: domain_nodes[0].hosts[0].scripts[0]
    // Domain/Host name: domain_nodes[0].name etc
    // FIXME: can't we use some kind of hash table ??
    var domain_nodes = [];

    function get_domain_node(domain, create)
    {
	for (var i = 0; i < domain_nodes.length; i++)
	{
	    if (domain_nodes[i].name == domain)
		return domain_nodes[i];
	}
	if (!create)
	    return null;
	var n = new Object();
	n.name = domain;
	n.related = related_domains(domain, current_domain);
	n.helper = helper_domain(domain);
	n.hosts = [];
	domain_nodes.push(n);
	return n;
    }

    function get_host_node(host, domain_node, create)
    {
	var hosts = domain_node.hosts;
	for (var i = 0; i < hosts.length; i++)
	{
	    if (hosts[i].name == host)
		return hosts[i];
	}
	if (!create)
	    return null;
	var n = new Object();
	n.name = host;
	n.scripts = [];
	n.iframes = [];
	n.helper_host = relaxed_mode_helper_host(host, domain_node); // caching
	hosts.push(n);
	return n;
    }

    function clear_domain_nodes()
    {
	domain_nodes = [];
    }

    function add_script(url, host)
    {
	var domain = get_domain(host);
	var s = new_script(url);

	var domain_node = get_domain_node(domain, true);
	var host_node = get_host_node(host, domain_node, true);
	host_node.scripts.push(s);
	return s;
    }

    function find_script(url, host)
    {
	var domain = get_domain(host);	
	var domain_node = get_domain_node(domain, false);
	assert(domain_node, "get_domain_node() failed! should not happen.");
	var host_node = get_host_node(host, domain_node, false);
	var scripts = host_node.scripts;
	for (var i = scripts.length - 1; i >= 0; i--)
	    if (scripts[i].url == url)
		return scripts[i];
	error("find_script(): should not happen.");
	return null;
    }

    // call f(host_node, domain_node) for every hosts
    function _foreach_host_node(f)
    {
	for (var i = 0; i < domain_nodes.length; i++)
	{
	    var hosts = domain_nodes[i].hosts;
	    for (var j = 0; j < hosts.length; j++)
		f(hosts[j], domain_nodes[i]);
	}
    }

    // same but in relaxed mode order:
    // helper hosts first, then the rest
    function foreach_host_node(f)
    {
	_foreach_host_node(function (hn, dn)
	{
	    if (hn.helper_host)
		f(hn, dn);
	});

	_foreach_host_node(function (hn, dn)
	{
	    if (!hn.helper_host)
		f(hn, dn);
	});
    }

    function sort_domains()
    {
	domain_nodes.sort(function(d1,d2)
	{
	    // current domain goes first
	    if (d1.name == current_domain || d2.name == current_domain)
		return (d1.name == current_domain ? -1 : 1);
	    // then related domains 
	    if (d1.related ^ d2.related)
		return (d1.related ? -1 : 1);
	    // Note: sorting between helper/non helper host done in foreach_host_node()
	    // then blacklisted helper domains
	    if (d1.helper ^ d2.helper)
		return (d1.helper ? -1 : 1);	    
	    return (d1.name < d2.name ? -1 : 1);
	});
    }

    
    /****************************** Handlers **********************************/

    var blocked_current_host = 0;
    var loaded_current_host = 0;
    var total_current_host = 0;
    
    var blocked_external = 0;
    var loaded_external = 0;
    var total_external = 0;

    var total_inline = 0;
    var total_inline_size = 0;

    function reload_script(script)
    {
	var clone = script.cloneNode(true);
	script.parentNode.replaceChild(clone, script);
    }
    
    // Handler for both inline *and* external scripts
    function beforescript_handler(e, deferred_call)
    {
      if (e.element.src) // external script
	  return;
      
      if (deferred_call && !block_inline_scripts)	// now we know it's allowed, load it !
      {
	  reload_script(e.element);
	  return;
      }
	
      total_inline++;
      total_inline_size += e.element.text.length;
      
      if (main_ui) //UIFIXME
	  repaint_ui();
      
      if (block_inline_scripts)
	e.preventDefault();
    }

    function beforeextscript_handler(e, deferred_call)
    {
	assert(element_tag_is(e.element, 'script'),
	       "BeforeExternalScript: non <script>: " + e.element.tagName);
	var url = e.element.src;
	var host = url_hostname(url);
	var allowed = allowed_host(host);	

	if (deferred_call && allowed)	// now we know it's allowed, load it !
	{
	    reload_script(e.element);
            return;
	}
	
	add_script(url, host);
	if (host == current_host)
	{
	  total_current_host++;
	  if (!allowed)
	      blocked_current_host++;
	}
	else
	{
	  total_external++;
	  if (!allowed)
	      blocked_external++;
	}

        if (!allowed)
	    e.preventDefault();
	if (main_ui) // UIFIXME
	    repaint_ui();
    }

    // Find out which scripts are actually loaded,
    // this way we can find out if *something else* is blocking
    // (blocked content, bad url, syntax error...). Awesome!    
    function beforeload_handler(ev, deferred_call)
    {	
	var e = ev.event.target;
        if (!e || !e.tagName || !element_tag_is(e, 'script') || !e.src)
	    return; // not an external script.
	assert(!deferred_call,
	       "beforeload_handler() has been deferred. That's extremely strange.");
	
	var host = url_hostname(e.src);
	var script = find_script(e.src, host);

	// FIXME for performance, could remove this
	assert(allowed_host(host),		// sanity check ...
	       "a script from\n" + host + "\nis being loaded even though it's blocked. That's a bug !!");
	
	if (host == current_host)
	    loaded_current_host++; 
	else
	    loaded_external++;
	script.loaded = 1;

	if (nsmenu)
	    repaint_ui();
    }

//UIFIXME    
    function domcontentloaded_handler(e, deferred_call)
    {
        if (!there_is_work_todo &&
	    !need_iframe_parent_handling())
            return;  // no scripts ? exit.

	if (block_inline_scripts)
	    check_handle_noscript_tags();

	// display ui in frame / iframe ?
	if (window != window.top &&
	    !show_ui_in_iframes)
	    return;
	
	create_iframe();
    }

    /**************************** Handlers setup ***************************/

    function work_todo(f)
    {
	return function(e)
	{
	    there_is_work_todo = true;
	    f(e);
	}
    }

    function init_handlers()
    {
	// deferred: events should be queued until we're initialized
    	opera.addEventListener('BeforeScript',	       work_todo(deferred(beforescript_handler)),		false);
	opera.addEventListener('BeforeExternalScript', work_todo(deferred(beforeextscript_handler)),		false);
	opera.addEventListener('BeforeEvent.load',               deferred(beforeload_handler, true),		false);
	document.addEventListener('DOMContentLoaded',            deferred(domcontentloaded_handler, true),	false);

	// message handler setup is in init_iframe_logic()
    }
    
}   // keep_editor_happy