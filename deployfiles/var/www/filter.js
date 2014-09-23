var FilterLib = {
  bound: false,
  refreshable: [],
  selectors: {
    refresh: 'a#refresh',
    toolshow: 'a#toolshow',
    toolhide: 'a#toolhide',
  },
  bindall: function() {
    if (FilterLib.bound) {
    	return this;
    }
    $(FilterLib.selectors.refresh).click(FilterLib.refresh);
    $(FilterLib.selectors.toolshow
	+ ', '
	+ FilterLib.selectors.toolhide)
	.click(FilterLib.toggletools);
    FilterLib.bound = true;
    return this;
  },
  refresh: function() {
    $.each(FilterLib.refreshable, function(index, callback){
      console.log("calling callback: " + callback.name);
      callback();
    });
  },
  register_refresh: function(callback) {
    FilterLib.refreshable.push(callback);
  },
  toggletools: function() {
    $("a#toolhide").toggle();
    $("div.filterborder, a#refresh").animate({width:'toggle'},350);
    setTimeout(function(){ $("a#toolshow").toggle(); }, 350);
  },
  start: function() {
    //FilterLib.toggletools.apply(FilterScript.app);
  },
};

function FilterScript() {
  'use strict';
  this.start = FilterLib.start;
  FilterScript.app = this;
};

FilterLib.bindall();
new FilterScript().start();
