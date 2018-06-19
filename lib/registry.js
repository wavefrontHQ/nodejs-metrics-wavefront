'use strict';
var Report = require('metrics').Report,
  util = require('util');

var Registry = module.exports = function (trackedMetrics) {
  Registry.super_.call(this, trackedMetrics);
  this.trackedTags = {};
}

util.inherits(Registry, Report);

Registry.prototype.addTaggedMetric = function(metricName, metric, tags) {
  this.addMetric(metricName, metric);
  if (!isEmpty(tags)) {
    this.trackedTags[metricName] = tags;
  }
}

Registry.prototype.getTags = function(metricName) {
  if (!this.trackedTags[metricName]) { return; }
  return this.trackedTags[metricName];
}

function isEmpty(value) {
  return typeof value == 'string' && !value.trim() || typeof value == 'undefined' || value === null;
}
