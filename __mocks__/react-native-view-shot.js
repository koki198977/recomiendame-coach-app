// Mock for react-native-view-shot
export const captureRef = jest.fn().mockResolvedValue('file:///tmp/capture.png');

export default {
  captureRef,
};
