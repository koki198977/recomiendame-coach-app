// Mock for expo winter runtime modules
module.exports = {
  ImportMetaRegistry: { url: null },
  TextDecoder: global.TextDecoder,
  TextDecoderStream: undefined,
  TextEncoderStream: undefined,
  URL: global.URL,
  URLSearchParams: global.URLSearchParams,
  installFormDataPatch: () => {},
  installGlobal: () => {},
};
