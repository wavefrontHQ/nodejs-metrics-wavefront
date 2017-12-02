/*
*  A simple counter object
*/

/* JavaScript uses double-precision FP for all numeric types.
 * Perhaps someday we'll have native 64-bit integers that can safely be
 * transported via JSON without additional code, but not today. */
var MAX_COUNTER_VALUE = Math.pow(2, 32); // 4294967296

var Counter = module.exports = function Counter(tags) {
  this.count = 0;
  this.type = 'counter';
  if (!isEmpty(tags)) {
    this.tags = tags
  }else{
    this.tags = {}
  }
}

Counter.prototype.inc = function(val) {
  if (!val) { val = 1; }
  this.count += val;
  // Wrap counter if necessary.
  if (this.count > MAX_COUNTER_VALUE) {
    this.count -= (MAX_COUNTER_VALUE + 1);
  }
}

Counter.prototype.dec = function(val) {
  if (!val) { val = 1; }
  this.count -= val;
  // Prevent counter from being decremented below zero.
  if (this.count < 0) {
    this.count = 0;
  }
}

Counter.prototype.clear = function() {
  this.count = 0;
}

Counter.prototype.printObj = function() {
  if(this.tags){
    return {type: 'counter', count: this.count, tags: this.tags};
  }else {
    return {type: 'counter', count: this.count};
  }

}

function isEmpty(value) {
  return typeof value == 'string' && !value.trim() || typeof value == 'undefined' || value === null;
}
