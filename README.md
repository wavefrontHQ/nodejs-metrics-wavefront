Metrics
=======

[![Build Status](https://travis-ci.org/mikejihbe/metrics.svg?branch=master)](https://travis-ci.org/mikejihbe/metrics)

A node.js port of codahale's metrics library: https://github.com/codahale/metrics

Metrics provides an instrumentation toolkit to measure the behavior of your critical systems while they're running in production.

License
---------
The MIT License (MIT)
Copyright (c) 2012 Mike Ihbe

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


How to Use
----------

**Import Wavefront metrics reporter**

```javascript
metrics = require('wavefrontmetrics');
```

**Setting up a Wavefront Reporter**

A wavefront reporting interface exists for reporting metrics on a recurring interval.  Reporters can be found in [reporting/](reporting).

```javascript
// Report to wavefront proxy server every 1000ms.
var report = new metrics.Report();
report.addMetric('com.co.thingA', counter);
//Wavefront proxy listens on port 2878 by default
var reporter = new WavefrontReporter(report, "host1", config.address, config.port,{ tag0: "default" }); //key-value pair object to be passed as Global tags
reporter.start(1000);
```

**Reporting different metric types**
Examples can be found in [unit/](helper_tags.js).

**Adding a counter**
```javascript
//adding a counter
var counter = new Counter({ 'tag1-counter': "countertag_helper" });
counter.inc(5);
report.addMetric("basicCount", counter);
//example output - basicCount.count 5 1489188569.547 tag1-counter=countertag_helper tag0=default
```
**Adding a meter**
```javascript
//adding a meter
var meter = new Meter({ 'tag1-meter': "metertag_helper" });
meter.mark(10);
report.addMetric("myapp.Meter", meter);
//example output - host1.myapp.Meter.count  10 1489188568.542 tag1-meter=metertag_helper tag0=default  
```
