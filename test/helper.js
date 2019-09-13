const expect = require('chai').expect;
const helper = require('../lib/helper');
const metrics = require('../lib/index');

describe('encodeKey', function() {
  it('Validate encode key', function() {
    let key11 = helper.encodeKey('http.request', {"key1":"val1"});
    expect(key11).to.be.equal('http.request-tags=[["key1","val1"]]');

    let key12 = helper.encodeKey('http.request', {"key1":"val2"});
    expect(key12).to.be.equal('http.request-tags=[["key1","val2"]]');

    let key = helper.encodeKey('http.request');
    expect(key).to.be.equal('http.request')
  });
});

describe('decodeKey', function() {
  it('Validate decode key', function() {
    let key11 = 'http.request-tags={"key1":"val1","key2":"val2"}';
    let decodedKey = helper.decodeKey(key11);
    expect(decodedKey[0]).to.be.equal('http.request');
    expect(decodedKey[1]).to.be.equal('{"key1":"val1","key2":"val2"}');

    let key = 'http.request';
    decodedKey = helper.decodeKey(key);
    expect(decodedKey[0]).to.be.equal('http.request');
    expect(decodedKey[1]).to.be.equal(null);
  });
});

describe('encodeKey', function () {
  it('wrong tags API', function () {
    const registry = new metrics.Registry();
    let c = new metrics.Counter();
    expect( function () {
      registry.addTaggedMetric("request.counter1", c, "{\"key1\":\"val1\"}");
    }).throw("Wrong Tags Object Sent To The API");
  });
});
