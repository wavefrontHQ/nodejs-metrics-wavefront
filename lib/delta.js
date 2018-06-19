'use strict';

var util = require('util');
var deltaPrefix = '\u2206';
var altDeltaPrefix = '\u0394';

module.exports = {
  deltaCounterName : function(metricName) {
    if (module.exports.hasDeltaPrefix(metricName)) {
      return metricName;
    }
    return deltaPrefix + metricName;
  },

  hasDeltaPrefix : function(metricName) {
    if (metricName) {
      return metricName.startsWith(deltaPrefix);
    }
  },

  resetAndGetName : function(counter, prefix, name, value) {
    counter.dec(value);
    return util.format('%s.%s', deltaPrefix + prefix, name.substring(1));
  }
};
