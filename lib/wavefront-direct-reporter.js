'use strict';
var ScheduledReporter = require('metrics').ScheduledReporter,
  Histogram = require('metrics').Histogram,
  util = require('util'),
  https = require('https'),
  zlib = require('zlib'),
  delta = require('./delta');

const agent = new https.Agent({
  keepAlive: true
});

/**
 * A custom reporter that sends metrics to a wavefront server using the wavefrontf data format.
 * @param {Report} registry report instance whose metrics to report on.
 * @param {String} prefix A string to prefix on each metric (i.e. app.hostserver)
 * @param {String} server The wavefront server of the form clusterName.wavefront.com.
 * @param {String} token The Wavefront API token with direct ingestion permission.
 * @param {object} tags The tags to add to wavefront measurements,defaults to none if not specified.
 * @constructor
 */
function WavefrontDirectReporter(registry, prefix, server, token, globaltags, gzip) {
  WavefrontDirectReporter.super_.call(this, registry);
  this.prefix = prefix;
  this.server = server;
  this.token = token;
  this.batchSize = 10000;
  this.gzip = gzip;
  this.globaltags = {};
  if (!isEmpty(globaltags)) {
    this.globaltags = globaltags;
  }else{
    this.globaltags = {};
  }
}

util.inherits(WavefrontDirectReporter, ScheduledReporter);

WavefrontDirectReporter.prototype.report = function() {
  var metrics = this.getMetrics();
  var self = this;
  var points = [];

  if(metrics.counters.length != 0) {
    metrics.counters.forEach(function (count) {
      self.appendCounter.bind(self)(count, points);
    })
  }

  if(metrics.meters.length != 0) {
    metrics.meters.forEach(function (meter) {
      self.appendMeter.bind(self)(meter, points);
    })
  }

  if(metrics.timers.length != 0) {
    metrics.timers.forEach(function (timer) {
      // Don't log timer if its recorded no metrics.
      if(timer.min() != null) {
        self.appendTimer.bind(self)(timer, points);
      }
    })
  }

  if(metrics.histograms.length != 0) {
    metrics.histograms.forEach(function (histogram) {
      // Don't log histogram if its recorded no metrics.
      if(histogram.min != null) {
        self.appendHistogram.bind(self)(histogram, points);
      }
    })
  }

  if (points.length != 0) {
    if (points.length >= self.batchSize) {
      chunks = getChunks(points, self.batchSize);
      for (i = 0; i < chunks.length; i++) {
        self.reportPoints.bind(self)(chunks[i]);
      }
    } else {
      self.reportPoints.bind(self)(points);
    }
  }
};

WavefrontDirectReporter.prototype.reportPoints = function(points) {
  var self = this;
  var pointsStr = points.join('\n');
  var options = {
    hostname: self.server,
    path: '/report?f=graphite_v2',
    method: 'POST',
    agent: agent,
    headers: {
         'Content-Type': 'text/plain',
         'Authorization': 'Bearer ' + self.token
    }
  };

  if (self.gzip) {
    console.log("using gzip");
    const buffer = Buffer.from(pointsStr);
    zlib.gzip(buffer, (err, buffer) => {
      if (!err) {
        options.headers['Content-Encoding'] = 'gzip';
        options.headers['Content-Length'] = buffer.length;
        self.reportToServer.bind(self)(buffer, options);
      } else {
        console.error(err);
      }
    });
  } else {
    console.log("non-gzip");
    options.headers['Content-Length'] = pointsStr.length;
    self.reportToServer.bind(self)(pointsStr, options);
  }
};

WavefrontDirectReporter.prototype.reportToServer = function(data, options) {
  var req = https.request(options, (res) => {
    res.on('data', (d) => {
      process.stdout.write(d);
    });
  });

  req.on('error', (e) => {
    console.error(e);
  });

  req.write(data);
  req.end();
};

WavefrontDirectReporter.prototype.appendCounter = function(counter, points) {
  var tags = tagger(this.registry.getTags(counter.name), this.globaltags);
  if (!tags) { tags = ''; }
  if (delta.hasDeltaPrefix(counter.name)) {
    var value = counter.count;
    var name = delta.resetAndGetName(counter, this.prefix, counter.name, value);
    points.push(util.format('%s %s %s', name, value, tags));
  } else {
    points.push(util.format('%s.%s %s %s', this.prefix, counter.name, counter.count, tags));
  }
};

WavefrontDirectReporter.prototype.appendMeter = function(meter, points) {
  var tags = tagger(this.registry.getTags(meter.name), this.globaltags);
  if (!tags) { tags = ''; }
  points.push(util.format('%s.%s.%s %s %s', this.prefix, meter.name, 'count', meter.count, tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, meter.name, 'mean_rate', meter.meanRate(), tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, meter.name, 'm1_rate', meter.oneMinuteRate(), tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, meter.name, 'm5_rate', meter.fiveMinuteRate(), tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, meter.name, 'm15_rate', meter.fifteenMinuteRate(), tags));
};

WavefrontDirectReporter.prototype.appendTimer = function(timer, points) {
  var tags = tagger(this.registry.getTags(timer.name), this.globaltags);
  if (!tags) { tags = ''; }
  points.push(util.format('%s.%s.%s %s %s', this.prefix, timer.name, 'count', timer.count(), tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, timer.name, 'mean_rate', timer.meanRate(), tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, timer.name, 'm1_rate', timer.oneMinuteRate(), tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, timer.name, 'm5_rate', timer.fiveMinuteRate(), tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, timer.name, 'm15_rate', timer.fifteenMinuteRate(), tags));

  this.appendHistogram(timer, points);
};

WavefrontDirectReporter.prototype.appendHistogram = function(histogram, points) {
  var tags = tagger(this.registry.getTags(histogram.name),this.globaltags);
  var isHisto = Object.getPrototypeOf(histogram) === Histogram.prototype;
  if (isHisto) {
    // send count if a histogram, otherwise assume this metric is being
    // printed as part of another (like a timer).
    points.push(util.format('%s.%s.%s %s %s', this.prefix, histogram.name, 'count', histogram.count, tags));
  }

  var percentiles = histogram.percentiles([.50,.75,.95,.98,.99,.999]);
  points.push(util.format('%s.%s.%s %s %s', this.prefix, histogram.name, 'min', isHisto? histogram.min : histogram.min(), tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, histogram.name, 'mean', histogram.mean(), tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, histogram.name, 'max', isHisto ? histogram.max: histogram.max(), tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, histogram.name, 'stddev', histogram.stdDev(), tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, histogram.name, 'p50', percentiles[.50], tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, histogram.name, 'p75', percentiles[.75], tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, histogram.name, 'p95', percentiles[.95], tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, histogram.name, 'p98', percentiles[.98], tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, histogram.name, 'p99', percentiles[.99], tags));
  points.push(util.format('%s.%s.%s %s %s', this.prefix, histogram.name, 'p999', percentiles[.999], tags));
};

/**
 * Returns an array with arrays of the given size.
 *
 * @param points {Array} Array to split
 * @param chunkSize {Integer} Size of every chunk
 */
function getChunks(points, chunk_size){
    var chunks = [];
    while (points.length) {
        chunks.push(points.splice(0, chunk_size));
    }
    return chunks;
}

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
    return str;
}

function escapeQuotes(str) {
  return str.replace(/\"/g, "\\\"");
}

function isEmpty(value) {
  return typeof value == 'string' && !value.trim() || typeof value == 'undefined' || value === null;
}

module.exports = WavefrontDirectReporter;
