var htmlnode = function(tagname) {
  return $(document.createElement(tagname));
};

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
