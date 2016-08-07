var blessed = require('blessed'), contrib = require('blessed-contrib'),
    request = require('request'),
    dns = require('dns'),
    exec = require('child_process').exec,
    screen = blessed.screen(),
    grid = new contrib.grid({
      rows: 10,
      cols: 6,
      screen: screen
    }),
    maxmind = require('maxmind');

var lookup = maxmind.open('data/GeoLite2-City.mmdb');
var table = grid.set(0, 0, 5, 6, contrib.table, {
  keys: true,
  fg: 'white',
  selectedFg: 'white',
  selectedBg: 'blue',
  interactive: true,
  label: 'lsof -i | grep TCP',
  // width: ,
  // height: ,
  // border: ,
  columnSpacing: 1, // in chars
  columnWidth:         [10,     5,     3,     4,     20,     5,      10] // in chars
});
var lsofTableHeaders = ['name', 'pid', 'own', 'ipT', 'url', 'port', 'status'];

var map = grid.set(5,0,5,6, contrib.map, {
});
var markers = [
  {
    "lat": "77",
    "lon": "42",
    color: 'red',
    char: 'X'
  },
  {
    "lat": "87",
    "lon": "44",
    color: 'blue',
    char: 'O'
  }
];
var otherMarkers = [
  {
    "lat": "67",
    "lon": "62",
    color: 'red',
    char: 'X'
  },
  {
    "lat": "37",
    "lon": "94",
    color: 'blue',
    char: 'O'
  }
];
function drawMap(markers) {
  map.clearMarkers();
  for (var i = 0; i < markers.length; i++) {
    map.addMarker(markers[i]);
  }
  screen.render();
}

function drawMarkdown(text) {
  var mark = grid.set(0, 0, 5, 6, contrib.markdown);

  mark.setMarkdown(text);

  screen.render();
}

function drawTable(data) {
  table.setData({
    headers: lsofTableHeaders,
    data: data
  });
  screen.render();
}

function pollLsof() {
  var data = [];
  exec('lsof -i | grep TCP', function (err, stdout, stderr) {
    // drawText(stdout);
    var lines = stdout.split('\n');
    for (var i = 0; i < lines.length - 1; i++) { // skip the last line cuz it's a \n-er

      var currentLine = lines[i].replace(/\s+/g,' '); // replace extraneous whitespaces with just ''
      var lineData = [];
      // console.log('currentLine: ', currentLine);

      var words = currentLine.split(' ');

      var name = words[0]; // com.apple, Safari, ruby, Python, node, ssh ...
      var pid = words[1]; // 4798
      var owner = words[2]; // ia
      var uyeything = words[3]; // 41u
      var ipV = words[4]; // IPv4
      var memP = words[5]; // 0xf40327746ae3fb5d
      var oT = words[6]; // 0t0
      var ttype = words[7]; // TCP
      var add = words[8]; // 10.113.1.6:56084->lga15s47-in-f14.1e100.net:https
      var status = words[9];

      // var s = add.split('->');
      // if (s[1]) {
      //   ss = s[1].split(':');
      //   if (maxmind.validate(ss[0])) {
      //     var d = lookup.get(ss[0]);
      //     console.log('*****' + ss[0]);
      //     console.log(d);
      //   }
      // }

      console.log(name, pid, owner, ipV, add, 'port', status);

      // lineData.push(name, pid, owner, ipV, add, 'port', status);

      // if (lineData.length > 4) {
      //   data.push(lineData);
      // }
    }

    // if (data.length > 0) {
    //   drawTable(data);
    // }
  });
}
function dnsResolve(hostname) {
  return dns.resolve(hostname, function (addresses) {
    console.log(addresses);
  });
}

function init() {
  // drawMap(markers);;

  // setTimeout(function () {
  //   drawMarkdown('numbero UNO');
  // }, 2000);
  // setTimeout(function () {
  //   drawMarkdown('number dos');
  //   drawMap(otherMarkers);
  // }, 4000);
  // exec('lsof -i | grep TCP', function (err, stdout, stderr) {
  //   console.log('err', err);
  //   console.log('stdout', stdout);
  //   console.log('stderr', stderr);
  // });
  pollLsof();
  // dnsResolve('qg-in-f189.1e100.net');
}

init();
