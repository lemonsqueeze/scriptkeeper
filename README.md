scriptkiddie
============

**noscript on steroids for opera !**

[Home page](https://github.com/lemonsqueeze/scriptkiddie/wiki) is in the wiki now. Or stay here for developper's corner.

Extension
---------

It's in the `extension` branch, but don't use it yet unless you feel like debugging it. There are [outstanding issues](http://my.opera.com/community/forums/topic.dml?id=1545262) remaining.

Other stuff
-----------

`utils` directory has a few things which could be useful outside of this project:
  * `google_nojs.js` example showing how to disable javascript but still allow userjs to run. This one does it for google search.
  * `block_event_listeners.js` userjs to block page event listeners.
  * `event_logger.js` userjs to log all events
  * `page_event_logger.js` regular script to see what events page is getting.

`xml_macros` (tools directory) takes care of expanding xml macros. Useful if you need modularity in xml or html. Syntax is inspired from [fxmacro](http://www2.informatik.tu-muenchen.de/~perst/fxmacro/) (couldn't get it to build so ended up writing this instead).

Making custom styles
--------------------

There are two kinds of custom styles:
* `.style` files just add a few rules on top of the current stylesheet
* `.css` files replace the whole stylesheet.

The dev environment makes it very easy to create either. `.style` files first:
* Get a fresh copy of the repository (see Hacking below)
* Add your style patch rules at the end of `src/scriptkiddie.css` (don't change anything else ! If you want to change a rule, copy it first).
* Add extra images to `img` directory and reference them with `url('../img/whacky_image.png')`.
  To set `width` and `height` automatically, add a `/*img_size*/` comment.
* To test changes, just type `make` and try the generated `scriptkiddie.js`.

  Right now you're actually changing the default style, so either use `rescue mode` or make sure you reset custom styles with `Options->Back to default`.
* Type `make custom.style` once you're happy with the changes. 

  Style file is ready in `custom.style` !

Creating a completely new stylesheet is even easier: just replace the whole .css and type `make`. The generated stylesheet is in `src/scriptkiddie.inlined.css`.

For example, this is the source for glowballs:
```
/* mode icons (small) */
.block_all img         { /*img_size*/ background-image:url('../img/block_all_16.png'); }
.filtered  img         { /*img_size*/ background-image:url('../img/filtered_16.png');  }
.relaxed   img         { /*img_size*/ background-image:url('../img/relaxed_16.png');  }
.allow_all img         { /*img_size*/ background-image:url('../img/allow_all_16.png'); }
.menu .block_all img, .menu .filtered  img, 
.menu .relaxed   img, .menu .allow_all img     { margin: 3px }

/* mode icons (fat) */
.fat_icons .block_all img              { /*img_size*/ background-image:url('../img/block_all.png'); }
.fat_icons .filtered  img              { /*img_size*/ background-image:url('../img/filtered.png');  }
.fat_icons .relaxed   img              { /*img_size*/ background-image:url('../img/relaxed.png');  }
.fat_icons .allow_all img              { /*img_size*/ background-image:url('../img/allow_all.png'); }
.fat_icons .menu .block_all img,  .fat_icons .menu .filtered  img, 
.fat_icons .menu .relaxed   img,  .fat_icons .menu .allow_all img      { margin: 4px }
```



Hacking
-------

The script is put together from the different bits and pieces in the `src` directory. You'll need some kind of unix environment with `git`, `perl`, `make` and `base64` (for windows get `cygwin`).

To get a copy of the repository, do
```
git clone 'https://github.com/lemonsqueeze/scriptkiddie.git'
```

Then `make` to build.

UI layout is generated from `scriptkiddie.ui`, css from `scriptkiddie.css`. Image references in the css are turned into `data:` urls automatically, so it's a convenient tool for hacking styles.

UI code lives in `ui.js`, `userjs_ui.js` manages widgets and the injected iframe, and the filtering logic is in `core.js`.

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/lemonsqueeze/scriptkiddie/trend.png)](https://bitdeli.com/free "Bitdeli Badge")