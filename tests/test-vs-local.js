var assert = require('assert');
var timezone_mock = require('../');

//////////////////////////////////////////////////////////////////////////
// Test that the mocked date behaves exactly the same as the system date when
//   mocking the same timezone.

if (!new timezone_mock._Date().toString().match(/\(PDT\)|\(PST\)|\(Pacific Daylight Time\)|\(Pacific Standard Time\)/)) {
  // Because we only have timezone info for a couple timezones, we can only test
  //   this if the timezone we're mocking is the same as the system timezone.
  // In theory this could be extended to be able to test any timezone for which
  //   we have timezone data.
  assert.ok(false, 'These tests only work if the local system timezone is Pacific');
}

timezone_mock.register('US/Pacific');

var orig = new timezone_mock._Date();
var mock = new Date();

function pad2(v) {
  return ('0' + v).slice(-2);
}

var ts = new Date('2013-01-01T00:00:00.000Z').getTime();
var was_ok = true;
var last = ts;
var end = ts + 5 * 365 * 24 * 60 * 60 * 1000;
var ok;

function check(label) {
  function check2(fn) {
    if (orig[fn]() !== mock[fn]()) {
      ok = false;
      if (was_ok) {
        console.log('  ' + fn + ' (' + label + ')', orig[fn](), mock[fn]());
      }
    }
  }

  check2('getTimezoneOffset');
  check2('getHours');
  check2('getTime');
}

function checkConstructor(str) {
  orig = new timezone_mock._Date(str);
  mock = new Date(str);
  check('constructor ' + str);
  if (was_ok !== ok) {
    console.log((ok ? 'OK    ' : 'NOT OK') + ' - ' + ts + ' (' + (ts - last) + ') ' + orig.toISOString() +
      ' (' + orig.toLocaleString() + ')');
    last = ts;
    was_ok = ok;
  }
}

// Isolated test of the constructor for a specific time string
function spotCheckConstructor(str) {
  var shouldFail;
  if (typeof str === 'object') {
    shouldFail = str.fails;
    str = str.str;
  } else {
    shouldFail = false;
  }
  var error = null;
  var spotOrig = new timezone_mock._Date(str);
  var spotMock;
  try {
    spotMock = new Date(str);
  } catch (e) {
    error = e;
    if (!shouldFail) {
      throw e;
    }
  }

  function check2(fn) {
    var origResult = spotOrig[fn]();
    var pass;
    var mockResult;
    try {
      mockResult = spotMock[fn]();
      pass = (
        origResult === mockResult ||
        (Number.isNaN(origResult) && Number.isNaN(mockResult))
      );
    } catch (e) {
      error = e;
      pass = false;
      if (!shouldFail) {
        throw e;
      }
    }
    if (pass === shouldFail) {
      console.log('  ' + fn + ' ("' + str + '")', origResult, mockResult);
    }
    return pass;
  }

  var tests = [
    'getHours',
    'getTime',
  ];

  // Node.js switches to Local Mean Solar Time at 10,001 BCE
  // (-10,000 ISO) changing the offset for Los Angeles at 118.24 W from
  // 800 minutes to 792 minutes.
  if (!str.startsWith('-100000')) {
    tests.push('getTimezoneOffset');
  }

  if ((error === null && tests.every(check2)) === shouldFail) {
    console.log('NOT OK - new Date("' + str + '")' + (
      shouldFail ? ' (expected fail)' : ''
    ));
  }
}

for (; ts < end; ts += 13 * 60 * 1000) {
  orig.setTime(ts);
  mock.setTime(ts);
  assert.equal(orig.toISOString(), mock.toISOString());
  ok = true;
  check('setTime');
  var test = new timezone_mock._Date(ts);
  orig = new timezone_mock._Date('2015-01-01');
  mock = new Date('2015-01-01');
  orig.setFullYear(test.getUTCFullYear());
  mock.setFullYear(test.getUTCFullYear());
  orig.setMinutes(test.getUTCMinutes());
  mock.setMinutes(test.getUTCMinutes());
  orig.setHours(test.getUTCHours());
  mock.setHours(test.getUTCHours());
  check('setFullYear/Minutes/Hours');
  orig.setDate(test.getUTCDate());
  mock.setDate(test.getUTCDate());
  check('setDate');

  checkConstructor(
    test.getUTCFullYear() + '-' + pad2(test.getUTCMonth() + 1) + '-' + pad2(test.getUTCDate()) + ' ' +
    pad2(test.getUTCHours()) + ':' + pad2(test.getUTCMinutes()) + ':' + pad2(test.getUTCSeconds())
  );
}

[
  '2015-01-01 01:23:45.678',
  '2015-01-01 01:23:45',
  '2015-01-01T01:23:45.678',
  '+2015-01-01 01:23:45.678',
  '-2015-01-01 01:23:45.678',
  { str: '-215-01-01 01:23:45.678', fails: true }, // Not implemented
  { str: '-25-01-01 01:23:45.678', fails: true }, // Not implemented
  { str: '-05-01-01 01:23:45.678', fails: true }, // Not implemented
  { str: '+99999-12-31 23:59:59.999', fails: true }, // Offset table ends around CE 2032
  { str: '+100000-01-01 00:00:00.000', fails: true }, // Offset table ends around CE 2032
  { str: '-99999-01-01 00:00:00.000', fails: true }, // Offset table ends around CE 2032
  { str: '-100000-12-31 23:59:59.999', fails: true },  // Offset off 8 minutes before MLST cutoff
  '2017-05-26Z',
  '+2017-05-26Z',
  '-2017-05-26Z',
  { str: '+99999-12-31Z', fails: true },  // Offset table ends around CE 2032
  { str: '+100000-01-01Z', fails: true },  // Offset table ends around CE 2032
  { str: '-99999-01-01Z', fails: true },  // Offset table ends around CE 2032
  '-100000-12-31Z',
  '2017-05-26T00:00Z',
  '+2017-05-26T00:00Z',
  '-2017-05-26T00:00Z',
  '+99999-12-31T23:59Z',
  { str: '+100000-01-01T00:00Z', fails: true }, // Offset table ends around CE 2032
  '-99999-01-01T00:00:00Z',
  { str: '-100000-12-31T23:59Z', fails: true }, // Offset off 8 minutes before MLST cutoff
  '2017-05-26T17:52:35.869Z',
  '+2017-05-26T17:52:35.869000Z',
  '-2017-05-26T17:52:35.869000Z',
  '+99999-12-31T23:59:59.999000+14:00',
  { str: '+100000-01-01T00:00:00.000000+14:00', fails: true }, // Offset table ends around CE 2032
  '-99999-01-01T00:00:00.000000+14:00',
  { str: '-100000-12-31T23:59:59.999000+14:00', fails: true }, // Offset off by 8 minutes before MLST cutoff
  '+99999-12-31T23:59:59.999000-12:00',
  { str: '+100000-01-01T00:00:00.000000-12:00', fails: true }, // Offset table ends around CE 2032
  '-99999-01-01T00:00:00.000000-12:00',
  { str: '-100000-12-31T23:59:59.999000-12:00', fails: true }, // Offset off by 8 minutes before MLST cutoff
].forEach(spotCheckConstructor);

timezone_mock.unregister();
