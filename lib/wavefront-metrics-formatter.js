'use strict';

const delta = require('./delta');
const Histogram = require('metrics').Histogram;

function counterPoint(counter, metricName, prefix, ts, tags) {
  if (delta.hasDeltaPrefix(metricName)) {
    const value = counter.count;
    const name = delta.resetAndGetName(counter, prefix, metricName, value);
    return pointLine('', name, '', value, ts, tags);
  } else {
    return pointLine(prefix, metricName, '', counter.count, ts, tags);
  }
}

function gaugePoint(gauge, metricName, prefix, ts, tags) {
  return pointLine(prefix, metricName, '', gauge.value(), ts, tags);
}

function meterPoints(meter, metricName, prefix, ts, tags) {
  let points = [];
  points.push(pointLine(prefix, metricName, '.count', meter.count, ts, tags));
  points.push(pointLine(prefix, metricName, '.mean_rate', meter.meanRate(), ts, tags));
  points.push(pointLine(prefix, metricName, '.m1_rate', meter.oneMinuteRate(), ts, tags));
  points.push(pointLine(prefix, metricName, '.m5_rate', meter.fiveMinuteRate(), ts, tags));
  points.push(pointLine(prefix, metricName, '.m15_rate', meter.fifteenMinuteRate(), ts, tags));
  return points;
}

function timerPoints(timer, metricName, prefix, ts, tags) {
  let points = [];
  points.push(pointLine(prefix, metricName, '.count', timer.count(), ts, tags));
  points.push(pointLine(prefix, metricName, '.mean_rate', timer.meanRate(), ts, tags));
  points.push(pointLine(prefix, metricName, '.m1_rate', timer.oneMinuteRate(), ts, tags));
  points.push(pointLine(prefix, metricName, '.m5_rate', timer.fiveMinuteRate(), ts, tags));
  points.push(pointLine(prefix, metricName, '.m15_rate', timer.fifteenMinuteRate(), ts, tags));
  return points.concat(histoPoints(timer, prefix, ts, tags));
}

function histoPoints(histo, metricName, prefix, ts, tags) {
  let points = [];
  const isHisto = histo instanceof Histogram;
  if (isHisto) {
    // send count if a histogram, otherwise assume this metric is being
    // printed as part of another (like a timer).
    points.push(pointLine(prefix, metricName, '.count', histo.count, ts, tags));
  }

  let percentiles = histo.percentiles([.50,.75,.95,.98,.99,.999]);
  points.push(pointLine(prefix, metricName, '.min', isHisto? histo.min : histo.min(), ts, tags));
  points.push(pointLine(prefix, metricName, '.mean', histo.mean(), ts, tags));
  points.push(pointLine(prefix, metricName, '.max', isHisto ? histo.max: histo.max(), ts, tags));
  points.push(pointLine(prefix, metricName, '.stddev', histo.stdDev(), ts, tags));
  points.push(pointLine(prefix, metricName, '.p50', percentiles[.50], ts, tags));
  points.push(pointLine(prefix, metricName, '.p75', percentiles[.75], ts, tags));
  points.push(pointLine(prefix, metricName, '.p95', percentiles[.95], ts, tags));
  points.push(pointLine(prefix, metricName, '.p98', percentiles[.98], ts, tags));
  points.push(pointLine(prefix, metricName, '.p99', percentiles[.99], ts, tags));
  points.push(pointLine(prefix, metricName, '.p999', percentiles[.999], ts, tags));
  return points;
}

function pointLine(prefix, name, suffix, value, ts, tags) {
  tags = tags || '';
  let metric = prefix ? `${prefix}.${name}${suffix}` : `${name}${suffix}`;
  if (ts) {
    return `${metric} ${value} ${ts} ${tags}`;
  } else {
    return `${metric} ${value} ${tags}`;
  }
}

module.exports = {
  counterPoint,
  gaugePoint,
  meterPoints,
  timerPoints,
  histoPoints
};
