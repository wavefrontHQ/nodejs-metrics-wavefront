var expect = require('chai').expect;
var direct = require('../lib/index');

var registry = new direct.Registry();
var reporter = new direct.WavefrontDirectReporter(registry, "nodejs.test", "fake.wavefront.com", "fake-token", { 'tag0': "default", 'source': "test-nodejs"});

describe('appendCounter', function() {
  it('appends counter point to array', function() {
    var counter = new direct.Counter();
    registry.addTaggedMetric("num.requests", counter, {'key1': "val1"});
    counter.name = "num.requests";

    points = [];
    reporter.appendCounter(counter, points);

    expect(1).to.be.equal(points.length);
    expect(points[0]).to.be.equal('nodejs.test.num.requests 0 key1="val1" tag0="default" source="test-nodejs" ');
    console.log(points);
  });
});

describe('appendMeter', function() {
  it('appends meter points to array', function() {
    var meter = new direct.Meter();
    registry.addTaggedMetric("meter.requests", meter, {'key1': "val1"});
    meter.name = "meter.requests";
    meter.mark();
    points = [];

    reporter.appendMeter(meter, points);
    expect(5).to.be.equal(points.length);
    console.log(points);
  });
});

describe('appendTimer', function() {
  it('appends timer points to array', function() {
    var timer = new direct.Timer();
    registry.addTaggedMetric("timer.requests", timer, {'key1': "val1"});
    timer.name = "timer.requests";
    points = [];

    reporter.appendTimer(timer, points);
    expect(15).to.be.equal(points.length);
    console.log(points);
  });
});

describe('appendHistogram', function() {
  it('appends histogram points to array', function() {
    var histo = new direct.Histogram();
    registry.addTaggedMetric("histo.requests", histo, {'key1': "val1"});
    histo.name = "histo.requests";
    points = [];

    reporter.appendHistogram(histo, points);
    expect(11).to.be.equal(points.length);
    console.log(points);
  });
});
