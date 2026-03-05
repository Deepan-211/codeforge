const axios = require('axios');
const debounceMap = new Map();

const HF_ENDPOINT =
  process.env.HF_ENDPOINT || 'https://api-inference.huggingface.co/models/bigcode/starcoder2-3b';
const HF_API_KEY = process.env.HF_API_KEY || '';

async function callHuggingFace(payload) {
  if (!HF_API_KEY) {
    return '// Configure HF_API_KEY to enable AI suggestions\n';
  }
  const resp = await axios.post(HF_ENDPOINT, payload, {
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
    },
    timeout: 15000,
  });
  const data = resp.data;
  if (Array.isArray(data) && data[0] && data[0].generated_text) {
    return data[0].generated_text;
  }
  if (data.generated_text) return data.generated_text;
  return String(data);
}

function getDebouncedPromise(key, fn, waitMs) {
  const existing = debounceMap.get(key);
  if (existing) {
    clearTimeout(existing.timeout);
  }
  let resolveFn;
  let rejectFn;
  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });
  const timeout = setTimeout(async () => {
    try {
      const result = await fn();
      resolveFn(result);
    } catch (err) {
      rejectFn(err);
    } finally {
      debounceMap.delete(key);
    }
  }, waitMs);
  debounceMap.set(key, { timeout, promise });
  return promise;
}

function generateSuggestions({ fileContent, prompt, historySummary }) {
  const key = JSON.stringify({ prompt: prompt || '', len: fileContent.length });
  return getDebouncedPromise(
    key,
    () =>
      callHuggingFace({
        inputs: `${prompt ? `Instruction: ${prompt}\n` : ''}Team context: ${JSON.stringify(
          historySummary
        )}\n\nCurrent file:\n${fileContent}\n\n### Suggest next code:\n`,
      }),
    500
  );
}

module.exports = { generateSuggestions };

