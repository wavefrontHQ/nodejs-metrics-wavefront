'use strict';
var ScheduledReporter = require('./scheduled-reporter.js'),
  Histogram = require('../metrics').Histogram,
  util = require('util'),
  Socket = require('net').Socket;

var reconnecting = false;

/**
 * A custom reporter that sends metrics to a wavefront server using the wavefrontf data format.
 * @param {Report} registry report instance whose metrics to report on.
 * @param {String} prefix A string to prefix on each metric (i.e. app.hostserver)
 * @param {String} host The ip or hostname of the target wavefront server.
 * @param {String} port The port wavefront is running on, defaults to 2878 if not specified.
 * @param {object} tags The tags to add to wavefront measurements,defaults to none if not specified.
 * @constructor
 */
function WavefrontReporter(registry, prefix, host, port,globaltags) {
  WavefrontReporter.super_.call(this, registry);
  this.prefix = prefix;
  this.host = host;
  this.port = port || 2878;
  this.globaltags = {};
  if (!isEmpty(globaltags)) {
    this.globaltags = globaltags;
  }else{
    this.globaltags = {};
  }
}

util.inherits(WavefrontReporter, ScheduledReporter);

WavefrontReporter.prototype.start = function(intervalInMs) {
  var self = this;
  this.socket = new Socket();
  this.socket.on('error', function(exc) {
    if(!reconnecting) {
      reconnecting = true;
      self.emit('log', 'warn', util.format('Lost connection to %s. Will reconnect in 10 seconds.', self.host), exc);
      // Stop the reporter and try again in 1 second.
      self.stop();
      setTimeout(function () {
        reconnecting = false;
        self.start(intervalInMs);
      }, 10000);
    }
  });

  self.emit('log', 'verbose', util.format("Connecting to wavefront @ %s:%d", this.host, this.port));
  this.socket.connect(this.port, this.host, function() {
    self.emit('log', 'verbose', util.format('Successfully connected to wavefront @ %s:%d.', self.host, self.port));
    WavefrontReporter.super_.prototype.start.call(self, intervalInMs);
  });
};

WavefrontReporter.prototype.stop = function() {
  WavefrontReporter.super_.prototype.stop.call(this);
  this.socket.end();
};

WavefrontReporter.prototype.report = function() {
  // Don't report while reconnecting.
  if(reconnecting) {
    return;
  }
  var metrics = this.getMetrics();
  var self = this;
  var timestamp = (new Date).getTime() / 1000;

  if(metrics.counters.length != 0) {
    metrics.counters.forEach(function (count) {
      self.reportCounter.bind(self)(count, timestamp);
    })
  }

  if(metrics.meters.length != 0) {
    metrics.meters.forEach(function (meter) {
      self.reportMeter.bind(self)(meter, timestamp);
    })
  }

  if(metrics.timers.length != 0) {
    metrics.timers.forEach(function (timer) {
      // Don't log timer if its recorded no metrics.
      if(timer.min() != null) {
        self.reportTimer.bind(self)(timer, timestamp);
      }
    })
  }

  if(metrics.histograms.length != 0) {
    metrics.histograms.forEach(function (histogram) {
      // Don't log histogram if its recorded no metrics.
      if(histogram.min != null) {
        self.reportHistogram.bind(self)(histogram, timestamp);
      }
    })
  }
};

WavefrontReporter.prototype.send = function(name, value, timestamp, tags) {
  if(reconnecting) {
    return;
  }
  if (!tags) { tags = ''; }
  // console.log(util.format('%s.%s ', this.prefix, name), value,timestamp, tags);
  this.socket.write(util.format('%s.%s %s %s %s\n', this.prefix, name, value,
    timestamp, tags));
};

WavefrontReporter.prototype.reportCounter = function(counter, timestamp) {
  var send = this.send.bind(this);
  var tags = tagger(counter.tags,this.globaltags);
  // console.log(util.format('%s.%s', counter.name, 'count'), counter.count, timestamp, tags);
  send(counter.name, counter.count, timestamp, tags);
};

WavefrontReporter.prototype.reportMeter = function(meter, timestamp) {
  var send = this.send.bind(this);
  //console.log('In reportMeter - calling tagger function : %s', meter.name);
  var tags = tagger(meter.tags,this.globaltags);
  //console.log(util.format('%s.%s %s', meter.name, 'count'), meter.count, timestamp, tags);
  send(util.format('%s.%s', meter.name, 'count'), meter.count, timestamp, tags);
  send(util.format('%s.%s', meter.name, 'mean_rate'), meter.meanRate(), timestamp, tags);
  send(util.format('%s.%s', meter.name, 'm1_rate'), meter.oneMinuteRate(),
    timestamp, tags);
  send(util.format('%s.%s', meter.name, 'm5_rate'), meter.fiveMinuteRate(),
    timestamp, tags);
  send(util.format('%s.%s', meter.name, 'm15_rate'), meter.fifteenMinuteRate(),
    timestamp, tags);
};

WavefrontReporter.prototype.reportTimer = function(timer, timestamp) {
  var send = this.send.bind(this);
  var tags = tagger(timer.tags,this.globaltags);
  send(util.format('%s.%s', timer.name, 'count'), timer.count(), timestamp, tags);
  send(util.format('%s.%s', timer.name, 'mean_rate'), timer.meanRate(), timestamp, tags);
  send(util.format('%s.%s', timer.name, 'm1_rate'), timer.oneMinuteRate(),
    timestamp, tags);
  send(util.format('%s.%s', timer.name, 'm5_rate'), timer.fiveMinuteRate(),
    timestamp, tags);
  send(util.format('%s.%s', timer.name, 'm15_rate'), timer.fifteenMinuteRate(),
    timestamp, tags);

  this.reportHistogram(timer, timestamp);
};

WavefrontReporter.prototype.reportHistogram = function(histogram, timestamp) {
  var send = this.send.bind(this);
  var tags = tagger(histogram.tags,this.globaltags);
  var isHisto = Object.getPrototypeOf(histogram) === Histogram.prototype;
  if (isHisto) {
    // send count if a histogram, otherwise assume this metric is being
    // printed as part of another (like a timer).
    send(util.format('%s.%s', histogram.name, 'count'), histogram.count, timestamp, tags);
  }

  var percentiles = histogram.percentiles([.50,.75,.95,.98,.99,.999]);
  send(util.format('%s.%s', histogram.name, 'min'), isHisto? histogram.min : histogram.min(), timestamp, tags);
  send(util.format('%s.%s', histogram.name, 'mean'), histogram.mean(), timestamp, tags);
  send(util.format('%s.%s', histogram.name, 'max'), isHisto ? histogram.max: histogram.max(), timestamp, tags);
  send(util.format('%s.%s', histogram.name, 'stddev'), histogram.stdDev(), timestamp, tags);
  send(util.format('%s.%s', histogram.name, 'p50'), percentiles[.50], timestamp, tags);
  send(util.format('%s.%s', histogram.name, 'p75'), percentiles[.75], timestamp, tags);
  send(util.format('%s.%s', histogram.name, 'p95'), percentiles[.95], timestamp, tags);
  send(util.format('%s.%s', histogram.name, 'p98'), percentiles[.98], timestamp, tags);
  send(util.format('%s.%s', histogram.name, 'p99'), percentiles[.99], timestamp, tags);
  send(util.format('%s.%s', histogram.name, 'p999'), percentiles[.999], timestamp, tags);
};

function tagger(tags,globaltags) {
  //return tags in the format 'env="prod" service="qa"'
  //It also merges the global tags with the metric tags
  var str = '';
    for (var p in tags) {
        if (tags.hasOwnProperty(p)) {
            str += p + '=\"' + escapeQuotes(tags[p]) + '\" ';
        }
    }
    for (var p in globaltags) {
        if (globaltags.hasOwnProperty(p)) {
            str += p + '=\"' + escapeQuotes(globaltags[p]) + '\" ';
        }
    }
    //console.log('tag string: %s', str);
    return str;
}

function escapeQuotes(str) {
  return str.replace(/\"/g, "\\\"");
}

function isEmpty(value) {
  return typeof value == 'string' && !value.trim() || typeof value == 'undefined' || value === null;
}

module.exports = WavefrontReporter;
