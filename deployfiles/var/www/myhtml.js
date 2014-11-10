function MyHTML() {
    'use strict';
    this.htmlnode = function(tagname) {
        return $(document.createElement(tagname));
    };
    this.imgnode = function(filename, title, height) {
        var node = this.htmlnode('img')
            .attr('src', filename)
            .attr('title', title);
        if (height != undefined) {
            node.attr('height', height);
        }
        return node;
    };
    this.atonode = function(href) {
        /*
         * link to somewhere
         */
        var node = this.htmlnode('a')
            .attr('href', href);
        return node;
    }
    this.anamenode = function(name, text) {
        /*
         * link anchor
         */
        var node = this.htmlnode('a')
            .attr('name', name)
            .attr('href', '#' + name);
        if (text == undefined) {
            node.text(' ¶').addClass('localanchor');
        } else {
            node.append(text);
        }
        return node;
    }
}



function createGauge(anchorid, name, label, min, max)
{
	var config =
	{
      size: 100,
      label: label,
      min: undefined != min ? min : 0,
      max: undefined != max ? max : 80,
      minorTicks: max / 20,
	}

	var range = config.max - config.min;
	config.greenZones = [{ from: config.min + range*0.2, to: config.min + range*0.75}];
	config.yellowZones = [{ from: config.min + range*0.75, to: config.min + range*0.9 }];
	config.redZones = [{ from: config.min + range*0.9, to: config.max }];

	gauge = new Gauge(anchorid, config);
	gauge.render();
      return gauge;
}
