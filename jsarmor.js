(function(opera, scriptStorage) {
    var version = 'Noscript v1.26b';

    /************************* Default Settings *******************************/

// WARNING: global domains functionality disabled in this version
//    var default_globally_allowed_domains =
//    ['googleapis.com', 'images-amazon.com', 'ytimg.com', 'media-imdb.com', 'deviantart.net', 'jquery.com'];
    
    var cornerposition = 4;
    // 1 = top left, 2=top right , 3=bottom left , 4=bottom right etc.
    var blocksitescripts=false;

    // default mode for new pages:
    //   block_all, filtered, or allow_all    
    var default_mode = 'filtered';

    // block inline scripts by default ?
    var default_block_inline_scripts = false;

    // when inline scripts are blocked, handle <noscript> tags
    // as if javascript was disabled in opera
    var default_handle_noscript_tags = true;
    
    /**************************************************************************/    
    
//    if (global_setting('noscript') == '')
//    {
//	alert("Noscript:\nNo prior settings found.\n" +
//	      "Setting globally allowed domains to:\n[" +
//	      default_globally_allowed_domains + "]");
//	set_global_setting('noscript', '. ' + default_globally_allowed_domains.join(' '));
//    }
    
//    var inside_frame = 0;
//    if (window != window.top) { inside_frame = 1; }

    var current_host = location.hostname;

    
    function new_style(str)
    {
	var pa= document.getElementsByTagName('head')[0] ;
	var el= document.createElement('style');
	el.type= 'text/css';
	el.media= 'screen';
	el.appendChild(document.createTextNode(str));
	pa.appendChild(el);
	return el;
    }

    // local settings are per host
    function local_setting(name)
    {
	return global_setting(location.hostname + ':' + name);
    }

    function set_local_setting(name, value)
    {
	set_global_setting(location.hostname + ':' + name, value);
    }

    function global_setting(name)
    {
	// to view content -> opera:webstorage  
	var o=scriptStorage.getItem(name);
	if (o == null)
	    return '';
	return o;
    }

    function set_global_setting(name, value)
    {
	scriptStorage.setItem(name, value);
    }

    function reload_page()
    {
	location.reload();
    }

    var button_image = new_icon_mode('block_all');
    
    // block_all, filtered, allow_all    
    var mode = local_setting('noscript_mode');
    if (mode == '')
	mode = default_mode; 
    set_mode_no_update(mode);

    var block_inline_scripts;
    var c = local_setting('noscript_inline');
    if (c == '')
      block_inline_scripts = default_block_inline_scripts;
    else
      block_inline_scripts = (c != 'y');

    var handle_noscript_tags;

    function toggle_allow_inline()
    {
      block_inline_scripts = !block_inline_scripts;
      set_local_setting('noscript_inline', (block_inline_scripts ? 'n' : 'y'));
      reload_page();      
    }

    function toggle_handle_noscript_tags()
    {
      handle_noscript_tags = !handle_noscript_tags;
      set_local_setting('noscript_nstags', (handle_noscript_tags ? 'y' : 'n'));
      reload_page();      
    }
    
    function show_details()
    {	
	var nsdetails = document.createElement('div');
	nsdetails.align = 'left';
	nsdetails.style="border-width: 2px; border-style: outset; border-color: gray; background:#abb9ca;";
//        nsdetails.style.display = 'inline-block';

	nsdetails.onmouseout = function(e) {

	  if (!e)
	      var e = window.event;
	  // object we're moving out of
	  // var tg = (window.event) ? e.srcElement : e.target;
	  // if (tg != nsdetails) // moving out of one its children.
	  //  return; we actually need that case!
	  
	  // e.relatedTarget: object we're moving to.
	  var reltg = e.relatedTarget;
	  while (reltg != nsdetails && reltg.nodeName != 'HTML')
	    reltg= reltg.parentNode
	  if (reltg == nsdetails)
	      return; // moving out of the div into a child layer
	  
	  td.removeChild(nsdetails);	  
	};
	
	var item = add_menu_item(nsdetails, "Scripts:");
	item.align = 'center';
	item.style = 'background-color:#0000ff; color:#ffffff; font-weight:bold;';
	add_menu_separator(nsdetails);	

	foreach_host_node(function(host_node)
	{
	  var h = host_node.name;
	  var s = host_node.scripts;
	  // var item = add_menu_item(nsdetails, h + ":");	  

	  sort_scripts(s);
	  for (var j = 0; j < s.length; j++)
	  {
	      var item = add_link_menu_item(nsdetails, "http://" + s[j].url, s[j].url, 2);
	      // script status
	      var icon = new_icon();
	      var image = 'Transfer Stopped';
	      if (allowed_host(h))
	      {   // FIXME when adding whitelisting support, add icon for it here
		  image = 'Transfer Success';
		  if (!s[j].loaded)
		  {
		      image = 'Transfer Size Mismatch';
		      icon.title = "Script allowed but not loaded, bad url or something else is blocking it.";
		  }
	      }
	      set_icon_image(icon, image);

	      item.insertBefore(icon, item.childNodes[0]);
	  }	  
	});
	
	var td = document.getElementById('td_nsmenu');
	td.appendChild(nsdetails);

	show_hide_menu(false);
        nsdetails.style.display = 'inline-block';
    }

    function set_mode_no_update(new_mode)
    {
      mode = new_mode;
      // allow current host by default
      if (new_mode == 'filtered' && local_setting('ns_hosts') == '')
	  allow_host(current_host);
      set_local_setting('noscript_mode', mode);
      set_icon_mode(button_image, mode);
    }
    
    function set_mode(new_mode)
    {
      set_mode_no_update(new_mode);
      show_hide_menu(false);
      reload_page();
    }    

    function allow_host(host)
    {
	var l = local_setting('ns_hosts');
	l = (l == '' ? '.' : l);
	if (list_contains(l, host))
	    return;
	set_local_setting('ns_hosts', l + ' ' + host);
    }

//    function global_allow_host(host)
//    {
// FIXME
//	var l = global_setting('noscript');
//	l = (l == '' ? '.' : l);	
//	if (list_conains(l, domain))
//	    return;
//	set_global_setting('noscript', l + ' ' + domain);
//    }
    
    function remove_host(host)
    {
      var l = local_setting('ns_hosts');
      l = l.replace(' ' + host, '');
      set_local_setting('ns_hosts', l);
    }

//    function global_remove_host(host)
//    {
// FIXME    
//      var l = global_setting('noscript');
//      l = l.replace(' ' + domain, '');
//      set_global_setting('noscript', l);
//    }

    function url_hostname(url)
    {
        var t = document.createElement('a');
        t.href = url;
        return t.hostname;
    }
    
    function get_domain(h)
    {
      var i = h.lastIndexOf(".");
      var j = h.lastIndexOf(".", i-1);
      if (i - j == 3) // .co.uk style domain
	  j = h.lastIndexOf(".", j-1); 
      if (j != -1)
	  return h.slice(j+1);     
      return h;
    }

    function list_contains(list, str)
    {
      return (list && list.indexOf(' ' + str) != -1);
    }

//    function domain_allowed_globally(domain)
//    {
//	var l = global_setting('noscript');
//	return list_contains(l, domain);
//    }
    
    function host_allowed_locally(host)
    {
	var l = local_setting('ns_hosts');
	return list_contains(l, host);
    }
    
    function filtered_mode_allowed_host(host)
    {
	return (
//	    domain_allowed_globally(domain) ||
	    host_allowed_locally(host));
    }
    
    function allowed_host(host)
    {
      if (mode == 'block_all') return false; 
      if (mode == 'filtered')  return filtered_mode_allowed_host(host); 
      if (mode == 'allow_all') return true;
      alert('noscript.js: mode="' + mode + '", this should not happen!');
    }

    function check_handle_noscript_tags()
    {
	handle_noscript_tags = local_setting('noscript_nstags');
	if (handle_noscript_tags == '')
	    handle_noscript_tags = default_handle_noscript_tags;
	else
	    handle_noscript_tags = (handle_noscript_tags == 'y');
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
    
    function new_icon(image)
    {
      var icon = document.createElement('img');
      icon.style = "width:22px;height:22px; vertical-align:middle;";
      if (image)
	  set_icon_image(icon, image);
      return icon;	
    }

    function set_icon_image(icon, image_name)
    {
	icon.style.background = "-o-skin('" + image_name + "')";
    }
    
    function new_icon_mode(mode)
    {
	var icon = new_icon();
	set_icon_mode(icon, mode);
	return icon;
    }

    function set_icon_mode(icon, mode)
    {
      var image;
      if (mode == 'block_all') 	image = "Smiley Tongue";
      if (mode == 'filtered') 	image = "Smiley Cool";
      if (mode == 'allow_all') 	image = "Smiley Cry";
      set_icon_image(icon, image);
    }
    
    function add_menu_item(nsmenu, text, indent, f, child)
    {
      // FIXME: add icon
      var item = document.createElement('div');
      item.className = 'noscript_item';
      if (child)
	  item.appendChild(child);
      if (indent)
	  item.style = "padding-left:" + (indent * 10) + "px;";
      item.innerHTML += text;
      if (f)
      {
	item.onmouseover = function(){ this.style.backgroundColor = '#dddddd'; };
	item.onmouseout  = function(){ this.style.backgroundColor = 'transparent'; };
	item.onclick = f;
      }
      // make text non selectable
      item.onmousedown = function(){ return false; };
      nsmenu.appendChild(item);
      return item;
    }

    function add_right_aligned_text(parent, text)
    {
	var d = document.createElement('div');
	d.style = "float:right;";
	d.innerText = text;
	parent.appendChild(d);
	return d;
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
      var div = document.createElement('div');
      //  width: 90%;
      div.style = "height: 1px; display: block; background-color: #555555; margin-left: auto; margin-right: auto;";
      menu.appendChild(div);
    }

    function make_checkbox(checked, f)
    {
      var c = document.createElement('input');
      c.type = 'checkbox';
      c.defaultChecked = checked;
      c.onclick = f;
      return c;
    }

    function list_to_string(list)
    {
	var d = '';
	var comma = '';
	var a=list.split(' ');
	for (var i = 0; i < a.length; i++)
	{ 
	    if (a[i] != '.')
	    {
		d = d + comma + "'" + a[i] + "'";
		comma = ', ';
	    }
	}
	return '[' + d + ']';
    }
    
    var nsmenu;
    function create_menu()
    {
	nsmenu = document.createElement('div');		
	nsmenu.align = 'left';
	nsmenu.style="border-radius: 5px; border-width: 2px; border-style: outset; border-color: gray; background:#abb9ca;" +
	" background: #ccc;\
   box-shadow: 8px 10px 10px rgba(0,0,0,0.5),\
   inset 2px 3px 3px rgba(255,255,255,0.75);\
";
        nsmenu.style.display = 'none';

	nsmenu.onmouseout = function(e)
	{	
	  if (!e) var e = window.event;
	  // object we're moving out of
	  // var tg = (window.event) ? e.srcElement : e.target;
	  // if (tg != nsmenu) // moving out of one its children.
	  //  return; we actually need that case!
	  
	  // e.relatedTarget: object we're moving to.
	  var reltg = e.relatedTarget;
	  while (reltg != nsmenu && reltg.nodeName != 'HTML')
	      reltg= reltg.parentNode;
	  if (reltg == nsmenu)
	      return; // moving out of the div into a child layer
	  
	  show_hide_menu(false);
	};
	
	var item = add_menu_item(nsmenu, "Noscript Settings ...");
	item.title = version + ". Click to view global settings.";
	item.align = 'center';
	item.className = 'noscript_title'
        // item.style = 'background-color:#0000ff; color:#ffffff; font-weight:bold;';
//	item.onclick = function()
//	{       
//  	  if (!event.ctrlKey)
//	  {
//	    var d = list_to_string(global_setting('noscript'));
//	    alert("Noscript \nDomains allowed globally: \n" + d);
//	  
//	    return;
//	  }
//	  var d = list_to_string(local_setting('noscript'));
//	  alert("Noscript \nDomains allowed locally: \n" + d);
//	};

	var checkbox = make_checkbox(block_inline_scripts, toggle_allow_inline);
	var label = "Block Inline Scripts";
	item = add_menu_item(nsmenu, label, 0, toggle_allow_inline, checkbox);
	add_right_aligned_text(item, " [" + get_size_kb(total_inline_size) + "k]");

	if (block_inline_scripts)
	{
	    var checkbox = make_checkbox(handle_noscript_tags, toggle_handle_noscript_tags);
	    var label = "Pretend Javascript Disabled";
	    item = add_menu_item(nsmenu, label, 2, toggle_handle_noscript_tags, checkbox);
	    item.title = "Interpret noscript tags as if javascript was disabled in opera."
	}

	add_menu_separator(nsmenu);
	add_menu_item(nsmenu, "External Scripts:");	
	add_menu_item(nsmenu, "Block All", 0, function(){ set_mode('block_all'); }, new_icon_mode('block_all'));
	add_menu_item(nsmenu, "Filter By Host", 0, function(){ set_mode('filtered'); }, new_icon_mode('filtered'));
	
	var f = function()
	{
	  var h = (this.host ? this.host : this.parentNode.host);
	  var checkbox_clicked = (event.target.tagName == 'INPUT');
	  
	  if (filtered_mode_allowed_host(h))
	  {
//	      global_remove_domain(d);
	      remove_host(h);	      
	  }
	  else
	  {
	      if (!checkbox_clicked)
		  allow_host(h);
//	      else
//		  global_allow_domain(d);
	  }
	  set_mode('filtered');
	};

	foreach_host_node(function(host_node)
	{
	  var h = host_node.name;
	  var s = host_node.scripts;
	  var checkbox = make_checkbox(filtered_mode_allowed_host(h), null);
	  
	  //var label = "Allow " + h;	 
	  var item = add_menu_item(nsmenu, "Allow ", 2, f, checkbox);
	  item.title = "Click checkbox to allow globally.";
	  add_right_aligned_text(item, h + "   [" + s.length + "]");
	  
//	  if (domain_allowed_globally(d))
//	  {
//	      var icon = document.createElement('img');
//	      icon.className = "noscript_global";
//	      icon.title = "Allowed Globally";
//	      item.appendChild(icon);
//	  }
	  item.host = h;
	});
	
	add_menu_item(nsmenu, "Allow All", 0, function(){ set_mode('allow_all'); }, new_icon_mode('allow_all'));
	add_menu_item(nsmenu, "Details ...", 0, show_details);
	
	var td = document.getElementById('td_nsmenu');
	td.appendChild(nsmenu);	
    }

    function show_hide_menu(show, toggle)
    {
      if (!nsmenu)
	  create_menu();
      var d = (show ? 'inline-block' : 'none');
      if (toggle) 
	  d = (nsmenu.style.display == 'none' ? 'inline-block' : 'none');
      nsmenu.style.display = d;
    }
    
    function new_script(url)
    {
	var o = new Object();
	o.url = url;
	return o;
    }

    function compare_scripts(s1, s2)
    {
	return (s1.url < s2.url ? -1 : 1);
    }
    
    function sort_scripts(scr_array)
    {
	scr_array.sort(compare_scripts);
    }

    // External scripts are stored in a 3 level tree (domain/host/script)
    // Ex: domain_nodes[0].hosts[0].scripts[0]
    // Domain/Host name: domain_nodes[0].name etc
    // FIXME: can't we use some kind of hash table ??
    var domain_nodes = [];

    function add_domain_node(domain)
    {
	for (var i = 0; i < domain_nodes.length; i++)
	{
	    if (domain_nodes[i].name == domain)
		return domain_nodes[i];
	}
	var n = new Object();
	n.name = domain;
	n.hosts = [];
	domain_nodes.push(n);
	return n;
    }

    function add_host_node(host, domain_node)
    {
	var hosts = domain_node.hosts;
	for (var i = 0; i < hosts.length; i++)
	{
	    if (hosts[i].name == host)
		return hosts[i];
	}
	var n = new Object();
	n.name = host;
	n.scripts = [];
	hosts.push(n);
	return n;
    }

    function add_script(fullurl, host)
    {
	// FIXME: could start with something else than "http://" (https ...)	
	var url = fullurl.slice(7); // strip http://
	var domain = get_domain(host);
	var s = new_script(url);

	var domain_node = add_domain_node(domain);
	var host_node = add_host_node(host, domain_node);
	host_node.scripts.push(s);
	return s;
    }

    function foreach_host_node(f)
    {
	for (var i = 0; i < domain_nodes.length; i++)
	{
	    var hosts = domain_nodes[i].hosts;
	    for (var j = 0; j < hosts.length; j++)
	    {
		f(hosts[j], domain_nodes[i].name);
	    }
	}
    }

    var blocked_current_host = 0;
    var loaded_current_host = 0;
    var total_current_host = 0;
    
    var blocked_external = 0;
    var loaded_external = 0;
    var total_external = 0;

    var total_inline = 0;
    var total_inline_size = 0;

    function get_size_kb(x)
    {
	var k = new String(x / 1000);
	var d = k.indexOf('.');
	if (d)
	    return k.slice(0, d + 2);
	return k;
    }

    var beforescript_alert = false;
    
    // Handler for both inline *and* external scripts
    opera.addEventListener('BeforeScript',
    function(e)
    {
      if (e.element.src) // external script
	  return;
      
      total_inline++;
      total_inline_size += e.element.text.length;
      
      // FIXME: remove after we're done testing
      if (nsmenu && !beforescript_alert)
      {
	  alert("noscript.js: BeforeScript after DOM loaded");
	  beforescript_alert = true;
      }
      
      if (block_inline_scripts)
	e.preventDefault();
    }, false);

    var beforeexternalscript_alert = false;
    
    opera.addEventListener('BeforeExternalScript',
    function(e)
    {
        if (e.element.tagName != 'SCRIPT' && e.element.tagName != 'script')
	{
	  alert("noscript.js: BeforeExternalScript: non 'SCRIPT' tagname: " + e.element.tagName);
	  return;
        }

	// FIXME: remove after we're done testing
	if (nsmenu && !beforeexternalscript_alert)
	{
	    alert("noscript.js: BeforeExternalScript after DOM loaded");
	    beforeexternalscript_alert = true;
	}

	var url = e.element.src;
	var host = url_hostname(url);
	var allowed = allowed_host(host);
	var script = add_script(url, host);	
	
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
	
	// find out which scripts are actually loaded,
	// this way we can find out if *something else* is blocking (blocked content, hosts file ...)
	// awesome!
	e.element.onload = function(le)
	{
//	  alert("noscript.js: in load handler! script:" + le.target.src);

	  if (host == current_host)
	      loaded_current_host++; 
	  else
	      loaded_external++;
	  script.loaded = 1; // what a hack, javascript rules!
	}	
	
        if (!allowed)
	    e.preventDefault();
    },
    false);
    
    document.addEventListener('DOMContentLoaded',
    function()
    {
        if (!domain_nodes.length && !total_inline) 
            return;

	if (block_inline_scripts)
	    check_handle_noscript_tags();
	
	var noscript_style =
"\n\
#noscript_table { position:fixed;width:auto;height:auto;background:transparent;white-space:nowrap;z-index:99999999;direction:ltr;font-family:sans-serif; font-size:small; margin-bottom:0px; }  \n\
#noscript_table tr td { text-align: right; padding: 0px 0px 0px 0px;} \n\
.noscript_title { background-color:#d80; color:#ffffff; font-weight:bold; } \n\
#noscript_button { border-width: 2px; padding: 1px 8px; margin: 0px 0px 0px 0px; float: none; } \n\
.noscript_item  { color: #000000;  } \n\
#noscript_table div { width: auto; } \n\
.noscript_global { padding: 0px 3px; width:14px; height:14px; vertical-align:middle; \
    background: -o-skin('RSS'); } \n\
";

	// -o-linear-gradient(top, #FFFFFF 0px, #CCCCCC 100%) #E5E5E5;
	
	new_style(noscript_style);
	
	var table = document.createElement('table');
	table.id = 'noscript_table';
	table.border = 0;
	table.cellSpacing = 0;
	table.cellPadding = 0;	
	// background:-o-skin("Browser Window Skin")
        table.style = (cornerposition < 3 ? 'top': 'bottom') + ':1px;' + (cornerposition % 2 == 1 ? 'left': 'right') + ':1px;';

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

        var r = document.createElement('button');
	r.id = 'noscript_button';
	r.title = tooltip;	
	r.appendChild(button_image);
	r.onmouseover = function() { show_hide_menu(true); };
        r.onclick = function()
	{
	  if (event.shiftKey)
	  { // cycle through the modes
	    // FIXME: should wait until shift is released to reload page
	    if (mode == 'block_all')      set_mode('filtered');
	    else if (mode == 'filtered')  set_mode('allow_all');
	    else if (mode == 'allow_all') set_mode('block_all');
	    return;
	  }
	}

	var tr = document.createElement('tr');
	var td = document.createElement('td');
	td.id = 'td_nsmenu';
	
	tr.appendChild(td);
        table.appendChild(tr);

	var tr = document.createElement('tr');
	var td = document.createElement('td');
	td.appendChild(r);
	tr.appendChild(td);
        table.appendChild(tr);
	
        document.documentElement.appendChild(table);
    },
    false);
})(opera, opera.scriptStorage);
