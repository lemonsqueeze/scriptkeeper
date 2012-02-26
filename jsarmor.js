(function(opera, scriptStorage) {
    var version = 'Noscript v1.25';

    /************************* Default Settings *******************************/
    
    var default_globally_allowed_domains =
    ['googleapis.com', 'images-amazon.com', 'ytimg.com', 'media-imdb.com', 'deviantart.net', 'jquery.com'];
    
    var cornerposition = 4;
    // 1 = top left, 2=top right , 3=bottom left , 4=bottom right etc.
    var blocksitescripts=false;

    // default mode for new pages:
    //   block_all, filtered, or allow_all    
    var default_mode = 'filtered';

    // block inline scripts by default ?
    var default_block_inline_scripts = false;

    /**************************************************************************/    

    if (global_setting('noscript') == '')
    {
	alert("Noscript:\nNo prior settings found.\n" +
	      "Setting globally allowed domains to:\n[" +
	      default_globally_allowed_domains + "]");
	set_global_setting('noscript', '. ' + default_globally_allowed_domains.join(' '));
    }
    
//    var inside_frame = 0;
//    if (window != window.top) { inside_frame = 1; }

    var current_domain = get_domain(location.hostname);

    
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

    function toggle_allow_inline()
    {
      block_inline_scripts = !block_inline_scripts;
      set_local_setting('noscript_inline', (block_inline_scripts ? 'n' : 'y'));
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

	for (var i = 0; i < domains.length; i++)
	{	    	    
	  var d = domains[i];
	  var item = add_menu_item(nsdetails, d + ":");	  

	  var s = scripts[i];
	  sort_scripts(s);
	  for (var j = 0; j < s.length; j++)
	  {
	      var item = add_link_menu_item(nsdetails, "http://" + s[j].url, s[j].url, 2);
	      // script status
	      var icon = new_icon();
	      var image = 'Transfer Stopped';
	      if (should_allow(d))
	      {   // FIXME when adding whitelisting support, add icon for it here
		  image = 'Transfer Success';
		  if (!s[j].loaded)
		  {
		      image = 'Transfer Size Mismatch';
		      icon.title = "Script allowed but not loaded, something else is blocking it.";
		  }
	      }
	      set_icon_image(icon, image);

	      item.insertBefore(icon, item.childNodes[0]);
	  }	  
	}
	
	var td = document.getElementById('td_nsmenu');
	td.appendChild(nsdetails);

	show_hide_menu(false);
        nsdetails.style.display = 'inline-block';
    }

    function set_mode_no_update(new_mode)
    {
      mode = new_mode;
      // allow local domain by default
      if (new_mode == 'filtered' && local_setting('noscript') == '')
	  allow_domain(current_domain);
      set_local_setting('noscript_mode', mode);
      set_icon_mode(button_image, mode);
    }
    
    function set_mode(new_mode)
    {
      set_mode_no_update(new_mode);
      show_hide_menu(false);
      reload_page();
    }    

    function allow_domain(domain)
    {
	var l = local_setting('noscript');
	l = (l == '' ? '.' : l);
	if (domain_in_list(domain, l))
	    return;
	set_local_setting('noscript', l + ' ' + domain);
    }

    function global_allow_domain(domain)
    {
	var l = global_setting('noscript');
	l = (l == '' ? '.' : l);	
	if (domain_in_list(domain, l))
	    return;
	set_global_setting('noscript', l + ' ' + domain);
    }
    
    function remove_domain(domain)
    {
      var l = local_setting('noscript');
      l = l.replace(' ' + domain, '');
      set_local_setting('noscript', l);
    }

    function global_remove_domain(domain)
    {
      var l = global_setting('noscript');
      l = l.replace(' ' + domain, '');
      set_global_setting('noscript', l);
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

    function domain_in_list(domain, list)
    {
      return (list && list.indexOf(' ' + domain) != -1);
    }

    function domain_allowed_globally(domain)
    {
	var l = global_setting('noscript');
	return domain_in_list(domain, l);
    }
    
    function domain_allowed_locally(domain)
    {
	var l = local_setting('noscript');
	return domain_in_list(domain, l);
    }
    
    function filtered_mode_should_allow(domain)
    {
	return (domain_allowed_globally(domain) ||
		domain_allowed_locally(domain));
    }
    
    function should_allow(scr_domain)
    {
      if (mode == 'block_all') return false; 
      if (mode == 'filtered')  return filtered_mode_should_allow(scr_domain); 
      if (mode == 'allow_all') return true;
      alert('noscript.js: mode="' + mode + '", this should not happen!');
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

    function domain_list_to_string(domains)
    {
	var d = '';
	var comma = '';
	var a=domains.split(' ');
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
//	item.style = 'background-color:#0000ff; color:#ffffff; font-weight:bold;';
	item.onclick = function()
	{       
  	  if (!event.ctrlKey)
	  {
	    var d = domain_list_to_string(global_setting('noscript'));
	    alert("Noscript \nDomains allowed globally: \n" + d);
	  
	    return;
	  }
	  var d = domain_list_to_string(local_setting('noscript'));
	  alert("Noscript \nDomains allowed locally: \n" + d);
	};

	var checkbox = make_checkbox(block_inline_scripts, toggle_allow_inline);
	var label = "Block Inline Scripts";
	item = add_menu_item(nsmenu, label, 0, toggle_allow_inline, checkbox);
	add_right_aligned_text(item, " [" + get_size_kb(total_inline_size) + "k]");

	add_menu_separator(nsmenu);
	add_menu_item(nsmenu, "External Scripts:");	
	add_menu_item(nsmenu, "Block All", 0, function(){ set_mode('block_all'); }, new_icon_mode('block_all'));
	add_menu_item(nsmenu, "Filter By Domain", 0, function(){ set_mode('filtered'); }, new_icon_mode('filtered'));
	
	var f = function()
	{
	  var d = (this.domain ? this.domain : this.parentNode.domain);
	  var checkbox_clicked = (event.target.tagName == 'INPUT');
	  
	  if (filtered_mode_should_allow(d))
	  {
	      global_remove_domain(d);
	      remove_domain(d);	      
	  }
	  else
	  {
	      if (!checkbox_clicked)
		  allow_domain(d);
	      else
		  global_allow_domain(d);
	  }
	  set_mode('filtered');
	};
	
	for (var i = 0; i < domains.length; i++)
	{
	  var d = domains[i];
	  var checkbox = make_checkbox(filtered_mode_should_allow(d), null);
	  
	  var label = "Allow " + d;
	  var item = add_menu_item(nsmenu, label, 2, f, checkbox);
	  item.title = "Click checkbox to allow globally.";
	  add_right_aligned_text(item, " [" + scripts[i].length + "]");
	  
	  if (domain_allowed_globally(d))
	  {
	      var icon = document.createElement('img');
	      icon.className = "noscript_global";
	      icon.title = "Allowed Globally";
	      item.appendChild(icon);
	  }
	  item.domain = d;
	}
	
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
    
    // array of arrays of objects: scripts[0] has all the scripts for domain domains[0] etc
    // fields: url, loaded
    var scripts = [];
    var domains = [];

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
    
    function add_script(url, domain)
    {
      var s = new_script(url);
      for (var i = 0; i < domains.length; i++)
      {
	if (domains[i] == domain)
	{
	  scripts[i].push(s);
	  return s;
	}
      }

      domains.push(domain);
      scripts.push([]);
      scripts[i].push(s);
      return s;
    }

    var blocked_current_domain = 0;
    var loaded_current_domain = 0;
    var total_current_domain = 0;
    
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
    
    opera.addEventListener('BeforeExternalScript',
    function(e)
    {
        if (e.element.tagName != 'SCRIPT' && e.element.tagName != 'script')
	{
	  alert("noscript.js: BeforeExternalScript: non 'SCRIPT' tagname: " + e.element.tagName);
	  return;
        }
	
        var x = e.element.src;
        var t = document.createElement('a');
        t.href = x;
        var domain = get_domain(t.hostname);
	var allowed = should_allow(domain);
	
	if (domain == current_domain)
	{
	  total_current_domain++;
	  if (!allowed)
	      blocked_current_domain++;
	}
	else
	{
	  total_external++;
	  if (!allowed)
	      blocked_external++;
	}

	var script = add_script(x.slice(7), domain); // strip http://
	
	// find out which scripts are actually loaded,
	// this way we can find out if *something else* is blocking (blocked content, hosts file ...)
	// awesome!
	e.element.onload = function(le)
	{
//	  alert("noscript.js: in load handler! script:" + le.target.src);

	  if (domain == current_domain)
	      loaded_current_domain++; 
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
        if (!scripts.length && !total_inline) 
            return;

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
	  "[" + current_domain + "] " + blocked_current_domain;
	if (blocked_current_domain != total_current_domain)
	    tooltip += "/" + total_current_domain;
	tooltip += " blocked";
	if (loaded_current_domain)
	    tooltip += " (" + loaded_current_domain + " loaded)";

        tooltip += ", [Other domains] " + blocked_external;
	if (blocked_external != total_external)
	    tooltip += "/" + total_external; 
	tooltip += " blocked";
	if (loaded_external)
	    tooltip += " (" + loaded_external + " loaded)";
	tooltip += ". Click for advanced interface."

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
