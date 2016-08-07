

var blessed = require('blessed'),
    contrib = require('blessed-contrib'),
    request = require('request'),
    screen = blessed.screen(),
    grid = new contrib.grid({
        rows: 6,
        cols: 10,
        screen: screen
    }),
    maxmind = require('maxmind'), // maxmind geoip lookup
    dns = require('dns'),
    fastApi = require('./fast-api')
child_process = require('child_process'),
              node_path = require('global-modules');

// Drawable objects

var mark = grid.set(0, 0, 1, 5, blessed.text, {style: {fg: 'blue'}});
var instruction = grid.set(0, 5, 1, 3, blessed.text);
instruction.setText('dd - kill, s - filter status');
var sortingState = grid.set(0, 8, 1, 2, blessed.text, {style: {fg: 'green'}});
sortingState.setText('all');

// var mark =  blessed.text({top: 'top',
//                         left: 'left',
//                         // width: headerText.length,
//                         height: '1'
//                         // fg: loadedTheme.title.fg
//                         // content: headerText,
//                          });
var map = grid.set(1, 0, 5, 5, contrib.map, {
  // label: ''
});
var lsofTable = grid.set(1, 5, 5, 5, contrib.table, {
  keys: true,
  fg: 'red',
  selectedFg: 'white',
  selectedBg: 'blue',
  interactive: true,
  label: 'lsof -i | grep TCP | sort -u -t\  -k1,1 -k2,2 -k9,9',
  // width: ,
  // height: ,
  // border: ,
  columnSpacing: 1, // in chars
  columnWidth:         [10,     6,     3,     5,     50] // in chars
});

var lsofTableHeaders = ['name', 'pid', 'own', '', ''];

var hasInternet = false,
    fastness,
    myIpData = {
        ip: '',
        city: '',
        region: '',
        country: '',
        country_code: ''
    },
    ownFormattedIpData = '';

var mapMarkerMe;
var mapMarkers = [];
var lsofTableData = [];
var ipLookup = maxmind.open(node_path + '/waldo-top/data/GeoLite2-City.mmdb');


var haveInternet = function () {
  return  dns.lookup('google.com', onCheckInternet);
};
function onCheckInternet(err, address, family) {
  if ( !(err && err.code === 'ENOTFOUND') ) {
    // show message about not having internet and don't try to plot points on map
    return true;
  }
  return false;
}

var pollOwnIp = function () {
  return request('http://freegeoip.net/json/?callback=', setMyIpDatas);
};
function setMyIpDatas(err, res, body) {
    var myIpData = JSON.parse(body),
        markerText = 'X';

    mapMarkerMe = {
        "lon": myIpData.longitude.toString(),
        "lat": myIpData.latitude.toString(),
        color: 'blue',
        char: markerText
    };

    // set text readout
    var myIpReadout = 'IP: ' + myIpData.ip + ' - ' + myIpData.city + ', ' + myIpData.region_name + ', ' + myIpData.country_name;
  map.addMarker(mapMarkerMe);
  drawText(myIpReadout);
  // mark.setMarkdown(myIpReadout);
  // screen.render();
};

var sortingBy = 0; // sort lsofers by status "(LISTEN)", "(ESTABLISHED)", "", "(CLOSED_WAITING)" *cw i think...
var possibleStatuses = ['all', '(LISTEN)', '(ESTABLISHED)', '(CLOSED_WAITING)'];
function cycleSortingBy() {
  sortingBy++; // increment, ie -> 1, -> 6, -> 10
  sortingBy = sortingBy % possibleStatuses.length;
  if ( possibleStatuses[sortingBy] === 'all') {
    sortingState.setText('all');
  } else {
    if (possibleStatuses[sortingBy] === 'undefined') {
      sortingState.setText('undefined');
    } else {
      sortingState.setText(possibleStatuses[sortingBy]);
    }
  }
  screen.render();
}

function pollLsof() {
  holder = []; // so we don't have a briefly empty array which could return undefined for a selection on user input
  var ipMapMarkers = [];
  child_process.exec('lsof -i | grep TCP | sort -u  -k1,1 -k2,2 -k9,9', function (err, stdout, stderr) {
    // drawText(stdout);
    var lines = stdout.split('\n');
    for (var i = 0; i < lines.length - 1; i++) {

      var lineData = [];
      var currentLine = lines[i].replace(/\s+/g,' '); // replace extraneous whitespaces with just ''

      var words = currentLine.split(' ');

      // holder.push(words);

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

      // lineData.push(name, pid, owner, ipV, add, status);
      lineData.push(name, pid, owner, ipV, add + ' ' + status);

      // implement sorting by status
      if (possibleStatuses[sortingBy] !== 'all') {
        if (status === possibleStatuses[sortingBy]) {
          // only push lines with statuses that match sortingBy
          holder.push(lineData);
          addMarkerToMarkersFromAddress(add, name, ipMapMarkers);
        }
      } else {
        // push em all if sorting by is null
        holder.push(lineData);
        addMarkerToMarkersFromAddress(add, name, ipMapMarkers);
      }
    }
    lsofTableData = holder;
    drawTable(holder);
    ipMapMarkers.push(mapMarkerMe);
    drawMap(ipMapMarkers);
  });
}
function addMarkerToMarkersFromAddress(add, name, markers) {
  var s = add.split('->');
  if (s[1]) {
    var ss = s[1].split(':');
    var ip = ss[0];
    if (maxmind.validate(ip)) {
      var ipData = ipLookup.get(ip);
      if (ipData) {
        var mapMark = {
          "lat": ipData.location.latitude.toString(),
          "lon": ipData.location.longitude.toString(),
          char: "x " + name.substring(0,3),
          color: "red"
        };
        if (name === 'ssh') {
          mapMark.color = 'yellow';
          mapMark.char = 'x'
        }
        markers.push(mapMark);
      }
    }
  }
}
function drawText(text) {
  mark.setText(text);
  screen.render();
}
function drawMap(markers) {
  map.clearMarkers();
  for (var i = 0; i < markers.length; i++) {
    map.addMarker(markers[i]);
  }
  screen.render();
}
function drawTable(data) {
  lsofTable.setData({
    headers: lsofTableHeaders,
    data: data
  });
  lsofTable.focus();
  screen.render();
}

// function init() {
//   if (haveInternet()) {
//     pollOwnIp(); // sets text also
//     setInterval(function () {
//       pollLsof();
//       drawTable(lsofTableData);
//     }, 1000);
//   } else {
//     drawText('Internet is not connected');
//   }
// }

if (haveInternet()) {
  pollOwnIp();
  setInterval(function () {
    pollLsof();
  }, 1000);
} else {
  drawText('Internet is not connected.');
}

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0)
});

screen.key(['s'], function (ch, key) {
  return cycleSortingBy();
});

// screen.key(['a'], function (ch, key) {
//   console.log(lsofTable.rows.selected); // yields index of selected row
// });
var lastKey = '';
// kill process with dd
screen.on('keypress', function (ch, key) {
  if (lastKey == 'd' && key.name ==='d') {
    var selectedProcess = lsofTableData[lsofTable.rows.selected];
    var pid = selectedProcess[1];
    child_process.exec('kill ' + pid + '', function (error, stdout, stderr) {
      if (error !== null) {
        console.log(error);
      }
    })
  }
  lastKey = key.name;
})
