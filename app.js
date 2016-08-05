   var blessed = require('blessed')
     , contrib = require('blessed-contrib')
     , request = require('request')
     , screen = blessed.screen()
     , grid = new contrib.grid({rows: 1, cols: 2, screen: screen})

//   var line = grid.set(0, 0, 1, 1, contrib.line,
//     { style:
//       { line: "yellow"
//       , text: "green"
//       , baseline: "black"}
//     , xLabelPadding: 3
//     , xPadding: 5
//     , label: 'Stocks'})

   var map = grid.set(0, 0, 1, 2, contrib.map, {label: 'Where\'s Waldo?'})
   request('http://freegeoip.net/json/?callback=', function (err, res, body) {
   	var ipData = JSON.parse(body);
   	var t = 'X ' + ipData.city + ', ' + ipData.country_code + ' (' + ipData.ip + ')'; 
   	map.addMarker({"lon": ipData.longitude.toString(), "lat": ipData.latitude.toString(), color: 'red', char: t});
   	screen.render();
   })
//   var lineData = {
//      x: ['t1', 't2', 't3', 't4'],
//      y: [5, 1, 7, 5]
//   }

//   line.setData([lineData])

   screen.key(['escape', 'q', 'C-c'], function(ch, key) {
     return process.exit(0);
   });

   screen.render()