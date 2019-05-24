'use strict';
const ScheduledReporter = require('metrics').ScheduledReporter,
  Histogram = require('metrics').Histogram,
  util = require('util'),
  delta = require('./delta'),
  formatter = require('./wavefront-metrics-formatter'),
  helper = require('./helper'),
  Socket = require('net').Socket;

var reconnecting = false;

class WavefrontProxyReporter extends ScheduledReporter {

  /**
   * A custom reporter that sends metrics to a Wavefront proxy using the wavefrontf data format.
   * @param {Report} registry report instance whose metrics to report on.
   * @param {String} prefix A string to prefix on each metric (i.e. app.hostserver)
   * @param {String} host The ip or hostname of the target Wavefront proxy.
   * @param {String} port The Wavefront proxy port, defaults to 2878 if not specified.
   * @param {object} tags The tags to add to the points, defaults to none if not specified.
   * @constructor
   */
  constructor(registry, prefix, host, port, globaltags) {
    super(registry);
    this.prefix = prefix;
    this.host = host;
    this.port = port || 2878;
    this.globaltags = !helper.isEmpty(globaltags) ? globaltags : {};
  }

  start(intervalInMs) {
    const self = this;
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
    this.socket.connect(this.port, this.host, () => {
      self.emit('log', 'verbose', util.format('Successfully connected to wavefront @ %s:%d.', self.host, self.port));
      super.start(intervalInMs);
    });
  }

  stop() {
    super.stop();
    this.socket.end();
  }

  report() {
    // Don't report while reconnecting.
    if (reconnecting) {
      return;
    }
    const metrics = this.getMetrics();
    const self = this;
    const timestamp = (new Date).getTime() / 1000;

    if (metrics.counters.length != 0) {
      metrics.counters.forEach(count => self.reportCounter(count, timestamp));
    }

    if (metrics.gauges.length != 0) {
      metrics.gauges.forEach(value => self.reportGauge(value, timestamp));
    }

    if (metrics.meters.length != 0) {
      metrics.meters.forEach(meter => self.reportMeter(meter, timestamp));
    }

    if (metrics.timers.length != 0) {
      metrics.timers.forEach(timer => {
        // Don't log timer if its recorded no metrics.
        if (timer.min() != null) {
          self.reportTimer(timer, timestamp);
        }
      });
    }

    if (metrics.histograms.length != 0) {
      metrics.histograms.forEach(histogram => {
        // Don't log histogram if its recorded no metrics.
        if (histogram.min != null) {
          self.reportHistogram(histogram, timestamp);
        }
      });
    }
  }

  send(pointLine) {
    if (reconnecting) {
      return;
    }
    this.socket.write(`${pointLine}\n`);
  }

  reportCounter(counter, timestamp) {
    const [metricName, tags] = this.getDecodedKey(counter);
    this.send(formatter.counterPoint(counter, metricName, this.prefix, timestamp, tags));
  }

  reportGauge(gauge, timestamp) {
    const [metricName, tags] = this.getDecodedKey(gauge);
    this.send(formatter.gaugePoint(gauge, metricName, this.prefix, timestamp, tags));
  }

  reportMeter(meter, timestamp) {
    const [metricName, tags] = this.getDecodedKey(meter);
    let points = formatter.meterPoints(meter, metricName, this.prefix, timestamp, tags);
    points.forEach(pointLine => this.send(pointLine));
  }

  reportTimer(timer, timestamp) {
    const [metricName, tags] = this.getDecodedKey(timer);
    let points = formatter.timerPoints(timer, metricName, this.prefix, timestamp, tags);
    points.forEach(pointLine => this.send(pointLine));
  }

  reportHistogram(histogram, timestamp) {
    const [metricName, tags] = this.getDecodedKey(histogram);
    let points = formatter.histoPoints(histogram, metricName, this.prefix, timestamp, tags);
    points.forEach(pointLine => this.send(pointLine));
  }

  getDecodedKey(metric) {
    const [metricName, metricTags] = helper.decodeKey(metric.name)
    const tags = helper.tagger(JSON.parse(metricTags), this.globaltags);
    return [metricName, tags];
  }
}

module.exports = WavefrontProxyReporter;
