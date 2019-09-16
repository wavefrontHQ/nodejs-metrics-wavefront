const expect = require('chai').expect;
const helper = require('../lib/helper');

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
  it('String for tags', function () {
    expect( function () {
      helper.encodeKey("http.request", "{\"key1\":\"val1\"}");
    }).throw("Wrong Tags datatype sent to the API. Expected: Object. Actual: String");
  });
});

describe('encodeKey', function () {
  it('Number for tags', function () {
    expect( function () {
      helper.encodeKey("http.request", 42);
    }).throw("Wrong Tags datatype sent to the API. Expected: Object. Actual: Number");
    expect( function () {
      helper.encodeKey("http.request", Math.LN2);
    }).throw("Wrong Tags datatype sent to the API. Expected: Object. Actual: Number");
    expect( function () {
      helper.encodeKey("http.request", Infinity);
    }).throw("Wrong Tags datatype sent to the API. Expected: Object. Actual: Number");
    expect( function () {
      helper.encodeKey("http.request", NaN);
    }).throw("Wrong Tags datatype sent to the API. Expected: Object. Actual: Number");
  });
});

describe('encodeKey', function () {
  it('Boolean for tags', function () {
    expect( function () {
      helper.encodeKey("http.request", true);
    }).throw("Wrong Tags datatype sent to the API. Expected: Object. Actual: Boolean");
  });
});

describe('encodeKey', function () {
  it('Symbol for tags', function () {
    expect( function () {
      helper.encodeKey("http.request", Symbol());
    }).throw("Wrong Tags datatype sent to the API. Expected: Object. Actual: Symbol");
  });
});

describe('encodeKey', function() {
  it('Undefined for tags', function() {
    let key11 = helper.encodeKey('http.request', undefined);
    expect(key11).to.be.equal('http.request');
  });
});

describe('encodeKey', function () {
  it('Array for tags', function () {
    expect( function () {
      helper.encodeKey("http.request", [1,2,3]);
    }).throw("Wrong Tags datatype sent to the API. Expected: Object. Actual: Array");
  });
});

describe('encodeKey', function () {
  it('Regular Expression for tags', function () {
    expect( function () {
      helper.encodeKey("http.request", /regex/);
    }).throw("Wrong Tags datatype sent to the API. Expected: Object. Actual: RegExp");
  });
});
