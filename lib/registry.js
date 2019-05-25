'use strict';

const Report = require('metrics').Report,
  helper = require('./helper');

class Registry extends Report {

  constructor(trackedMetrics) {
    super(trackedMetrics);
    this.trackedTags = {};
  }

  addTaggedMetric(metricName, metric, tags) {
    const encodedName = helper.encodeKey(metricName, tags);
    this.addMetric(encodedName, metric);
  }

}

module.exports = Registry;
