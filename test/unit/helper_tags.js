var metrics = require('../../'),
  Report = metrics.Report,
  Counter = metrics.Counter,
  Timer = metrics.Timer,
  Meter = metrics.Meter,
  Histogram = metrics.Histogram,
  util = require('util');

function getSampleReport() {
  var counter = new Counter({ 'tag1-counter': "countertag_helper" });
  counter.inc(5);
  var timer = new Timer({ 'tag3-timer': "timertag_helper" });
  for (var i = 1; i <= 100; i++) {
    timer.update(i);
  }
  var meter = new Meter({ 'tag1-meter': "metertag_helper" });
  meter.mark(10);
  var hist = new Histogram('', { 'tag2-histogram': "histogramtag_helper" });
  for (var i = 1; i <= 100; i++) {
    hist.update(i*2);
  }
  var report = new Report();
  report.addMetric("basicCount", counter);
  report.addMetric("myapp.Meter", meter);
  report.addMetric("myapp.Timer", timer);
  report.addMetric("myapp.Histogram", hist);
  return report;
}

exports.getSampleReport = getSampleReport;
