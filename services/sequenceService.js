const Counter = require('../models/Counter');

async function nextSequence(key, { prefix = '', pad = 6 } = {}) {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `${prefix}${String(counter.value).padStart(pad, '0')}`;
}

module.exports = { nextSequence };
